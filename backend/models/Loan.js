const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  loanType: {
    type: String,
    enum: ["Personal", "Education", "Home"],
    required: true
  },
  monthlyIncome: {
    type: Number,
    required: true
  },
  employmentType: {
    type: String,
    enum: ["Salaried", "Self-Employed", "Unemployed"],
    required: true
  },
  durationMonths: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Loan", loanSchema);
