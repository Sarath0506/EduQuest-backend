const Course = require('../models/Course');
const RatingAndReview = require('../models/RatingAndReview');
const mongoose = require('mongoose');

// Create Rating and Review
exports.createRating = async (req, res) => {
    try {
        const userId = req.user.id;
        const { review, courseId, rating } = req.body;

        // Check if the user is enrolled in the course
        const courseDetails = await Course.findOne({
            _id: courseId,
            studentsEnrolled: { $elemMatch: { $eq: userId } }
        });

        if (!courseDetails) {
            return res.status(403).json({
                success: false,
                message: 'Student is not enrolled in the course',
            });
        }

        // Check if the user has already reviewed this course
        const alreadyReviewed = await RatingAndReview.findOne({
            user: userId,
            course: courseId
        });

        if (alreadyReviewed) {
            return res.status(403).json({
                success: false,
                message: 'User has already reviewed this course',
            });
        }

        // Create new rating and review
        const ratingReview = await RatingAndReview.create({
            rating,
            review,
            course: courseId,
            user: userId
        });

        // Update the course with the new review
        const updateCourseRatingReview = await Course.findByIdAndUpdate(
            courseId,
            { $push: { ratingAndReview: ratingReview._id } },
            { new: true }
        );

        console.log('Updated Course:', updateCourseRatingReview);

        return res.status(201).json({
            success: true,
            message: 'Rating and review added successfully',
            data:ratingReview
        });

    } catch (error) {
        console.error('Error creating rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create rating and review',
            error: error.message
        });
    }
};

// Get Average Rating
exports.getAverageRating = async (req, res) => {
    try {
        const { courseId } = req.body;

        // Aggregate ratings to get the average
        const result = await RatingAndReview.aggregate([
            {
                $match: { course: new mongoose.Types.ObjectId(courseId) }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);

        const averageRating = result.length > 0 ? result[0].averageRating : 0;

        return res.status(200).json({
            success: true,
            averageRating,
            message: 'Average rating fetched successfully'
        });

    } catch (error) {
        console.error('Error fetching average rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch average rating',
            error: error.message
        });
    }
};

// Get All Ratings
exports.getAllRatings = async (req, res) => {
    try {
        const allReviews = await RatingAndReview.find({})
            .sort({ rating: 'desc' })
            .populate({
                path: 'user',
                select: 'firstName lastName email image'
            })
            .populate({
                path: 'course',
                select: 'courseName'
            })
            .exec();

        return res.status(200).json({
            success: true,
            message: 'All reviews fetched successfully',
            data: allReviews
        });

    } catch (error) {
        console.error('Error fetching all reviews:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};
