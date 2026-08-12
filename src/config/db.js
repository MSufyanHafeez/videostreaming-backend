const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vibestream', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Warning]: Connection failed - ${error.message}`);
    console.warn('[MongoDB Warning]: Running in decoupled/memory storage fallback mode if database is offline.');
  }
};

module.exports = connectDB;
