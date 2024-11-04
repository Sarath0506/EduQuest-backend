const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({

    courseName: {
        type: String,
        required: true
    },

    courseDescription: {
        type: String,
        required: true
    },
    
    instructor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },

    whatWillYouLearn:{
        type:String,
        required:true
    },

    courseContent:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Section'
        }
    ],

    ratingAndReview: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RatingAndReview'
        }
    ],

    thumbnail: {
        type: String,
        required: true
    },

    price:{
        type:Number,
        required: true
    },

    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required: true
    },

    tag:[{
        type:String,
        required: true
    }],

    studentsEnrolled:[
        {
            type:mongoose.Schema.Types.ObjectId,
            // required:true,
            ref:'User'
        }
    ],

    instructions: [{
     type: String,
     required: true
    }],

    status: {
        type: String,
        enum: ["Draft", "Published"],
    },
    

})

module.exports = mongoose.model('Course',courseSchema) 