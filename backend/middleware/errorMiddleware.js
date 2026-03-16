exports.errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    // In production, you might not want to send the full stack trace
    error: process.env.NODE_ENV === "production" ? {} : err
  });
};
