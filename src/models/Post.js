const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      default: '',
      maxlength: 2200,
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media file is required'],
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
      default: 'image',
    },
    aspectRatio: {
      type: String,
      default: '1:1',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: {
      type: Number,
      default: 0,
    },
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 1, max: 5, required: true },
      },
    ],
    ratingAverage: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
