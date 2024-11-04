const express = require('express');
const app = express();

const userRoutes = require('./routes/User');
const courseRoutes = require('./routes/Course');
const profileRoutes = require('./routes/Profile');
const paymentRoutes = require('./routes/Payment');
const contactRoutes = require('./routes/Contact')

const database = require('./config/database');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { cloudinaryConnect } = require('./config/cloudinary');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

// Connect to the database
database.connect();

// Middleware setup
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
    })
);

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: '/tmp/',
    })
);

// Connect to Cloudinary
cloudinaryConnect();

// Route handlers
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/course', courseRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/reach',contactRoutes);

// Root route
app.get('/', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Server is running',
    });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong',
        error: err.message,
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`App is running on port ${PORT}`);
});
