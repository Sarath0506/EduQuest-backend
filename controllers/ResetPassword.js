const User = require('../models/User');
const mailSender = require('../utils/MailSender');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.resetPasswordToken = async (req, res) => {
    try {

        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email is not registered'
            });
        }

        const resetToken = crypto.randomUUID();
        const resetPasswordExpiresAt = Date.now() + 5 * 60 * 1000; 

        const updatedUser = await User.findOneAndUpdate(
            { email },
            { resetToken, resetPasswordExpiresAt },
            { new: true }
        );

        console.log('Updated User:', updatedUser);

        const url = `http://localhost:3000/update-password/${resetToken}`;
        await mailSender(
            email,
            'Password Reset Link',
            `Click this link to reset your password: ${url}`
        );

        return res.status(200).json({
            success: true,
            message: 'Password reset email sent successfully'
        });
    } catch (e) {
        console.error('Error sending password reset email:', e);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while sending the reset link'
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword, resetToken } = req.body;
        console.log('Received Reset Token:', resetToken);

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Find user by reset token
        const user = await User.findOne({ resetToken });
        console.log('User Found:', user);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check if the token has expired
        if (user.resetPasswordExpiresAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Password reset link has expired'
            });
        }

        // Hash the new password and update user record
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate(
            { resetToken },
            { password: hashedPassword, resetToken: undefined, resetPasswordExpiresAt: undefined },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (e) {
        console.error('Error resetting password:', e);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while resetting the password'
        });
    }
};
