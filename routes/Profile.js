const express = require('express');
const router = express.Router();
const {auth , isInstructor } = require('../middlewares/auth');
const { updateProfile, deleteAccount,updateDisplayPicture,getEnrolledCourses,instructorDashboard } = require('../controllers/Profile');


// Apply authentication middleware to routes that need it
router.get('/getEnrolledCourses', auth, getEnrolledCourses);
router.put('/updateProfile', auth, updateProfile);
router.delete('/deleteAccount', auth, deleteAccount);
router.put('/updateDisplayPicture', auth, updateDisplayPicture);
router.get('/instructorDashboard', auth, isInstructor,instructorDashboard);


module.exports = router;
