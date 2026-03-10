-- NovaBank Mini Digital Banking - SQL Schema

-- 1) Create database
CREATE DATABASE IF NOT EXISTS digital_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE digital_bank;

-- 2) Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3) Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    receiver_id INT NULL,
    type VARCHAR(40) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_receiver_id (receiver_id)
) ENGINE=InnoDB;

-- 4) Admins table
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(60) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- 5) OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expiry_time DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- 6) Optional: add foreign keys (can be enabled if desired)
-- ALTER TABLE transactions
--   ADD CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_tx_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL;

-- 7) Sample admin (username: admin / password: admin123)
INSERT INTO admins (username, password)
VALUES
('admin', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHeFx4Z4C/0u4s3f5vP1uGJ8CqXW1QGd5K');

-- 8) Sample users (password: user123 for all)
INSERT INTO users (name, email, password, balance, status, created_at) VALUES
('Aarav Mehta', 'aarav@example.com', '$2y$10$CwTycUXWue0Thq9StjUM0uJ8pP9n8YbQh6h6xTg7mqCqvZPz9pG1K', 25000.00, 'active', NOW()),
('Diya Sharma', 'diya@example.com', '$2y$10$CwTycUXWue0Thq9StjUM0uJ8pP9n8YbQh6h6xTg7mqCqvZPz9pG1K', 42000.00, 'active', NOW()),
('Rohan Singh', 'rohan@example.com', '$2y$10$CwTycUXWue0Thq9StjUM0uJ8pP9n8YbQh6h6xTg7mqCqvZPz9pG1K', 15000.00, 'active', NOW());

-- 9) Sample transactions
INSERT INTO transactions (user_id, receiver_id, type, amount, created_at) VALUES
(1, NULL, 'deposit', 10000.00, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(1, 2, 'transfer', 3000.00, DATE_SUB(NOW(), INTERVAL 9 DAY)),
(2, NULL, 'deposit', 20000.00, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(2, 3, 'transfer', 5000.00, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(3, NULL, 'withdraw', 2000.00, DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, NULL, 'atm_withdraw', 1500.00, DATE_SUB(NOW(), INTERVAL 5 DAY));

