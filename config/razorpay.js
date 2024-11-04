const Razorpay = require('razorpay');
require('dotenv').config();

let razorpayInstance;

try {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY,
        key_secret: process.env.RAZORPAY_SECRET,
    });

    console.log('Razorpay instance created successfully');
} catch (error) {
    console.error('Error creating Razorpay instance:', error);
}

exports.instance = razorpayInstance;
