const express = require("express");
const router = express.Router();
const Issue = require("../models/Issue");

// @route   POST /api/issues
// @desc    Submit a new issue/ticket
// @access  Public
router.post("/", async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        const issue = new Issue({
            name,
            email,
            message,
        });

        await issue.save();

        res.status(201).json({ message: "Issue submitted successfully", issue });
    } catch (error) {
        console.error("Error saving issue:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/issues
// @desc    Get all issues (for admin)
// @access  Public (should be protected in a real app)
router.get("/", async (req, res) => {
    try {
        const issues = await Issue.find().sort({ createdAt: -1 });
        res.json(issues);
    } catch (error) {
        console.error("Error fetching issues:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
