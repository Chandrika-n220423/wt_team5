const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { verifyAdmin } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_banking_secret";

// POST /login – admin login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid admin credentials." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid admin credentials." });
    }

    // Create JWT token with isAdmin flag
    const token = jwt.sign({ id: admin._id, isAdmin: true }, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Optional utility (disabled by default): Route to setup initial admin user when testing application
/*
router.post("/setup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    let admin = await Admin.findOne({ email });
    if (admin) return res.status(400).json({ message: "Admin already exists." });
    
    admin = new Admin({ name, email, password }); // password gets hashed in pre-save hook
    await admin.save();
    res.status(201).json({ message: "Admin created successfully." });
  } catch (error) {
    next(error);
  }
});
*/

// GET /users – list all users
router.get("/users", verifyAdmin, async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ _id: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// GET /transactions – list all transactions
router.get("/transactions", verifyAdmin, async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .populate("userId", "name email")
      .populate("receiverId", "name email");

    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
