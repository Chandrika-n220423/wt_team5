const express = require("express");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Loan = require("../models/Loan");
const { isCashier } = require("../middleware/auth");

const router = express.Router();

// GET /cashier/users
router.get("/users", isCashier, async (req, res, next) => {
  try {
    // Return all users (read-only)
    const users = await User.find().select("-password").sort({ _id: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// GET /cashier/transactions
router.get("/transactions", isCashier, async (req, res, next) => {
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

// GET /cashier/pending-requests
router.get("/pending-requests", isCashier, async (req, res, next) => {
  try {
    const loans = await Loan.find({ status: "pending" })
      .populate('userId', 'name email')
      .sort({ date: -1 });
    res.json({ loans });
  } catch (error) {
    next(error);
  }
});

// PUT /cashier/verify-request/:id
router.put("/verify-request/:id", isCashier, async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: "Request not found." });
    }
    
    if (loan.status !== "pending") {
      return res.status(400).json({ message: "Can only verify pending requests." });
    }

    loan.status = "verified_by_cashier";
    await loan.save();

    res.json({ message: "Request verified by cashier", loan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
