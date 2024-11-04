const mongoose = require('mongoose');

const courseProgress = new mongoose.Schema({

    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },

    userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },

    completedVideos:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'SubSection'
        }
    ]
    
})

module.exports = mongoose.model('CourseProgress',courseProgress)