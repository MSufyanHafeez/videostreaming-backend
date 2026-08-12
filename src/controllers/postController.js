const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { uploadToAzureBlob } = require('../config/azureStorage');

// Pre-seeded demo posts for immediate visual experience
let mockPosts = [
  {
    _id: 'post-demo-1',
    id: 'post-demo-1',
    author: {
      _id: 'user-demo-1',
      username: 'neon_vibes',
      name: 'Maya Lin',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    caption: 'Cyberpunk sunset at Tokyo Bay 🌇✨ #tokyo #cyberpunk #aesthetic #vibes',
    mediaUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1080',
    mediaType: 'image',
    likes: ['user-demo-2', 'user-demo-3'],
    commentsCount: 14,
    tags: ['tokyo', 'cyberpunk', 'aesthetic'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'post-demo-2',
    id: 'post-demo-2',
    author: {
      _id: 'user-demo-2',
      username: 'cinematic_motion',
      name: 'Julian Vance',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    caption: 'Breathtaking ocean waves cinematic reel 🌊 Watch till the end! #ocean #reels #viral',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-ocean-waves-loop-42868-large.mp4',
    mediaType: 'video',
    likes: ['user-demo-1', 'user-demo-4', 'user-demo-5'],
    commentsCount: 42,
    tags: ['ocean', 'reels', 'viral'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    _id: 'post-demo-3',
    id: 'post-demo-3',
    author: {
      _id: 'user-demo-3',
      username: 'art_and_soul',
      name: 'Sophia Chen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
    caption: 'Coffee aesthetics & morning studio vibes ☕🎨 #art #coffee #morningroutine',
    mediaUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1080',
    mediaType: 'image',
    likes: ['user-demo-1'],
    commentsCount: 8,
    tags: ['art', 'coffee', 'morningroutine'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    _id: 'post-demo-4',
    id: 'post-demo-4',
    author: {
      _id: 'user-demo-4',
      username: 'urban_skater',
      name: 'Leo Thorne',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    caption: 'Sunset skate session in LA 🛹🔥 Sound ON! #skate #la #sunset #reels',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-skateboarder-doing-tricks-in-a-skate-park-41619-large.mp4',
    mediaType: 'video',
    likes: ['user-demo-2', 'user-demo-3'],
    commentsCount: 19,
    tags: ['skate', 'la', 'sunset'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

// Fetch Feed / Explore Posts with pagination
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // 'image' or 'video' or empty for all

    try {
      const query = type ? { mediaType: type } : {};
      const posts = await Post.find(query)
        .populate('author', 'username name avatar bio')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      if (posts && posts.length > 0) {
        return res.json({
          posts,
          page,
          hasMore: posts.length === limit,
        });
      }
    } catch (dbErr) {
      // Fall through to memory store if DB is empty/offline
    }

    // Filter memory posts if requested
    let filtered = mockPosts;
    if (type) {
      filtered = mockPosts.filter(p => p.mediaType === type);
    }
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      posts: paginated,
      page,
      hasMore: startIndex + limit < filtered.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new Post
exports.createPost = async (req, res) => {
  try {
    // Role Authorization: Only Creators can publish posts
    if (req.user && req.user.role === 'consumer') {
      return res.status(403).json({
        message: 'Only Creator accounts are authorized to publish posts. Upgrade to a Creator account in your profile to share photos and videos!',
      });
    }

    const { caption, tags } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Media file (image or video) is required' });
    }

    let mediaUrl = req.file.filename ? `/uploads/${req.file.filename}` : '';
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Primary Cloud Storage: Upload photo or video to Azure Blob Storage
    if (req.file.buffer) {
      try {
        mediaUrl = await uploadToAzureBlob(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (azureErr) {
        console.error('[Azure Blob Upload Error]:', azureErr.message);
      }
    } else if (isCloudinaryConfigured && req.file.path) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: mediaType === 'video' ? 'video' : 'image',
          folder: 'vibestream_posts',
        });
        mediaUrl = result.secure_url;
      } catch (cloudErr) {
        console.error('Cloudinary upload failed:', cloudErr.message);
      }
    }

    const tagArray = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [];

    // Try DB create
    try {
      const newPost = await Post.create({
        author: req.user.id,
        caption: caption || '',
        mediaUrl,
        mediaType,
        tags: tagArray,
      });

      const populatedPost = await Post.findById(newPost._id).populate('author', 'username name avatar bio');
      return res.status(201).json({
        message: 'Post created successfully',
        post: populatedPost,
      });
    } catch (dbErr) {
      // Memory fallback
      const mockNewPost = {
        _id: `post-${Date.now()}`,
        id: `post-${Date.now()}`,
        author: {
          _id: req.user.id,
          username: req.user.username || 'current_user',
          name: req.user.name || req.user.username,
          avatar: req.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        },
        caption: caption || '',
        mediaUrl,
        mediaType,
        likes: [],
        commentsCount: 0,
        tags: tagArray,
        createdAt: new Date().toISOString(),
      };
      mockPosts.unshift(mockNewPost);

      return res.status(201).json({
        message: 'Post created successfully',
        post: mockNewPost,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle Like / Unlike Post
exports.toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const post = await Post.findById(id);
      if (post) {
        const isLiked = post.likes.includes(userId);
        if (isLiked) {
          post.likes = post.likes.filter(uid => uid.toString() !== userId.toString());
        } else {
          post.likes.push(userId);
          // Create notification for author if not self
          if (post.author.toString() !== userId.toString()) {
            await Notification.create({
              recipient: post.author,
              sender: userId,
              type: 'like',
              post: post._id,
            });
          }
        }
        await post.save();
        return res.json({
          message: isLiked ? 'Unliked post' : 'Liked post',
          likes: post.likes,
          likesCount: post.likes.length,
          isLiked: !isLiked,
        });
      }
    } catch (dbErr) {}

    // Mock store fallback
    const post = mockPosts.find(p => p._id === id || p.id === id);
    if (post) {
      const index = post.likes.indexOf(userId);
      let isLiked = false;
      if (index > -1) {
        post.likes.splice(index, 1);
      } else {
        post.likes.push(userId);
        isLiked = true;
      }
      return res.json({
        message: isLiked ? 'Liked post' : 'Unliked post',
        likes: post.likes,
        likesCount: post.likes.length,
        isLiked,
      });
    }

    res.status(404).json({ message: 'Post not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      const post = await Post.findById(id);
      if (post) {
        if (post.author.toString() !== userId && userRole !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to delete this post' });
        }
        await post.deleteOne();
        return res.json({ message: 'Post deleted successfully' });
      }
    } catch (dbErr) {}

    const index = mockPosts.findIndex(p => p._id === id || p.id === id);
    if (index > -1) {
      if (mockPosts[index].author._id !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this post' });
      }
      mockPosts.splice(index, 1);
      return res.json({ message: 'Post deleted successfully' });
    }

    res.status(404).json({ message: 'Post not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rate a post (1 to 5 stars)
exports.ratePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const userId = req.user.id;

    const numericScore = Math.min(5, Math.max(1, parseInt(score) || 5));

    try {
      const post = await Post.findById(id);
      if (post) {
        if (!post.ratings) post.ratings = [];
        const existingRatingIndex = post.ratings.findIndex(r => r.user && r.user.toString() === userId);

        if (existingRatingIndex > -1) {
          post.ratings[existingRatingIndex].score = numericScore;
        } else {
          post.ratings.push({ user: userId, score: numericScore });
        }

        const totalScore = post.ratings.reduce((sum, r) => sum + r.score, 0);
        post.ratingCount = post.ratings.length;
        post.ratingAverage = parseFloat((totalScore / post.ratings.length).toFixed(1));

        await post.save();
        return res.json({
          message: 'Rating submitted successfully',
          ratingAverage: post.ratingAverage,
          ratingCount: post.ratingCount,
          userScore: numericScore,
        });
      }
    } catch (dbErr) {}

    // Mock store fallback
    const post = mockPosts.find(p => p._id === id || p.id === id);
    if (post) {
      if (!post.ratings) post.ratings = [];
      const idx = post.ratings.findIndex(r => r.user === userId);
      if (idx > -1) {
        post.ratings[idx].score = numericScore;
      } else {
        post.ratings.push({ user: userId, score: numericScore });
      }
      const totalScore = post.ratings.reduce((sum, r) => sum + r.score, 0);
      post.ratingCount = post.ratings.length;
      post.ratingAverage = parseFloat((totalScore / post.ratings.length).toFixed(1));

      return res.json({
        message: 'Rating submitted successfully',
        ratingAverage: post.ratingAverage,
        ratingCount: post.ratingCount,
        userScore: numericScore,
      });
    }

    res.status(404).json({ message: 'Post not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
