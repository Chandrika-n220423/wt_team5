const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
    userQuery: {
        type: String,
        required: true,
    },
    botResponse: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
