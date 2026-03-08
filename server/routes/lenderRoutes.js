const express = require('express');
const router = express.Router();
const { createLender, getLenders, searchLenders, updateLender, getLender } = require('../controllers/lenderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/search', searchLenders);
router.route('/').get(getLenders).post(createLender);
router.route('/:id').get(getLender).put(updateLender);

module.exports = router;
