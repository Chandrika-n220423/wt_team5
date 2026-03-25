const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const PendingRequest = require("../models/PendingRequest");
const User = require("../models/User");
const Account = require("../models/Account");

/* ── GET all pending registration requests ── */
router.get("/pending-registrations", async (req, res) => {
  try {
    const pending = await PendingRequest.find({}).sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ── APPROVE a registration request ── */
router.post("/approve/:id", async (req, res) => {
  try {
    const pendingReq = await PendingRequest.findById(req.params.id);
    if (!pendingReq) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    // Create the actual user
    const user = new User({
      name: pendingReq.name,
      email: pendingReq.email,
      phone: pendingReq.phone,
      password: pendingReq.password,
      balance: pendingReq.balance,
      dob: pendingReq.dob,
      aadhaarNumber: pendingReq.aadhaarNumber,
      gender: pendingReq.gender,
      accountNumber: pendingReq.accountNumber
    });
    await user.save();

    // Create Account document
    const account = new Account({
      userId: user._id,
      balance: pendingReq.balance,
      accountNumber: pendingReq.accountNumber
    });
    await account.save();

    // Remove from pending requests
    await PendingRequest.findByIdAndDelete(req.params.id);

    res.json({
      message: "User approved and account activated",
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ── REJECT a registration request ── */
router.post("/reject/:id", async (req, res) => {
  try {
    const pendingReq = await PendingRequest.findById(req.params.id);
    if (!pendingReq) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    pendingReq.status = "rejected";
    await pendingReq.save();

    res.json({ message: "Registration request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
