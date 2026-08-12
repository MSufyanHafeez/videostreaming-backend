const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_vibestream_2026');
      req.user = decoded; // { id, username, email, role }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized, invalid or expired token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized, token missing' });
  }
};

// Role-based access control (RBAC) middleware
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
