const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  password: {
    type: String,
    required: true
  },
  dob: {
    type: Date,
    required: true
  },
  aadhaarNumber: {
    type: String,
    required: true,
    minlength: 12,
    maxlength: 12
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true
  },
  accountNumber: {
    type: String,
    unique: true,
    required: true
  }
});

module.exports = mongoose.model("User", userSchema);
