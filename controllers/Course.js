const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const {uploadImageToCloudinary} = require('../utils/imageUploader');
const Section = require('../models/Section');
const SubSection = require('../models/SubSection');
const CourseProgress = require('../models/CourseProgress');
require('dotenv').config();

function getRandomDurationInSeconds() {
    return Math.floor(Math.random() * (600 - 60 + 1)) + 60; // Random between 60 and 600 seconds
}

// Convert seconds to `hh:mm:ss` format manually
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Create Course
exports.createCourse = async (req, res) => {
    try {
        const { courseName, courseDescription, whatWillYouLearn, price, category, tag, instructions } = req.body;
        const thumbnail = req.files.thumbnail;

        console.log('Request Payload:', {
            courseName,
            courseDescription,
            whatWillYouLearn,
            price,
            category,
            tag,
            instructions,
            thumbnail
        });
        

        // Trim whitespace
        const trimmedCourseName = courseName.trim();
        const trimmedCourseDescription = courseDescription.trim();

        // Validate input types and required fields
        if (
            !trimmedCourseName || 
            !trimmedCourseDescription || 
            !whatWillYouLearn || 
            !price || 
            !category || 
            !tag || 
            !instructions || 
            !thumbnail
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required and price must be a number'
            });
        }

        // Parse tags and instructions with error handling
        let tags, parsedInstructions;
        try {
            tags = JSON.parse(tag);
        } catch (err) {
            return res.status(400).json({ success: false, message: 'Invalid tags format' });
        }

        try {
            parsedInstructions = JSON.parse(instructions);
        } catch (err) {
            return res.status(400).json({ success: false, message: 'Invalid instructions format' });
        }

        // Get instructor details
        const userId = req.user.id;
        const instructorDetails = await User.findById(userId);
        if (!instructorDetails) {
            return res.status(404).json({ success: false, message: 'Instructor not found' });
        }

        // Get category details
        const categoryDetails = await Category.findById(category);
        if (!categoryDetails) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Image validation (optional)
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        // Create new course
        const newCourse = await Course.create({
            courseName: trimmedCourseName,
            courseDescription: trimmedCourseDescription,
            instructor: instructorDetails._id,
            whatWillYouLearn,
            price,
            tag: tags,
            instructions: parsedInstructions,
            category: categoryDetails._id,
            thumbnail: thumbnailImage.secure_url
        });

        // Update instructor and category
        await Promise.all([
            User.findByIdAndUpdate(
                { _id: instructorDetails._id },
                { $push: { courses: newCourse._id } },
                { new: true }
            ),
            Category.findByIdAndUpdate(
                { _id: category },
                { $push: { courses: newCourse._id } },
                { new: true }
            )
        ]);

        return res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: newCourse
        });

    } catch (error) {
        console.error('Error creating course:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create course',
            error: error.message
        });
    }
};

// Edit Course
exports.editCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const updates = req.body;
        
        // Validate input
        if (!courseId) {
            return res.status(400).json({
                success: false, 
                message: 'Course ID is required'
            });
        }

        // Get course details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if the current user is the instructor
        if (course.instructor.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to edit this course'
            });
        }


        // If Thumbnail Image is found , update it

        if(req.files) {

            console.log("thumbnail update")

            const thumbnail = req.files.thumbnail
            const thumbnailImage = await uploadImageToCloudinary( thumbnail,process.env.FOLDER_NAME)
            course.thumbnail = thumbnailImage.secure_url

        }

        // Update only the fields that are present in the request body

        for (const key in updates) {
            if (updates.hasOwnProperty(key)) {
                if (key === "tag" || key === "instructions") {
                    course[key] = JSON.parse(updates[key]);
                } else {
                    course[key] = updates[key];
                }
            }
        }
        

        await course.save();

        const updatedCourse = await Course.findOne({_id : courseId})           
        .populate({           
            path: "instructor",            
            populate:{           
                path: "additionalDetails"
            },
        })
        .populate("category")          
        // .populate("ratingAndReviews")          
        .populate({         
            path : "courseContent",
            populate: {          
                path: "subSection",
            },
        }) 
        .exec()

        return res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: updatedCourse
        });

    } catch (e) {
        console.error('Error updating course:', e);
        return res.status(500).json({
            success: false,
            message: 'Failed to update course',
            error: e.message
        });
    }
};

