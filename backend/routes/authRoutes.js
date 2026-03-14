const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {

  try {

    const { name, email, phone, balance, password } = req.body;

    if(!name || !email || !phone || !password){
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });

    if(existingUser){
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      balance,
      password: hashedPassword
    });

    await user.save();

    res.json({ message: "User registered successfully", user });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }

});

module.exports = router;