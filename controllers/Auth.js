const User = require('../models/User');
const OTP = require('../models/OTP');
const otpGenerator = require('otp-generator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const Profile = require('../models/Profile');

// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user already exists
        const checkUserPresent = await User.findOne({ email });
        if (checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Generate unique OTP
        let otp;
        let result;
        do {
            otp = otpGenerator.generate(6, {
                digits: true,
                alphabets: false,  
                upperCase: false,
                specialChars: false
            });            
            result = await OTP.findOne({ otp });
        } while (result);

        console.log('Generated OTP:', otp);

        // Save OTP to the database
        const otpEntry = new OTP({ otp, email });
        await otpEntry.save();

        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });

    } catch (e) {
        console.error('Error sending OTP:', e);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Signup
exports.signUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, accountType, contactNumber, otp } = req.body;

        // Validate input
        if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Check if user already exists
        const alreadyExist = await User.findOne({ email });
        if (alreadyExist) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Verify OTP
        const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
        console.log('Recent OTP:', recentOtp);
        console.log('OTP from request body:', otp);

        if (!recentOtp) {
            return res.status(400).json({
                success: false,
                message: 'No OTP found for this email'
            });
        }


        if (!recentOtp || otp !== recentOtp.otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed Password:', hashedPassword);

        // Create profile
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null,
        });

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName}%20${lastName}`
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user
        });

    } catch (e) {
        console.error('Error during signup:', e);
        return res.status(500).json({
            success: false,
            message: 'User registration failed'
        });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email }).populate("additionalDetails").exec();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User does not exist'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // Generate JWT token
        const payload = {
            email: user.email,
            id: user._id,
            accountType: user.accountType
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
        console.log('Generated JWT Token:', token);

        user.token = token;
        user.password = undefined; // Do not return password

        // Set cookie and respond
        const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };
        res.cookie('token', token, options).status(200).json({
            success: true,
            token,
            user,
            message: 'Logged in successfully'
        });

    } catch (e) {
        console.error('Error during login:', e);
        return res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};
