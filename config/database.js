const mongoose = require('mongoose');
require('dotenv').config();
mongoose.set("strictQuery", false);

exports.connect = () => {
    mongoose.connect(process.env.MONGODB_URL, {
        
    })
    .then(() => console.log('DB connected successfully'))
    .catch((e) => {
        console.error('DB connection issue:', e);
        process.exit(1);
    });
};
