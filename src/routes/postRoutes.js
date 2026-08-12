const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', postController.getPosts);
router.post('/', protect, upload.single('media'), postController.createPost);
router.post('/:id/like', protect, postController.toggleLikePost);
router.post('/:id/rate', protect, postController.ratePost);
router.delete('/:id', protect, postController.deletePost);

module.exports = router;
