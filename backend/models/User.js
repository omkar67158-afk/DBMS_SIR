const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String },
  rollNumber: { type: String, default: null },
  officialName: { type: String, default: null },
  sessionToken: { type: String, default: null },
  currentStep: { type: Number, default: 1 },
  ocrStatus: { type: String, enum: ['IDLE', 'PROCESSING', 'REJECTED'], default: 'IDLE' },
  ocrFeedback: { type: String, default: null },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  submissions: [{
    stepId: Number,
    imageData: String, // Base64 string of the uploaded screenshot
    submittedAt: { type: Date, default: Date.now }
  }],
  rejectionCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
