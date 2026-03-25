const mongoose = require("mongoose");

const pendingRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true }, // hashed
  balance: { type: Number, default: 0 },
  dob: { type: Date, required: true },
  aadhaarNumber: { type: String, required: true, minlength: 12, maxlength: 12 },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  accountNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "rejected"],
    default: "pending"
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PendingRequest", pendingRequestSchema);
