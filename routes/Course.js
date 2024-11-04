const express = require('express');
const router = express.Router();

const { createCourse,editCourse, showAllCourses, getInstructorCourse,deleteCourse,getFullCourseDetails } = require('../controllers/Course');
const { createCategory, showAllCategory, categoryPageDetails } = require('../controllers/Category');
const { auth, isStudent, isInstructor, isAdmin } = require('../middlewares/auth');
const { createSection, updateSection, deleteSection } = require('../controllers/Section');
const { createSubSection,updateSubSection, deleteSubSection } = require('../controllers/SubSection');
const { createRating, getAverageRating, getAllRatings } = require('../controllers/RatingAndReview');
const { updateCourseProgress } = require ('../controllers/CourseProgress')

// Courses
router.post('/createCourse', auth, isInstructor, createCourse);
router.post('/editCourse', auth, isInstructor, editCourse);
router.get('/showAllCourses', auth, isInstructor, showAllCourses);
// router.get('/getCourseDetails', auth, isInstructor, getCourseDetails);
router.get('/getInstructorCourses',auth,isInstructor,getInstructorCourse);
router.delete('/deleteCourse',auth,isInstructor,deleteCourse);
router.get('/getFullCourseDetails/:courseId',auth, getFullCourseDetails);
router.post('/updateCourseProgress', auth, isStudent, updateCourseProgress);

// Sections
router.post('/createSection', auth, isInstructor, createSection);
router.post('/updateSection', auth, isInstructor, updateSection);
router.delete('/deleteSection/:sectionId', auth, isInstructor, deleteSection);

// SubSections
router.post('/createSubSection', auth, isInstructor, createSubSection);
router.post('/updateSubSection', auth, isInstructor, updateSubSection);
router.delete('/deleteSubSection/:subSectionId', auth, isInstructor, deleteSubSection);


// Categories
router.post('/createCategory', auth, isAdmin, createCategory);
router.get('/showAllCategory', showAllCategory);
router.post('/categoryPageDetails', categoryPageDetails);

// Ratings and Reviews
router.post('/createRating', auth, isStudent, createRating);
router.get('/getAverageRating', getAverageRating);
router.get('/getReviews', getAllRatings);

module.exports = router;
