const mongoose = require('mongoose');

const subSectionSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },
    
    timeDuration:{
        type:String,
    },

    description:{
        type:String,
    },

    videoURL:{
        type:String,
    }

})

module.exports = mongoose.model('SubSection',subSectionSchema)