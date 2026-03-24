const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["open", "in-progress", "resolved"],
        default: "open",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Issue", issueSchema);
