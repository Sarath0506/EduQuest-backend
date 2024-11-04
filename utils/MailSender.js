const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        // Create a transporter object using SMTP transport
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 587, // Default port for SMTP
            secure: false, // Use TLS if true, false for non-TLS
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        // Send mail
        let info = await transporter.sendMail({
            from: 'EduQuest <no-reply@eduquest.com>', // Use a more descriptive "from" address
            to: email,
            subject: title,
            html: body
        });

        // Log and return result
        console.log('Email sent:', info);
        return info;
    } catch (e) {
        // Log and rethrow error
        console.error('Error sending email:', e);
        throw new Error('Email sending failed');
    }
};

module.exports = mailSender;
