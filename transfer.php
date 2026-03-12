<?php
require_once __DIR__ . '/php/functions.php';

require_login();

start_secure_session();
$userId  = (int)$_SESSION['user_id'];
$message = '';
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $receiverEmail = trim($_POST['receiver_email'] ?? '');
    $amount        = floatval($_POST['amount'] ?? 0);

    if (!filter_var($receiverEmail, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid receiver email.';
    } elseif ($amount <= 0) {
        $error = 'Amount must be greater than zero.';
    } else {
        $receiver = get_user_by_email($receiverEmail);
        if (!$receiver) {
            $error = 'Receiver not found.';
        } elseif ((int)$receiver['id'] === $userId) {
            $error = 'You cannot transfer to yourself.';
        } else {
            $result = transfer_money($userId, (int)$receiver['id'], $amount, 'transfer');
            if ($result['success']) {
                $message = $result['message'];
            } else {
                $error = $result['message'];
            }
        }
    }
}

$balance = get_user_balance($userId);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transfer - NovaBank</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="app-body">
    <div class="layout">
        <aside class="sidebar">
            <div class="logo sidebar-logo">
                <span class="logo-mark">N</span>
                <span class="logo-text">NovaBank</span>
            </div>
            <nav class="sidebar-nav">
                <a href="dashboard.php" class="nav-item">Dashboard</a>
                <a href="transfer.php" class="nav-item active">Transfer</a>
                <a href="qr_payment.php" class="nav-item">QR Payment</a>
                <a href="transactions.php" class="nav-item">Transactions</a>
                <a href="logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>
        <main class="main-content">
            <header class="main-header">
                <h1>UPI-style Transfer</h1>
                <p>Available balance: ₹ <?php echo number_format($balance, 2); ?></p>
            </header>
            <section class="card">
                <?php if ($error): ?>
                    <div class="alert alert-error"><?php echo e($error); ?></div>
                <?php endif; ?>
                <?php if ($message): ?>
                    <div class="alert alert-success"><?php echo e($message); ?></div>
                <?php endif; ?>

                <form method="POST" class="form">
                    <div class="form-group">
                        <label for="receiver_email">Receiver Email</label>
                        <input type="email" id="receiver_email" name="receiver_email" required>
                    </div>
                    <div class="form-group">
                        <label for="amount">Amount (₹)</label>
                        <input type="number" id="amount" name="amount" min="1" step="0.01" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Send Money</button>
                </form>
            </section>
        </main>
    </div>
</body>
</html>

