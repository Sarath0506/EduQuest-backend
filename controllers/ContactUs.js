const mailSender = require('../utils/MailSender');
require('dotenv').config();

exports.contactUs = async (req, res) => {
    const { firstname, lastname, email, countrycode, phoneNo, message } = req.body;

    if (!firstname || !email || !message) {
        return res.status(400).json({
            success: false,
            message: 'Please provide your name, email, and message.',
        });
    }

    try {
        const emailBody = `
            <p><strong>Name:</strong> ${firstname} ${lastname}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${countrycode} ${phoneNo}</p>
            <p><strong>Message:</strong><br/>${message}</p>
        `;

        // Send an email to your support address
        await mailSender(process.env.SUPPORT_EMAIL, 'New Contact Form Submission', emailBody);

        res.status(200).json({
            success: true,
            message: 'Thank you for contacting us. We will get back to you shortly.',
        });
    } catch (error) {
        console.error('Error processing contact form submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing your request. Please try again later.',
        });
    }
};
