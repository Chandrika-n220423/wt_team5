const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Important to read JSON body

// Connect Database
connectDB();

// Routes
app.use("/api", authRoutes);

// Test Route
app.get("/", (req, res) => {
    res.send("Mini Banking Backend Running");
});

// Start Server
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});