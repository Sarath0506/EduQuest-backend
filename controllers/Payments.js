const { instance } = require('../config/razorpay');
const Course = require('../models/Course');
const User = require('../models/User');
const mailSender = require('../utils/MailSender');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid'); // Import UUID
const CourseProgress = require('../models/CourseProgress');

// Capture Payment
exports.capturePayment = async (req, res) => {
    const { courses } = req.body;
    const userId = req.user.id;

    console.log("Received request to capture payment.");
    console.log("Courses received:", courses);
    console.log("User ID:", userId);

    if (!Array.isArray(courses) || courses.length === 0) {
        console.warn("Validation failed: courses is not a valid non-empty array.");
        return res.status(400).json({
            success: false,
            message: 'Courses must be a non-empty array.'
        });
    }

    let totalAmount = 0;
    let uId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.warn("Validation failed: Invalid user ID format.");
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID.'
        });
    } else {
        uId = new mongoose.Types.ObjectId(userId);
    }

    try {
        const coursesData = await Course.find({ _id: { $in: courses } });
        console.log("Fetched courses from DB:", coursesData.map(c => ({
            id: c._id,
            name: c.courseName,
            price: c.price,
            studentsEnrolled: c.studentsEnrolled.length
        })));

        if (coursesData.length !== courses.length) {
            console.warn("Mismatch in number of courses found vs requested.");
            return res.status(404).json({
                success: false,
                message: 'One or more courses not found.'
            });
        }

        for (const course of coursesData) {
            console.log(`Checking course: ${course.courseName} (${course._id})`);

            if (course.studentsEnrolled.some(enrolledId => enrolledId.equals(uId))) {
                console.warn(`User is already enrolled in course: ${course.courseName}`);
                return res.status(400).json({
                    success: false,
                    message: `Student already enrolled in course: ${course.courseName}`
                });
            }

            if (typeof course.price !== 'number' || course.price <= 0) {
                console.error("Invalid course price:", {
                    courseId: course._id,
                    courseName: course.courseName,
                    price: course.price
                });
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for course: ${course.courseName || course._id}`
                });
            }

            totalAmount += course.price;
        }

        console.log(`Total Amount Calculated: ₹${totalAmount}`);
    } catch (error) {
        console.error('Error fetching courses or validating data:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching courses.'
        });
    }

    if (totalAmount <= 0) {
        console.warn("Total calculated amount is zero or negative.");
        return res.status(400).json({
            success: false,
            message: 'Total amount must be greater than zero.'
        });
    }

    const receiptId = uuidv4();
    console.log("Creating Razorpay order with receipt ID:", receiptId);

    const options = {
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: receiptId,
    };

    try {
        const paymentResponse = await instance.orders.create(options);
        console.log("Razorpay order created successfully:", paymentResponse);

        return res.status(200).json({
            success: true,
            order: paymentResponse
        });
    } catch (error) {
        console.error('Error creating Razorpay payment order:', error);

        if (error.response) {
            console.error('Razorpay Response Error:', error.response.data);
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.description || 'Could not initiate payment order.'
            });
        } else if (error.request) {
            console.error('No response received from Razorpay:', error.request);
            return res.status(502).json({
                success: false,
                message: 'Bad Gateway: No response from payment gateway.'
            });
        } else {
            console.error('Unknown error setting up Razorpay request:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Could not initiate payment order.'
            });
        }
    }
};


// Verify Signature
exports.verifyPayment = async (req, res) => {

    const razorpay_order_id = req.body?.razorpay_order_id;
    const razorpay_payment_id = req.body?.razorpay_payment_id;
    const razorpay_signature = req.body?.razorpay_signature;
    const courses = req.body?.courses;
    const userId = req.user.id;

    if(!razorpay_order_id ||!razorpay_payment_id || !razorpay_signature ||!courses ||! userId){
        return res.status(400).json({success:false,message:"Missing required payment parameters."});
    }

    let body  = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
    .createHmac("sha256",process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

    if(expectedSignature === razorpay_signature){
        console.log("expectedSignature......",expectedSignature)
        console.log("razorpay_signature......",razorpay_signature)
        try {
            await enrollStudents(courses,userId);
            return res.status(200).json({
                success: true,
                message: 'Student verified and course added successfully'
            });
        } catch (error) {
            console.error('Error during enrollment:', error);
            return res.status(500).json({
                success: false,
                message: 'Payment verified but failed to enroll courses.'
            });
        }

    }
    return res.status(400).json({
        success: false,
        message: 'Payment Failed'
    });


}

// Enroll Students
const enrollStudents = async(courses,userId)=>{
    if(!courses || !userId){
        return res.status(400).json({success:false,message:"Please provide data for courses or userId"});
    }

    for(const courseId of courses){

        try{

            const enrollCourse = await Course.findOneAndUpdate(
                {_id:courseId},
                {
                    $push:{studentsEnrolled:userId}
                },
                {new:true}
            ) 
            if(!enrollCourse){
                return res.status(500).json({success:false,message:"Course not found"});
            }

            const courseProgress = await CourseProgress.create({
                courseId,
                userId,
                completedVideos:[],
            })

            const enrollStudent = await User.findByIdAndUpdate(userId,
                {
                    $push:{
                        courses:courseId,
                        courseProgress :courseProgress._id,
                    },
                },
                {new:true}
            );

            const enrolledStudent = await User.findById(userId);
            const emailResponse = await mailSender(
                enrolledStudent.email,
                `Successfully Enrolled into ${enrollCourse.courseName}`,
                "Congratulations, you are now enrolled in the course!"
            )
            console.log('Email Response:', emailResponse);

        }
        catch (error) {
            console.error('Error verifying signature and updating records:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify payment and update records'
            });
        }
    }
}

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async(req,res)=>{
    const {orderId,paymentId,amount} = req.body;
    const userId = req.user.id;

    if(!userId || !paymentId || !orderId || !amount){
        return res.status(400).json({success:false,message:"Please fill all details"})
    }

    try{
        const enrolledStudent  = await User.findById(userId);
        if(!enrolledStudent){
            return res.status(404).json({success:false,message:"User not found"});
        }
        await mailSender(
            enrolledStudent.email,
            "Payment Received",
            `Dear ${enrolledStudent.firstName} ${enrolledStudent.lastName},\n\nThe amount of Rs.${amount/100} has been received successfully.\n\nThank you for your purchase!\n\nBest regards,\nEduQuest Team`
        )
        res.status(200).json({success:true,message:"Payment success email sent."});
    }
    catch(error){
        console.log("Error in sending mail",error);
        return res.status(500).json({success:false,message:"Could not send email"})
    }
}
