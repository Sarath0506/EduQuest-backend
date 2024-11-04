const mongoose = require('mongoose');
const mailSender = require('../utils/MailSender');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        // Add validation for email format if needed
    },
    otp: {
        type: String,
        required: true
        // Add validation for OTP length if needed
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '5m' // Use '5m' for 5 minutes
    }
});

async function sendVerificationEmail(email, otp) {
    try {
        const mailResponse = await mailSender(email, "Verification of email from EduQuest", otp);
        console.log("Email sent successfully", mailResponse);
    } catch (e) {
        console.log('Issue with sending email', e);
        throw e;
    }
}

otpSchema.pre("save", async function(next) {
    try {
        await sendVerificationEmail(this.email, this.otp);
    } catch (e) {
        return next(e); // Pass error to next middleware
    }
    next();
});

module.exports = mongoose.model('OTP', otpSchema);
