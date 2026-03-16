require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoute");
const adminRoutes = require("./routes/adminRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Important to read JSON body

// Connect Database
connectDB();

// Routes
app.use("/api", authRoutes);  // keep original /register and /login if needed
app.use("/api/users", userRoutes); // mount new JWT-based user routes
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/loans", require("./routes/loanRoutes"));

// Test Route
app.get("/", (req, res) => {
    res.send("Mini Banking Backend Running");
});

// Error Handling Middleware (Should be after routes)
app.use(errorHandler);

// Start Server
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});