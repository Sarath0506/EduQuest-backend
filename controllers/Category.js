const Category = require('../models/Category');

function getRandomInt(max){
    return Math.floor(Math.random()*max)
}

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validate input
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Create category
        const categoryDetails = await Category.create({ name, description });
        console.log('Category created:', categoryDetails);

        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: categoryDetails
        });

    } catch (e) {
        console.error('Error creating category:', e);
        return res.status(500).json({
            success: false,
            message: 'Server error while creating category'
        });
    }
};

// Show All Categories
exports.showAllCategory = async (req, res) => {
    try {
        // Fetch all categories
        const allCategories = await Category.find({}, { name: true, description: true });
        console.log('All categories fetched:', allCategories);

        return res.status(200).json({
            success: true,
            message: 'All categories returned successfully',
            data: allCategories
        });

    } catch (e) {
        console.error('Error fetching categories:', e);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching categories'
        });
    }
};

// Get Category Page Details
exports.categoryPageDetails = async (req, res) => {
    try {
        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        // Find selected category and populate courses
        const selectedCategory = await Category.findById(categoryId)
        .populate({
            path:'courses',
            match: {status:"Published"},
            // populate: "ratingAndReviews"
        }).exec();

        if (!selectedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Find different categories excluding the selected one
        const differentCategories = await Category.find({ _id: { $ne: categoryId } }) 
        .populate({
            path:'courses',
            match: {status:"Published"},
        }).exec();

        console.log('Selected category:', selectedCategory);
        console.log('Different categories:', differentCategories);

        const allCategories = await Category.find()
        .populate({
            path:"courses",
            match:{status:"Published"},
            populate:{
                path:"instructor",
            }
        })
        .exec();
        const allCourses = allCategories.flatMap((category)=>category.courses)
        const mostSellingCourses = allCourses
        .sort((a,b)=>b.sold-a.sold)
        .slice(0,10)

        return res.status(200).json({
            success: true,
            message: 'Category details fetched successfully',
            data: {
                selectedCategory,
                differentCategories,
                mostSellingCourses
            }
        });

    } catch (e) {
        console.error('Error fetching category details:', e);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching category details'
        });
    }
};
