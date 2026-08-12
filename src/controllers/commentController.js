const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

let mockComments = [
  {
    _id: 'comment-1',
    post: 'post-demo-1',
    user: {
      _id: 'user-demo-2',
      username: 'julian_v',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    text: 'Incredible lighting! What camera settings did you use for this?',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    _id: 'comment-2',
    post: 'post-demo-1',
    user: {
      _id: 'user-demo-3',
      username: 'sophia_chen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
    text: 'Tokyo at night is pure magic 😍✨',
    createdAt: new Date(Date.now() - 900000).toISOString(),
  }
];

exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;

    try {
      const comments = await Comment.find({ post: postId })
        .populate('user', 'username name avatar')
        .sort({ createdAt: -1 });

      if (comments && comments.length > 0) {
        return res.json(comments);
      }
    } catch (dbErr) {}

    const filtered = mockComments.filter(c => c.post === postId);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    try {
      const newComment = await Comment.create({
        post: postId,
        user: req.user.id,
        text: text.trim(),
      });

      // Increment comments count on Post
      const post = await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
      if (post && post.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.author,
          sender: req.user.id,
          type: 'comment',
          post: postId,
        });
      }

      const populated = await Comment.findById(newComment._id).populate('user', 'username name avatar');
      return res.status(201).json(populated);
    } catch (dbErr) {}

    const mockComment = {
      _id: `comment-${Date.now()}`,
      post: postId,
      user: {
        _id: req.user.id,
        username: req.user.username || 'current_user',
        avatar: req.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      },
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    mockComments.unshift(mockComment);

    res.status(201).json(mockComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
