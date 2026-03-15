const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { verifyUser } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_banking_secret";

/* ================= LOGIN ================= */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: false },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });

  } catch (error) {
    next(error);
  }
});

/* ================= PROFILE ================= */
router.get("/profile", verifyUser, async (req, res, next) => {
  try {

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user });

  } catch (error) {
    next(error);
  }
});

/* ================= DEPOSIT ================= */
router.post("/deposit", verifyUser, async (req, res, next) => {
  try {

    const { amount } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      isNaN(amount) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({ message: "Please provide a valid deposit amount." });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.balance += Number(amount);
    await user.save();

    const transaction = new Transaction({
      userId: user._id,
      type: "deposit",
      amount: Number(amount)
    });

    await transaction.save();

    res.json({
      message: "Deposit successful",
      balance: user.balance,
      transaction
    });

  } catch (error) {
    next(error);
  }
});

/* ================= WITHDRAW ================= */
router.post("/withdraw", verifyUser, async (req, res, next) => {
  try {

    const { amount } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      isNaN(amount) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({ message: "Please provide a valid withdrawal amount." });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.balance < Number(amount)) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    user.balance -= Number(amount);
    await user.save();

    const transaction = new Transaction({
      userId: user._id,
      type: "withdraw",
      amount: Number(amount)
    });

    await transaction.save();

    res.json({
      message: "Withdrawal successful",
      balance: user.balance,
      transaction
    });

  } catch (error) {
    next(error);
  }
});

/* ================= TRANSFER (EMAIL BASED) ================= */
router.post("/transfer", verifyUser, async (req, res, next) => {
  try {

    const { toEmail, amount } = req.body;

    if (!toEmail) {
      return res.status(400).json({ message: "Receiver email is required." });
    }

    if (
      amount === undefined ||
      amount === null ||
      isNaN(amount) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({ message: "Please provide a valid transfer amount." });
    }

    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found." });
    }

    const receiver = await User.findOne({ email: toEmail });
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    if (sender._id.toString() === receiver._id.toString()) {
      return res.status(400).json({ message: "You cannot transfer money to yourself." });
    }

    if (sender.balance < Number(amount)) {
      return res.status(400).json({ message: "Insufficient balance for transfer." });
    }

    sender.balance -= Number(amount);
    receiver.balance += Number(amount);

    await sender.save();
    await receiver.save();

    const transaction = new Transaction({
      userId: sender._id,
      type: "transfer",
      amount: Number(amount),
      receiverId: receiver._id
    });

    await transaction.save();

    res.json({
      message: "Transfer successful",
      balance: sender.balance,
      transaction
    });

  } catch (error) {
    next(error);
  }
});

/* ================= TRANSACTIONS ================= */
router.get("/transactions", verifyUser, async (req, res, next) => {
  try {

    const transactions = await Transaction.find({
      $or: [
        { userId: req.user.id },
        { receiverId: req.user.id }
      ]
    })
      .sort({ date: -1 })
      .populate("userId", "name email")
      .populate("receiverId", "name email");

    res.json({ transactions });

  } catch (error) {
    next(error);
  }
});

module.exports = router;