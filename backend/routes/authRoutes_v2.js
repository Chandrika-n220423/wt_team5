const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Account = require("../models/Account");
const PendingRequest = require("../models/PendingRequest");
const authController = require("../controllers/authController");
const router = express.Router();



/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, balance, mpin, dob, aadhaarNumber, gender, securityQuestions } = req.body;

    if (!name || !email || !phone || !mpin || !dob || !aadhaarNumber || !gender || !securityQuestions) {
      return res.status(400).json({ message: "All fields including security questions are required" });
    }

    if (!Array.isArray(securityQuestions) || securityQuestions.length < 2) {
      return res.status(400).json({ message: "At least 2 security questions are required" });
    }

    if (securityQuestions[0].question === securityQuestions[1].question) {
      return res.status(400).json({ message: "Security questions must be unique" });
    }

    if (mpin.length !== 6 || !/^\d+$/.test(mpin)) {
      return res.status(400).json({ message: "MPIN must be exactly 6 digits" });
    }

    if (aadhaarNumber.length !== 12 || !/^\d+$/.test(aadhaarNumber)) {
      return res.status(400).json({ message: "Aadhaar number must be exactly 12 digits" });
    }

    // Check in active users
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check if already in pending/rejected
    const existingPending = await PendingRequest.findOne({ email });
    if (existingPending) {
      if (existingPending.status === "pending") {
        return res.status(400).json({ message: "A registration request with this email is already pending approval.", status: "pending" });
      } else if (existingPending.status === "rejected") {
        return res.status(400).json({ message: "Your previous registration was rejected. Please contact the bank.", status: "rejected" });
      }
    }

    // Generate unique 10-digit account number starting with '10'
    const accountNumber = "10" + Math.floor(10000000 + Math.random() * 90000000).toString();

    const hashedMpin = await bcrypt.hash(mpin, 10);

    // Hash security question answers
    const hashedSecurityQuestions = await Promise.all(
      securityQuestions.map(async (sq) => ({
        question: sq.question,
        answer: await bcrypt.hash(sq.answer, 10)
      }))
    );

    // Save to pending_requests instead of users
    const pendingReq = new PendingRequest({
      name,
      email,
      phone,
      balance: balance || 0,
      mpin: hashedMpin,
      dob,
      aadhaarNumber,
      gender,
      accountNumber,
      securityQuestions: hashedSecurityQuestions,
      status: "pending"
    });

    await pendingReq.save();

    res.status(201).json({
      message: "Registration submitted. Please wait for accountant approval.",
      status: "pending",
      email: pendingReq.email
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, mpin } = req.body;

    if (!email || !mpin) {
      return res.status(400).json({ message: "Email and MPIN required" });
    }

    // Check pending_requests first for status-based UI notifications
    const pendingReq = await PendingRequest.findOne({ email });
    if (pendingReq) {
      const isMatch = await bcrypt.compare(mpin, pendingReq.mpin);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid MPIN" });
      }
      if (pendingReq.status === "pending") {
        return res.status(403).json({
          status: "pending",
          message: "Your account request is under accountant review. Please wait for approval."
        });
      }
      if (pendingReq.status === "rejected") {
        return res.status(403).json({
          status: "rejected",
          message: "Your account request was rejected by the accountant. Please contact the bank for more details."
        });
      }
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(mpin, user.mpin);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid MPIN" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_banking_secret",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      status: "active",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        dob: user.dob,
        aadhaarNumber: user.aadhaarNumber,
        gender: user.gender,
        accountNumber: user.accountNumber
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, newMpin } = req.body;

    if (!email || !newMpin) {
      return res.status(400).json({ message: "Email and new MPIN are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    user.mpin = await bcrypt.hash(newMpin, salt);
    await user.save();

    res.json({ message: "MPIN updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});


/* ================= FORGOT MPIN VIA SECURITY QUESTIONS ================= */
router.post("/get-security-questions", authController.getSecurityQuestions);
router.post("/verify-security-answers", authController.verifySecurityAnswers);
router.post("/reset-mpin", authController.resetMPIN);


/* ================= MANAGER & CASHIER PIN LOGIN ================= */
router.post("/manager-pin-login", async (req, res) => {
  try {
    const { pin } = req.body;
    if (pin !== "7890") {
      return res.status(400).json({ message: "Invalid Manager PIN" });
    }
    const token = jwt.sign(
      { id: "manager_system_id", role: "manager" },
      process.env.JWT_SECRET || "default_banking_secret",
      { expiresIn: "10h" }
    );
    res.json({
      message: "Manager login successful",
      token,
      user: { id: "manager_system_id", name: "System Manager", role: "manager" }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/cashier-pin-login", async (req, res) => {
  try {
    const { pin } = req.body;
    if (pin !== "2006") {
      return res.status(400).json({ message: "Invalid Cashier PIN" });
    }
    const token = jwt.sign(
      { id: "cashier_system_id", role: "cashier" },
      process.env.JWT_SECRET || "default_banking_secret",
      { expiresIn: "10h" }
    );
    res.json({
      message: "Cashier login successful",
      token,
      user: { id: "cashier_system_id", name: "System Cashier", role: "cashier" }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
