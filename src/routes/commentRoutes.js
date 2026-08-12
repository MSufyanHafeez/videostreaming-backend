const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:postId/comments', commentController.getPostComments);
router.post('/:postId/comments', protect, commentController.addComment);

module.exports = router;
