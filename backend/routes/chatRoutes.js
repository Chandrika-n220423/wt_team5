const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");

// To support environments below Node 18 seamlessly without an extra dependency, 
// using global.fetch. If not available, might need node-fetch, but typically recent Node has it.
const fetch = global.fetch;

// @route   POST /api/chat
// @desc    Process user queries and return AI / predefined responses
// @access  Public
router.post("/", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const query = message.toLowerCase();
        let botResponse = "";

        // 1. Predefined Quick Replies & Broad Keyword Matching
        if (query.includes("open account") || query.includes("create account") || query.includes("register") || query.includes("new account")) {
            botResponse = "To open a new Aurex account, please click on the 'Register' or 'Open an Account' button on our homepage to get started.";
        } else if (query.includes("transaction") || query.includes("payment") || query.includes("transfer") || query.includes("send money") || query.includes("pending")) {
            botResponse = "For transaction issues: Please wait up to 24 hours for pending transfers. If a payment failed and money was deducted, it will be automatically refunded to your account within 3-5 working days. You can also send money instantly via the UPI/QR sections in your Dashboard.";
        } else if (query.includes("login") || query.includes("password") || query.includes("sign in") || query.includes("forgot password")) {
            botResponse = "If you forgot your password or face login issues, please click the 'Forgot Password' link on the login page to securely reset your credentials.";
        } else if (query.includes("balance") || query.includes("statement") || query.includes("history") || query.includes("analytics")) {
            botResponse = "You can view your real-time account balance, analytics, and download comprehensive transaction history (CSV/PDF format) directly from your personalized Dashboard once logged in.";
        } else if (query.includes("loan") || query.includes("apply") || query.includes("emi")) {
             botResponse = "Aurex provides quick Personal, Education, and Home loans with competitive interest rates! Navigate to the 'Loans' section in your dashboard to check eligibility, calculate EMI, and apply instantly.";
        } else if (query.includes("card") || query.includes("debit card") || query.includes("credit card") || query.includes("lost card") || query.includes("block")) {
             botResponse = "To manage your debit/credit cards or report a lost card, please log in and navigate to 'Card Services', or call our 24/7 toll-free emergency number: +1 (800) 123-4567 to block it immediately.";
        } else if (query.includes("contact") || query.includes("customer care") || query.includes("support") || query.includes("phone number")) {
             botResponse = "You can reach our 24/7 human support team by calling +1 (800) 123-4567, emailing support@aurex.com, or using the 'Get in Touch' form on our Contact page.";
        } else if (query.includes("branch") || query.includes("location") || query.includes("address") || query.includes("atm")) {
             botResponse = "Our main branch is located at 123 Banking Street, Tech District, NY 10001. We also have partner ATMs nationwide with zero withdrawal fees for Aurex customers.";
        } else if (query.includes("fee") || query.includes("charges") || query.includes("minimum balance")) {
             botResponse = "Aurex prides itself on having 0% hidden fees! We do not require a minimum balance for standard accounts, making banking completely free and accessible for you.";
        } else if (query.includes("time") || query.includes("hours") || query.includes("open")) {
             botResponse = "Our digital banking and AI support are available 24/7. Physical branches operate Monday through Friday, 9:00 AM to 5:00 PM.";
        } else {
            // 2. Dynamic AI Response (Requires GEMINI_API_KEY in backend/.env)
            if (process.env.GEMINI_API_KEY) {
                try {
                    const https = require('https');
                    const postData = JSON.stringify({
                        contents: [{ parts: [{ text: `You are a helpful, professional AI assistant for a digital bank named Aurex. Be concise, max 1-2 short sentences. Answer the user: ${message}` }] }]
                    });

                    const options = {
                        hostname: 'generativelanguage.googleapis.com',
                        port: 443,
                        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData)
                        }
                    };

                    const aiResponseData = await new Promise((resolve, reject) => {
                        const reqAI = https.request(options, (resAI) => {
                            let rawData = '';
                            resAI.on('data', (chunk) => { rawData += chunk; });
                            resAI.on('end', () => { resolve(rawData); });
                        });
                        reqAI.on('error', (e) => { reject(e); });
                        reqAI.write(postData);
                        reqAI.end();
                    });

                    const data = JSON.parse(aiResponseData);
                    
                    if (data.candidates && data.candidates[0].content) {
                        botResponse = data.candidates[0].content.parts[0].text;
                    } else {
                        throw new Error("Invalid AI response: " + JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("AI API Error:", err.message);
                    botResponse = "I am currently experiencing technical difficulties processing your AI request. Our support team has been notified.";
                }
            } else {
                // Fallback if no key is provided
                botResponse = "I have securely recorded your query. Our human support team will review this and provide a solution to you shortly. You can also try clicking one of the common topics above!";
            }
        }

        // 3. Save to MongoDB Database (Chat History)
        const chatLog = new ChatMessage({
            userQuery: message,
            botResponse: botResponse
        });
        await chatLog.save();

        res.json({ response: botResponse });

    } catch (error) {
        console.error("Chat Backend Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// @route   GET /api/chat/history
// @desc    Get chat history directly from DB (Optional utility)
// @access  Public
router.get("/history", async (req, res) => {
    try {
        const history = await ChatMessage.find().sort({ timestamp: -1 }).limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve history" });
    }
});

module.exports = router;
