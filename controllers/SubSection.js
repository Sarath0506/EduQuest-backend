const Section = require('../models/Section');
const SubSection = require('../models/SubSection');
const { uploadImageToCloudinary } = require('../utils/imageUploader');

exports.createSubSection = async (req, res) => {
    try {
        const { title, description, sectionId } = req.body;
        const video = req.files.video;

        if (!title || !description || !video || !sectionId) {
            return res.status(400).json({
                success: false,
                message: 'All fields (title, description, video, sectionId) must be provided'
            });
        }

        // Validate video file type if necessary
        // e.g., check if video is a valid file format

        // Upload video and handle any errors
        const videoUpload = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
        if (!videoUpload || !videoUpload.secure_url) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload video'
            });
        }

        const subSectionDetails = await SubSection.create({
            title,
            // timeDuration : `${videoUpload.duration}`,
            description,
            videoURL: videoUpload.secure_url
        });
        console.log(subSectionDetails);

        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            {
                $push: { subSection: subSectionDetails._id }
            },
            { new: true }
        )
        .populate({
            path: "subSection"
        })
        .exec();

        return res.status(201).json({
            success: true,
            message: 'Subsection created successfully',
            data: updatedSection
        });
    } catch (e) {
        console.error('Error creating subsection:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot create subsection',
            error: e.message
        });
    }
};

exports.updateSubSection = async (req, res) => {
    try {
        const { title, description, subSectionId, sectionId } = req.body;
        const video = req.files ? req.files.video : null; // Handle video if it's present

        // Find the subsection to update
        const subSection = await SubSection.findById(subSectionId);
        if (!subSection) {
            return res.status(404).json({
                success: false,
                message: 'Subsection not found'
            });
        }

        // Update fields conditionally
        if (title) {
            subSection.title = title;
        }
        if (description) {
            subSection.description = description;
        }
        if (video) {
            const videoUpload = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
            if (!videoUpload || !videoUpload.secure_url) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload video'
                });
            }
            subSection.videoURL = videoUpload.secure_url;
        }

        // Save the updated subsection
        await subSection.save();

        // Update the section
        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        section.subSection = section.subSection.map((subSec) => 
            subSec._id === subSectionId ? subSection : subSec
        );

        // Save the updated section
        await section.save();

        // Return the updated section
        const updatedSection = await Section.findById(sectionId).populate("subSection").exec();

        return res.status(200).json({
            success: true,
            message: 'Subsection updated successfully',
            data: updatedSection
        });
    } catch (e) {
        console.error('Error updating subsection:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot update subsection',
            error: e.message
        });
    }
};


exports.deleteSubSection = async (req, res) => {
    try {
        const { subSectionId } = req.params;
        const { sectionId } = req.body;

        if (!subSectionId || !sectionId) {
            return res.status(400).json({
                success: false,
                message: 'Subsection ID and Section ID must be provided',
            });
        }

        // Remove sub-section from section
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            { $pull: { subSection: subSectionId } },
            { new: true } // Get the updated section after pulling
        ).populate('subSection'); // Populate the subsection to verify the change

        // Check if the subsection was successfully pulled
        if (!updatedSection) {
            return res.status(404).json({
                success: false,
                message: 'Section not found or Subsection not removed from section',
            });
        }

        // Delete the subsection
        const subSection = await SubSection.findByIdAndDelete(subSectionId);
        if (!subSection) {
            return res.status(404).json({
                success: false,
                message: 'Subsection not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Subsection deleted successfully',
            data: updatedSection,
        });
    } catch (e) {
        console.error('Error deleting subsection:', e);
        return res.status(500).json({
            success: false,
            message: 'Cannot delete subsection',
            error: e.message,
        });
    }
};
