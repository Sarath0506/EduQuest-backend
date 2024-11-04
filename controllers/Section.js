const Section = require('../models/Section');
const Course = require('../models/Course');
const SubSection = require('../models/Course');


exports.createSection = async (req, res) => {
    try {
        const { sectionName, courseId } = req.body;
        if (!sectionName || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Both section name and course ID are required'
            });
        }

        const newSection = await Section.create({ sectionName });

        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            { $push: { courseContent: newSection._id } },
            { new: true }
        )
        .populate({
            path: "courseContent",
            populate: {
                path: "subSection"
            }
        })
        .exec();

        return res.status(201).json({
            success: true,
            message: 'Section created successfully',
            updatedCourse
        });
    } catch (e) {
        console.error('Error creating section:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot create section',
            error: e.message
        });
    }
};

exports.updateSection = async (req, res) => {
    try {
        const { sectionName, sectionId,courseId } = req.body;

        if (!sectionName || !sectionId) {
            return res.status(400).json({
                success: false,
                message: 'Both section name and section ID are required'
            });
        }

        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            { sectionName },
            { new: true }
        );

        if (!updatedSection) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        const course = await Course.findById(courseId)
        .populate({
            path:"courseContent",
            populate:{
                path:"subSection"
            }
        }).exec();

        return res.status(200).json({
            success: true,
            message: 'Section updated successfully',
            data:course
        });
    } catch (e) {
        console.error('Error updating section:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot update section',
            error: e.message
        });
    }
};

exports.deleteSection = async (req, res) => {
    try {
        const {courseId}  = req.body;
        const { sectionId } = req.params;
        

        if (!sectionId) {
            return res.status(400).json({
                success: false,
                message: 'Section ID is required'
            });
        }

        await Course.findByIdAndUpdate(
            courseId,
            {$pull: {courseContent:sectionId}},
            {new:true}
        )

        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        if (section.subSection && section.subSection.length > 0) {
            await SubSection.deleteMany({ _id: { $in: section.subSection } });
        }
        
        await Section.findByIdAndDelete(sectionId);

        const course  = await Course.findById(courseId).populate({
            path:"courseContent",
            populate :{
                path:"subSection"
            }
        })
        .exec();

        return res.status(200).json({
            success: true,
            message: 'Section deleted successfully',
            data:course
        });
    } catch (e) {
        console.error('Error deleting section:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot delete section',
            error: e.message
        });
    }
};