// Show All Courses
exports.showAllCourses = async (req, res) => {
    try {
        const allCourses = await Course.find({status:"published"}, {
            courseName: true,
            price: true,
            thumbnail: true,
            instructor: true,
            ratingAndReview: true,
            studentsEnrolled: true
        }).populate('instructor')
        .exec();
            
        return res.status(200).json({
            success: true,
            message: 'Fetched all courses successfully',
            data: allCourses
        });

    } catch (e) {
        console.error('Error fetching all courses:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot fetch course data',
            error: e.message
        });
    }
};

// Get Course Details
exports.getFullCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.params; 
        const userId = req.user.id;
        

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }

        const courseDetails = await Course.findById(courseId)
            .populate({
                path: 'instructor',
                populate: {
                    path: 'additionalDetails'
                }
            })
            .populate({
                path: 'courseContent',
                populate: {
                    path: 'subSection',
                    select:"-videourl"
                }
            })
            .populate('category')
            .populate('ratingAndReview')
            .exec();

            let courseProgressCount = await CourseProgress.findOne({
                courseId:courseId,
                userId:userId
            })
            console.log("courseProgressCount........",courseProgressCount)

        if (!courseDetails) {
            return res.status(404).json({
                success: false,
                message: `Course not found ${courseId} `
            });
        }

        let totalDurationInSeconds = 0;
        for (const content of courseDetails.courseContent) {
            for (const subSection of content.subSection) {
                let subSectionDurationInSeconds;

                // If no time duration is found, generate a random one and save it
                if (!subSection.timeDuration) {
                    subSectionDurationInSeconds = getRandomDurationInSeconds();
                    const formattedDuration = formatDuration(subSectionDurationInSeconds);

                    // Append and save the new time duration to the sub-section
                    await SubSection.findByIdAndUpdate(
                        subSection._id,
                        { timeDuration: formattedDuration },
                        { new: true }
                    );

                    console.log(`Assigned and saved random duration to sub-section ${subSection._id}: ${formattedDuration}`);
                } else {
                    // Convert existing `hh:mm:ss` format to seconds
                    const [hours, minutes, seconds] = subSection.timeDuration.split(':').map(Number);
                    subSectionDurationInSeconds = (hours * 3600) + (minutes * 60) + seconds;
                }

                totalDurationInSeconds += subSectionDurationInSeconds;
            }
        }

        const totalDuration = formatDuration(totalDurationInSeconds);

        return res.status(200).json({
            success: true,
            message: 'Fetched course details successfully',
            data: {
                courseDetails,
                totalDuration,
                completedVideos: courseProgressCount?.completedVideos
                ? courseProgressCount?.completedVideos
                : [],
            }   
        });

    } catch (e) {
        console.error('Error fetching course details:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot fetch course details',
            error: e.message
        });
    }
};

// Get Instructor's Courses
exports.getInstructorCourse = async (req, res) => {
    try {
        const instructorId = req.user.id; 

        const instructorCourses = await Course.find({
            instructor: instructorId,
        }).sort({createdAt : -1});
        
        return res.status(200).json({
            success: true,
            message: 'Fetched instructor courses successfully',
            data: instructorCourses
        });

    } catch (e) {
        console.error('Error fetching instructor courses:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot fetch instructor courses',
            error: e.message
        });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // const studentEnrolled = course.studentsEnrolled
        // for(const studentId of studentEnrolled){
        //     await User.findByIdAndUpdate(studentId,{
        //         $pull :{courses:courseId}
        //     })
        // }

        if (course.instructor.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this course'
            });
        }

        const courseSections = course.courseContent;
        for( const sectionId  of courseSections){
            const section = await Section.findById(sectionId);
            const subSections = section.subSection;
            for(const subSectionId of subSections){
                await SubSection.findByIdAndDelete(subSectionId);
            }
            await Section.findByIdAndDelete(sectionId)
        }

        await Course.findByIdAndDelete(courseId);

        await User.findByIdAndUpdate(
            req.user.id,
            {
                $pull: { courses: courseId }
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });

    } catch (e) {
        console.error('Error deleting course:', e);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete course',
            error: e.message
        });
    }
};

