const mongoose = require('mongoose');

// Disable Mongoose command buffering so queries fail-fast (0ms) when MongoDB is offline,
// allowing instant fallback to Azure SQL Database and memory storage.
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vibestream', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 1000,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.log('[Database Status]: Using Azure SQL Database & Azure Blob Storage.');
  }
};

module.exports = connectDB;
