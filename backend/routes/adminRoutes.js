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

/* ================= EXPORTS ================= */
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// POST /export/csv - Admin transaction export
router.post("/export/csv", async (req, res, next) => {
  try {
    let rawTransactions = req.body.transactions;

    if (!rawTransactions) {
      const dbTx = await Transaction.find()
        .sort({ date: -1 })
        .populate("userId", "name email")
        .populate("receiverId", "name email");

      rawTransactions = dbTx.map(tx => {
        return {
          id: tx._id.toString(),
          date: tx.date,
          type: tx.type,
          sender: tx.userId ? tx.userId.name : 'N/A',
          receiver: tx.receiverId ? tx.receiverId.name : 'N/A',
          paymentType: tx.paymentType || 'None',
          amount: tx.amount
        };
      });
    }

    const fields = ['ID', 'Date', 'Type', 'Sender', 'Receiver', 'Method', 'Amount'];
    const data = rawTransactions.map(tx => {
      return {
        'ID': tx.id,
        'Date': new Date(tx.date).toLocaleString(),
        'Type': tx.type,
        'Sender': tx.sender || 'N/A',
        'Receiver': tx.receiver || 'N/A',
        'Method': tx.paymentType || 'None',
        'Amount': tx.amount,
      };
    });

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("all_transactions.csv");
    return res.send(csv);
  } catch (error) {
    next(error);
  }
});

// POST /export/pdf - Admin transaction export
router.post("/export/pdf", async (req, res, next) => {
  try {
    let rawTransactions = req.body.transactions;

    if (!rawTransactions) {
      const dbTx = await Transaction.find()
        .sort({ date: -1 })
        .populate("userId", "name email")
        .populate("receiverId", "name email");

      rawTransactions = dbTx.map(tx => {
        return {
          id: tx._id.toString(),
          date: tx.date,
          type: tx.type,
          sender: tx.userId ? tx.userId.name : 'N/A',
          receiver: tx.receiverId ? tx.receiverId.name : 'N/A',
          paymentType: tx.paymentType || 'None',
          amount: tx.amount
        };
      });
    }

    const doc = new PDFDocument();
    
    res.setHeader('Content-disposition', 'attachment; filename="all_transactions.pdf"');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('System Transaction History', { align: 'center' });
    doc.moveDown();

    rawTransactions.forEach(tx => {
      doc.fontSize(12).text(`Date: ${new Date(tx.date).toLocaleString()}`);
      doc.text(`ID: ${tx.id}`);
      doc.text(`Type: ${tx.type.toUpperCase()}`);
      doc.text(`Method: ${tx.paymentType || 'None'}`);
      doc.text(`Sender: ${tx.sender || 'N/A'}`);
      if (tx.type === 'transfer' || tx.receiver) doc.text(`Receiver: ${tx.receiver || 'N/A'}`);
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

// PUT /final-approve/:id - Manager final loan approval
const Loan = require("../models/Loan");
router.put("/final-approve/:id", verifyAdmin, async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    
    if (loan.status !== "verified_by_cashier") {
      return res.status(400).json({ message: "Only loans verified by cashier can be approved." });
    }

    loan.status = "approved";
    await loan.save();

    res.json({ message: "Loan approved successfully", loan });
  } catch (error) {
    next(error);
  }
});

// PUT /reject/:id - Manager reject loan
router.put("/reject/:id", verifyAdmin, async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    
    loan.status = "rejected";
    await loan.save();

    res.json({ message: "Loan rejected successfully", loan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
