const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Account = require("../models/Account");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const router = express.Router();
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        let user = await User.findOne({ email });

        if (!user) {
            const accountNumber = "10" + Math.floor(10000000 + Math.random() * 90000000).toString();
            user = new User({
                name,
                email,
                googleId,
                phone: "0000000000",
                password: "google_auth",
                balance: 0,
                dob: new Date(),
                aadhaarNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
                gender: "Other",
                accountNumber
            });

            await user.save();

            const account = new Account({
                userId: user._id,
                balance: 0,
                accountNumber: accountNumber
            });
            await account.save();
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
            
            const existingAccount = await Account.findOne({ userId: user._id });
            if (!existingAccount) {
                const account = new Account({
                    userId: user._id,
                    balance: user.balance,
                    accountNumber: user.accountNumber
                });
                await account.save();
            }
        }

        return done(null, user);

    } catch (err) {
        return done(err, null);
    }
}));

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, balance, password, dob, aadhaarNumber, gender } = req.body;

    if (!name || !email || !phone || !password || !dob || !aadhaarNumber || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (aadhaarNumber.length !== 12 || !/^\d+$/.test(aadhaarNumber)) {
      return res.status(400).json({ message: "Aadhaar number must be exactly 12 digits" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate unique 10-digit account number start with '10'
    const accountNumber = "10" + Math.floor(10000000 + Math.random() * 90000000).toString();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      balance,
      password: hashedPassword,
      dob,
      aadhaarNumber,
      gender,
      accountNumber
    });

    await user.save();

    res.json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
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

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_banking_secret",
      { expiresIn: "1h" }
    );   

    res.json({
      message: "Login successful",
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
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});
/* ================= GOOGLE LOGIN ================= */

// Step 1: Redirect user to Google
router.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google callback
router.get("/auth/google/callback",
    passport.authenticate("google", { session: false }),
    async (req, res) => {

        const user = req.user;

        // Generate JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "default_banking_secret",
            { expiresIn: "1h" }
        );

        // Redirect to frontend with token
        res.redirect(`/dashboard.html?token=${token}`);
    }
);
      
      

module.exports = router;