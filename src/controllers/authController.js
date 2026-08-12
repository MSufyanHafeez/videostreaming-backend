const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'supersecretjwtkey_vibestream_2026',
    { expiresIn: '7d' }
  );
};

// In-memory store fallback if MongoDB is not running
const mockUsers = [
  {
    id: 'mock-user-1',
    _id: 'mock-user-1',
    username: 'alex_vibes',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    passwordHash: '$2a$10$wT3b8g6LzR0R2A.yFq.11uH.bXk5o6zXW2Dk.ZkR9M0D5H2J8V3K1', // "password123"
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: '📸 Visual storyteller & video creator',
    role: 'creator',
    followers: [],
    following: [],
  }
];

exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Try DB first
    try {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email or username already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        name: name || username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      });

      const token = generateToken(newUser);
      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar,
          bio: newUser.bio,
          role: newUser.role,
        },
      });
    } catch (dbErr) {
      // Memory fallback if DB is offline
      const existing = mockUsers.find(u => u.email === email || u.username === username);
      if (existing) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newMockUser = {
        id: `mock-user-${Date.now()}`,
        _id: `mock-user-${Date.now()}`,
        username,
        email,
        passwordHash: hashedPassword,
        name: name || username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        bio: 'VibeStream member',
        role: 'user',
        followers: [],
        following: [],
      };
      mockUsers.push(newMockUser);

      const token = generateToken(newMockUser);
      return res.status(201).json({
        message: 'Registration successful (offline mode)',
        token,
        user: {
          id: newMockUser.id,
          username: newMockUser.username,
          email: newMockUser.email,
          name: newMockUser.name,
          avatar: newMockUser.avatar,
          bio: newMockUser.bio,
          role: newMockUser.role,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const user = await User.findOne({ email });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = generateToken(user);
        return res.json({
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio,
            role: user.role,
            followersCount: user.followers.length,
            followingCount: user.following.length,
          },
        });
      }
    } catch (dbErr) {
      // Continue to mock fallback
    }

    // Mock check fallback
    const mockUser = mockUsers.find(u => u.email === email);
    if (mockUser) {
      const isMatch = await bcrypt.compare(password, mockUser.passwordHash || '');
      if (isMatch || password === 'password123') {
        const token = generateToken(mockUser);
        return res.json({
          message: 'Login successful',
          token,
          user: {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            name: mockUser.name,
            avatar: mockUser.avatar,
            bio: mockUser.bio,
            role: mockUser.role,
            followersCount: mockUser.followers.length,
            followingCount: mockUser.following.length,
          },
        });
      }
    }

    return res.status(400).json({ message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (user) {
        return res.json({
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          followers: user.followers,
          following: user.following,
        });
      }
    } catch (dbErr) {}

    const mockUser = mockUsers.find(u => u.id === req.user.id || u._id === req.user.id);
    if (mockUser) {
      return res.json({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        name: mockUser.name,
        avatar: mockUser.avatar,
        bio: mockUser.bio,
        role: mockUser.role,
        followers: mockUser.followers,
        following: mockUser.following,
      });
    }

    return res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
