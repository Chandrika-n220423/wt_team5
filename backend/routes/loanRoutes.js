const express = require("express");
const Loan = require("../models/Loan");
const { verifyUser } = require("../middleware/auth");

const router = express.Router();

/* ================= APPLY FOR LOAN ================= */
router.post("/apply", verifyUser, async (req, res, next) => {
  try {
    const { amount, loanType, monthlyIncome, employmentType, durationMonths } = req.body;

    if (!amount || !loanType || !monthlyIncome || !employmentType || !durationMonths) {
      return res.status(400).json({ message: "All fields are required to apply for a loan." });
    }

    if (Number(amount) <= 0 || Number(durationMonths) <= 0) {
      return res.status(400).json({ message: "Amount and duration must be greater than zero." });
    }

    const loan = new Loan({
      userId: req.user.id,
      amount: Number(amount),
      loanType,
      monthlyIncome: Number(monthlyIncome),
      employmentType,
      durationMonths: Number(durationMonths)
    });

    await loan.save();

    res.json({
      message: "Loan application submitted successfully.",
      loan
    });

  } catch (error) {
    next(error);
  }
});

/* ================= GET MY LOANS ================= */
router.get("/my-loans", verifyUser, async (req, res, next) => {
  try {
    const loans = await Loan.find({ userId: req.user.id }).sort({ date: -1 });
    res.json({ loans });
  } catch (error) {
    next(error);
  }
});

/* ================= GET ALL LOANS (ADMIN) ================= */
router.get("/all", async (req, res, next) => {
  try {
    const loans = await Loan.find().populate('userId', 'name email').sort({ date: -1 });
    res.json({ loans });
  } catch (error) {
    next(error);
  }
});

/* ================= UPDATE LOAN STATUS (ADMIN) ================= */
router.put("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Pending Cashier", "Verified by Cashier", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found." });
    }

    loan.status = status;
    await loan.save();

    res.json({ message: `Loan marked as ${status}`, loan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
