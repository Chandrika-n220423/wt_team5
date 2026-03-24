const jwt = require("jsonwebtoken");

exports.verifyUser = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");
    // use a fallback secret for development
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attaching decoded token payload (e.g. { id: user._id })
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

exports.isManager = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_banking_secret");
    
    if (decoded.role !== 'manager') {
      return res.status(403).json({ message: "Access denied. Manager privileges required." });
    }
    
    req.admin = decoded; // For backwards compatibility
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

exports.isCashier = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_banking_secret");
    
    if (decoded.role !== 'cashier') {
      return res.status(403).json({ message: "Access denied. Cashier privileges required." });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

// Alias for backwards compatibility with existing routes temporarily if needed
exports.verifyAdmin = exports.isManager;

