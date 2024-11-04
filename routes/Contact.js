const express = require('express');
const { contactUs } = require('../controllers/ContactUs');
const router = express.Router();

router.post('/contactUs',contactUs);

module.exports = router;