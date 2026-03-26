const bcrypt = require("bcryptjs");
const User = require("../models/User");

// @desc    Get security questions for a user
// @route   POST /api/auth/get-security-questions
// @access  Public
exports.getSecurityQuestions = async (req, res) => {
  try {
    const { username, accountNumber } = req.body;

    if (!username && !accountNumber) {
      return res.status(400).json({ message: "Username (email) or account number is required" });
    }

    const query = username ? { email: username } : { accountNumber };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return only the questions, not the answers
    const questions = user.securityQuestions.map(q => q.question);

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Verify security answers and handle account locking
// @route   POST /api/auth/verify-security-answers
// @access  Public
exports.verifySecurityAnswers = async (req, res) => {
  try {
    const { username, answers } = req.body;

    if (!username || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Username and answers are required" });
    }

    const user = await User.findOne({ email: username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({ 
        message: `Account is temporarily locked. Please try again in ${remainingTime} minutes.` 
      });
    }

    if (answers.length !== user.securityQuestions.length) {
      return res.status(400).json({ message: "Incorrect number of answers provided" });
    }

    let allMatch = true;
    for (let i = 0; i < user.securityQuestions.length; i++) {
      const isMatch = await bcrypt.compare(answers[i], user.securityQuestions[i].answer);
      if (!isMatch) {
        allMatch = false;
        break;
      }
    }

    if (!allMatch) {
      user.failedAttempts += 1;
      
      if (user.failedAttempts >= 3) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
        await user.save();
        return res.status(403).json({ 
          message: "Too many failed attempts. Account locked for 15 minutes." 
        });
      }

      await user.save();
      return res.status(400).json({ 
        message: "Invalid security answers.",
        remainingAttempts: 3 - user.failedAttempts
      });
    }

    // If all answers match, reset failed attempts
    user.failedAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({ message: "Verification successful. You can now reset your MPIN." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset MPIN
// @route   POST /api/auth/reset-mpin
// @access  Public
exports.resetMPIN = async (req, res) => {
  try {
    const { username, newMPIN } = req.body;

    if (!username || !newMPIN) {
      return res.status(400).json({ message: "Username and new MPIN are required" });
    }

    if (newMPIN.length !== 6 || !/^\d+$/.test(newMPIN)) {
      return res.status(400).json({ message: "MPIN must be exactly 6 digits" });
    }

    const user = await User.findOne({ email: username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedMpin = await bcrypt.hash(newMPIN, 10);
    user.mpin = hashedMpin;
    
    // Reset failed attempts upon successful reset
    user.failedAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    res.json({ message: "MPIN reset successfully. You can now log in with your new MPIN." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
