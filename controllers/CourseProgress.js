const CourseProgress = require("../models/CourseProgress");
const SubSection = require("../models/SubSection");

exports.updateCourseProgress = async (req, res) => {
  const { courseId, subSectionId } = req.body;
  const userId = req.user.id;

  try {
    // Validate SubSection
    const subSection = await SubSection.findById(subSectionId);
    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "Sub-section not found.",
      });
    }

    // Find or create course progress for the user
    let courseProgress = await CourseProgress.findOne({ courseId, userId });

    if (!courseProgress) {
        return res.status(400).json({
            success: false,
            message: "CourseProgres does not exist",
        });
      
    } else {
      // Check if the video is already marked as completed
      if (courseProgress.completedVideos.includes(subSectionId)) {
        return res.status(400).json({
          success: false,
          message: "Video already marked as completed.",
        });
      }

      // Add the sub-section ID to completed videos
      courseProgress.completedVideos.push(subSectionId);
    }

    // Save the updated course progress
    await courseProgress.save();

    return res.status(200).json({
      success: true,
      message: "Course progress updated successfully.",
     
    });
  } catch (error) {
    console.error("Error updating course progress:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating course progress.",
      error: error.message,
    });
  }
};
 