const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

let mockUsers = [
  {
    _id: 'user-demo-1',
    id: 'user-demo-1',
    username: 'neon_vibes',
    name: 'Maya Lin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Cyberpunk photography & visual arts 🌆',
    followers: ['user-demo-2', 'user-demo-3'],
    following: ['user-demo-2'],
  },
  {
    _id: 'user-demo-2',
    id: 'user-demo-2',
    username: 'cinematic_motion',
    name: 'Julian Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Short videos & 4K cinematic reels 🎬',
    followers: ['user-demo-1'],
    following: ['user-demo-1', 'user-demo-3'],
  },
  {
    _id: 'user-demo-3',
    id: 'user-demo-3',
    username: 'art_and_soul',
    name: 'Sophia Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    bio: 'Illustrator & coffee enthusiast ☕🎨',
    followers: ['user-demo-2'],
    following: ['user-demo-1'],
  }
];

// Get profile by username or id
exports.getUserProfile = async (req, res) => {
  try {
    const { identifier } = req.params;

    try {
      const user = await User.findOne({
        $or: [{ username: identifier }, { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null }],
      }).select('-password');

      if (user) {
        const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 });
        return res.json({
          user,
          posts,
          followersCount: user.followers.length,
          followingCount: user.following.length,
        });
      }
    } catch (dbErr) {}

    const mockUser = mockUsers.find(u => u.username === identifier || u.id === identifier || u._id === identifier);
    if (mockUser) {
      return res.json({
        user: mockUser,
        posts: [],
        followersCount: mockUser.followers.length,
        followingCount: mockUser.following.length,
      });
    }

    res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Follow / Unfollow User
exports.toggleFollowUser = async (req, res) => {
  try {
    const { id } = req.params; // target user id
    const currentUserId = req.user.id;

    if (id === currentUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    try {
      const targetUser = await User.findById(id);
      const currentUser = await User.findById(currentUserId);

      if (targetUser && currentUser) {
        const isFollowing = targetUser.followers.includes(currentUserId);

        if (isFollowing) {
          targetUser.followers = targetUser.followers.filter(uid => uid.toString() !== currentUserId);
          currentUser.following = currentUser.following.filter(uid => uid.toString() !== id);
        } else {
          targetUser.followers.push(currentUserId);
          currentUser.following.push(id);

          await Notification.create({
            recipient: targetUser._id,
            sender: currentUser._id,
            type: 'follow',
          });
        }

        await targetUser.save();
        await currentUser.save();

        return res.json({
          message: isFollowing ? 'Unfollowed user' : 'Followed user',
          isFollowing: !isFollowing,
          followersCount: targetUser.followers.length,
        });
      }
    } catch (dbErr) {}

    // Mock store
    const target = mockUsers.find(u => u._id === id || u.id === id);
    if (target) {
      const idx = target.followers.indexOf(currentUserId);
      let isFollowing = false;
      if (idx > -1) {
        target.followers.splice(idx, 1);
      } else {
        target.followers.push(currentUserId);
        isFollowing = true;
      }
      return res.json({
        message: isFollowing ? 'Followed user' : 'Unfollowed user',
        isFollowing,
        followersCount: target.followers.length,
      });
    }

    res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }

    try {
      const users = await User.find({
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ],
      }).select('username name avatar bio followers role');

      if (users && users.length > 0) {
        return res.json(users);
      }
    } catch (dbErr) {}

    const query = q.toLowerCase();
    const results = mockUsers.filter(
      u => u.username.toLowerCase().includes(query) || (u.name && u.name.toLowerCase().includes(query))
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Switch / Update Account Role (Consumer <-> Creator)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const targetRole = role === 'creator' ? 'creator' : 'consumer';

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        user.role = targetRole;
        await user.save();
        return res.json({
          message: `Account role updated to ${targetRole}`,
          role: user.role,
        });
      }
    } catch (dbErr) {}

    const mock = mockUsers.find(u => u.id === req.user.id || u._id === req.user.id);
    if (mock) {
      mock.role = targetRole;
    }

    return res.json({
      message: `Account role updated to ${targetRole}`,
      role: targetRole,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
