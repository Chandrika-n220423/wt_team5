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

router.put("/profile", verifyUser, async (req, res, next) => {
  try {
    const { name, phone, dob, gender } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;

    await user.save();

    res.json({
      message: "Profile updated successfully",
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
      }
    });
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


    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTransactionCount = await Transaction.countDocuments({
      userId: req.user.id,
      date: { $gte: startOfDay }
    });

    if (todayTransactionCount >= 20) {
      return res.status(400).json({ message: "Daily limit of 20 transactions reached." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { balance: Number(amount) } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

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


    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTransactionCount = await Transaction.countDocuments({
      userId: req.user.id,
      date: { $gte: startOfDay }
    });

    if (todayTransactionCount >= 20) {
      return res.status(400).json({ message: "Daily limit of 20 transactions reached." });
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

    const { toEmail, amount, paymentType } = req.body;

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

    const typeOfPayment = paymentType || "None"; // fallback to None if not provided


    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTransactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startOfDay }
    });

    if (todayTransactions.length >= 20) {
      return res.status(400).json({ message: "Daily limit of 20 transactions reached." });
    }

    const totalTransferredToday = todayTransactions
      .filter(tx => tx.type === "transfer" || tx.type === "withdraw") // Consider all debit types or just transfer
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Limit 3: max 100000 total transfer per day
    if (totalTransferredToday + Number(amount) > 100000) {
      return res.status(400).json({ message: `Maximum total transfer per day (₹100,000) exceeded. Remaining limit: ₹${(100000 - totalTransferredToday).toFixed(2)}` });
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
      paymentType: typeOfPayment,
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

/* ================= EXPORTS ================= */
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// POST /export/csv - User transaction export
router.post("/export/csv", verifyUser, async (req, res, next) => {
  try {
    let rawTransactions = req.body.transactions;
    
    if (!rawTransactions) {
      const dbTx = await Transaction.find({
        $or: [{ userId: req.user.id }, { receiverId: req.user.id }]
      }).sort({ date: -1 }).populate("userId", "name email").populate("receiverId", "name email");
      
      rawTransactions = dbTx.map(tx => {
        let isCredit = (tx.receiverId && tx.receiverId._id.toString() === req.user.id) || (tx.type === 'deposit');
        return {
          id: tx._id.toString(),
          date: tx.date,
          type: tx.type,
          description: (tx.type === 'transfer' ? (isCredit ? `From ${tx.userId.name}` : `To ${tx.receiverId.name}`) : tx.type),
          paymentType: tx.paymentType,
          amount: (isCredit ? '+' : '-') + tx.amount,
        };
      });
    }

    const fields = ['ID', 'Date', 'Type', 'Description', 'Method', 'Amount'];
    const data = rawTransactions.map(tx => {
      return {
        'ID': tx.id,
        'Date': new Date(tx.date).toLocaleString(),
        'Type': tx.type,
        'Description': tx.description,
        'Method': tx.paymentType || 'None',
        'Amount': tx.amount,
      };
    });

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("transactions.csv");
    return res.send(csv);

  } catch (error) {
    next(error);
  }
});

// POST /export/pdf - User transaction export
router.post("/export/pdf", verifyUser, async (req, res, next) => {
  try {
    let rawTransactions = req.body.transactions;
    
    if (!rawTransactions) {
      const dbTx = await Transaction.find({
        $or: [{ userId: req.user.id }, { receiverId: req.user.id }]
      }).sort({ date: -1 }).populate("userId", "name email").populate("receiverId", "name email");
      
      rawTransactions = dbTx.map(tx => {
        let isCredit = (tx.receiverId && tx.receiverId._id.toString() === req.user.id) || (tx.type === 'deposit');
        return {
          id: tx._id.toString(),
          date: tx.date,
          type: tx.type,
          description: (tx.type === 'transfer' ? (isCredit ? `From ${tx.userId.name}` : `To ${tx.receiverId.name}`) : tx.type),
          paymentType: tx.paymentType,
          amount: (isCredit ? '+' : '-') + tx.amount,
        };
      });
    }

    const doc = new PDFDocument();
    
    res.setHeader('Content-disposition', 'attachment; filename="transactions.pdf"');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Transaction History', { align: 'center' });
    doc.moveDown();

    rawTransactions.forEach(tx => {
      doc.fontSize(12).text(`Date: ${new Date(tx.date).toLocaleString()}`);
      doc.text(`ID: ${tx.id}`);
      doc.text(`Type: ${tx.type.toUpperCase()}`);
      doc.text(`Method: ${tx.paymentType || 'None'}`);
      doc.text(`Description: ${tx.description}`);
      doc.text(`Amount: INR ${tx.amount}`);
      doc.moveDown();
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown();
    });

    doc.end();

  } catch (error) {
    next(error);
  }
});

module.exports = router;