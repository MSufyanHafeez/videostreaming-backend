const multer = require('multer');

// Store upload files in memory buffer so they can be directly uploaded to Azure Blob Storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only image and video files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max upload size for videos & photos
  fileFilter,
});

module.exports = upload;
