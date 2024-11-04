const User = require('../models/User');
const Profile = require('../models/Profile'); 
const { uploadImageToCloudinary } = require('../utils/imageUploader');
const { populate } = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');

const convertSecondsToDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const convertToSeconds = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
};


// Update Profile
exports.updateProfile = async (req, res) => {
    try {
       
        const { 
            firstName, 
            lastName, 
            email, 
            gender="", 
            dateOfBirth = "", 
            about = "", 
            contactNumber = "" 
        } = req.body;

        const userId = req.user.id;

        // Fetch the user and their profile
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId);
        if (!profileDetails) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
            });
        }

        // Update user details
        if (firstName) userDetails.firstName = firstName;
        if (lastName) userDetails.lastName = lastName;
        if (email) userDetails.email = email;
        await userDetails.save({ validateModifiedOnly: true });

        // Update profile details
        profileDetails.gender = gender;
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.contactNumber = contactNumber;
        await profileDetails.save();

        const updatedUserDetails = await User.findById(userId).populate('additionalDetails');

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            updatedUserDetails,
            profileDetails
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Cannot update profile data',
            error: error.message,
        });
    }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch the user and their profile
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const profileId = userDetails.additionalDetails;

        // Unenroll user from all courses
        // Assuming you have a field in your Course model that tracks enrolled students
        await User.findByIdAndUpdate(userId);

        // Delete profile and user
        await Profile.findByIdAndDelete(profileId);
        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        return res.status(500).json({
            success: false,
            message: 'Cannot delete account right now',
            error: error.message
        });
    }
};

exports.updateDisplayPicture  =async(req,res)=>{
    try{
        const displayPicture = req.files.displayPicture
        const userId = req.user.id
        const image = await uploadImageToCloudinary (
            displayPicture,
            process.env.FOLDER_NAME,
            1000,
            1000
        )
        console.log(image);
        const updatedProfile = await User.findByIdAndUpdate(
            {_id:userId},
            {image:image.secure_url},
            {new:true}
        ).populate("additionalDetails").exec();
        res.send({
            success:true,
            message:"Image updated successfully",
            data:updatedProfile
        })

    }
    catch(error){
        console.error('Unable to ubdate right now:', error);
        return res.status(500).json({
            success: false,
            message: 'Cannot update right now',
            error: error.message
        });

    }
}

exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log("Fetching enrolled courses for user ID:", userId);

        const userDetails = await User.findOne({ _id: userId })
            .populate({
                path: 'courses',
                populate: {
                    path: 'courseContent',
                    populate: { path: 'subSection' },
                },
            })
            .exec();

        if (!userDetails) {
            return res.status(401).json({ success: false, message: "Couldn't find user details" });
        }

        const enrolledCourses = await Promise.all(
            userDetails.courses.map(async (course) => {
                let totalDurationInSeconds = 0;
                let totalSubSectionCount = 0;

                // Calculate total duration and number of sub-sections
                course.courseContent.forEach((section) => {
                    section.subSection.forEach((subSection) => {
                        const durationInSeconds = convertToSeconds(subSection.timeDuration);
                        totalDurationInSeconds += durationInSeconds;
                        totalSubSectionCount += 1;
                    });
                });

                console.log(`Course: ${course._id}, Sub-sections: ${totalSubSectionCount}, Total Duration: ${totalDurationInSeconds} seconds`);

                // Fetch course progress for this user
                const courseProgress = await CourseProgress.findOne({
                    courseId: course._id,
                    userId: userId,
                });

                const completedVideosCount = courseProgress?.completedVideos.length || 0;
                console.log(`Completed Videos for Course ${course._id}:`, completedVideosCount);

                // Calculate progress percentage
                const progressPercentage = totalSubSectionCount === 0
                    ? 0
                    : Math.round((completedVideosCount / totalSubSectionCount) * 100 * 100) / 100;

                console.log(`Progress Percentage for Course ${course._id}:`, progressPercentage);

                return {
                    ...course.toObject(),
                    progressPercentage,
                    totalDuration: convertSecondsToDuration(totalDurationInSeconds),
                };
            })
        );

        console.log("Final Enrolled Courses Data:", enrolledCourses);

        return res.status(200).json({ success: true, data: enrolledCourses });

    } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        return res.status(500).json({
            success: false,
            message: 'Cannot find enrolled courses',
            error: error.message,
        });
    }
};

exports.instructorDashboard = async (req, res) => {
    try {
       
        const courseDetails = await Course.find({instructor: req.user.id});
        const courseData = courseDetails.map((course)=>{
            const totalStudentsEnrolled = course.studentsEnrolled.length
            const totalAmountGenerated = totalStudentsEnrolled*course.price

            const courseDataWithStats = {
                _id:course._id,
                courseName : course.courseName,
                courseDescription: course.courseDescription,
                totalStudentsEnrolled,
                totalAmountGenerated,
            }
            return courseDataWithStats
        })

        return res.status(200).json({ success: true, courses: courseData });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};



