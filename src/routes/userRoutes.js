const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', userController.searchUsers);
router.get('/profile/:identifier', userController.getUserProfile);
router.post('/:id/follow', protect, userController.toggleFollowUser);

module.exports = router;
