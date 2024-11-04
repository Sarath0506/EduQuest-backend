const express = require('express');
const router = express.Router();

const { auth, login, signUp, sendOTP } = require('../controllers/Auth');
const { resetPasswordToken, resetPassword } = require('../controllers/ResetPassword');

// Public routes
router.post('/login', login);
router.post('/signUp', signUp);
router.post('/sendOTP', sendOTP);

// Password reset routes
router.post('/reset-password-token', resetPasswordToken);
router.post('/reset-password', resetPassword);

module.exports = router;
