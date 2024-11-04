const cloudinary = require('cloudinary').v2;

exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
    try {
        // Construct options object
        const options = { folder };

        // Include height if provided
        if (height) {
            options.height = height;
        }

        // Include quality if provided
        if (quality) {
            options.quality = quality;
        }

        // Automatically detect the resource type
        options.resource_type = 'auto';

        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(file.tempFilePath, options);

        // Return the result of the upload
        return result;
    } catch (error) {
        // Handle errors
        console.error('Error uploading image to Cloudinary:', error);
        throw new Error('Image upload failed');
    }
};
