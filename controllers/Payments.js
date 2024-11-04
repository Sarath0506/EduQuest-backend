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
    

    // Validate input
    if (!Array.isArray(courses) || courses.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Courses must be a non-empty array.'
        });
    }

    let totalAmount = 0;
    let uId;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID.'
        });
    } else {
        uId = new mongoose.Types.ObjectId(userId);
    }

    // Validate each course and calculate total amount
    try {
        const coursesData = await Course.find({ _id: { $in: courses } });

        if (coursesData.length !== courses.length) {
            return res.status(404).json({
                success: false,
                message: 'One or more courses not found.'
            });
        }

        for (const course of coursesData) {
            // Check if user is already enrolled using .some() and .equals()
            if (course.studentsEnrolled.some(enrolledId => enrolledId.equals(uId))) {
                return res.status(400).json({
                    success: false,
                    message: `Student already enrolled in course: ${course.courseName}`
                });
            }

            // Validate course price
            if (typeof course.price !== 'number' || course.price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for course: ${course.courseName}`
                });
            }

            totalAmount += course.price;
        }

        console.log(`Total Amount Calculated: ${totalAmount}`);
    } catch (error) {
        console.error('Error fetching courses:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching courses.'
        });
    }

    // Ensure totalAmount is positive
    if (totalAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Total amount must be greater than zero.'
        });
    }

    // Generate a unique receipt using UUID
    const receiptId = uuidv4();

    const options = {
        amount: Math.round(totalAmount * 100), // Amount in paise as integer
        currency: "INR",
        receipt: receiptId, // Unique receipt ID
    };

    console.log(`Order Options: ${JSON.stringify(options)}`);

    try {
        const paymentResponse = await instance.orders.create(options);
        console.log("Payment Response:", paymentResponse);

        return res.status(200).json({
            success: true,
            order: paymentResponse
        });
    } catch (error) {
        console.error('Error creating payment order:', error);

        // Enhanced Error Logging
        if (error.response) {
            // The request was made, and the server responded with a status code outside the 2xx range
            console.error('Razorpay Response Error:', error.response.data);
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.description || 'Could not initiate payment order.'
            });
        } else if (error.request) {
            // The request was made, but no response was received
            console.error('No response received from Razorpay:', error.request);
            return res.status(502).json({
                success: false,
                message: 'Bad Gateway: No response from payment gateway.'
            });
        } else {
            // Something happened in setting up the request
            console.error('Error setting up Razorpay request:', error.message);
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