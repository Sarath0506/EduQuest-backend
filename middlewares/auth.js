const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/User');

// Standardized error response
const sendErrorResponse = (res, status, message) => {
    return res.status(status).json({
        success: false,
        message
    });
};

// Authentication middleware
exports.auth = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return sendErrorResponse(res, 401, 'Token is missing');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Attach decoded JWT data to request object

            // Optional: Check if user exists in the database
            // const user = await User.findById(decoded.id);
            // if (!user) {
            //     return sendErrorResponse(res, 401, 'User does not exist');
            // }

            next(); // Proceed to the next middleware
        } catch (e) {
            return sendErrorResponse(res, 401, 'Token is invalid or expired');
        }
    } catch (e) {
        console.error('Error validating token:', e);
        return sendErrorResponse(res, 500, 'Something went wrong while validating the token');
    }
};

// Role-based middleware
const checkRole = (role) => {
    return (req, res, next) => {
        try {
            if (!req.user.accountType || req.user.accountType !== role) {
                return sendErrorResponse(res, 401, `You are not an ${role}`);
            }
            next();
        } catch (e) {
            console.error(`Error checking role ${role}:`, e);
            return sendErrorResponse(res, 500, 'User role is not verified');
        }
    };
};

exports.isStudent = checkRole('Student');
exports.isInstructor = checkRole('Instructor');
exports.isAdmin = checkRole('Admin');
