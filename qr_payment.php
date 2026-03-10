<?php
require_once __DIR__ . '/php/functions.php';

require_login();

start_secure_session();
$userId   = (int)$_SESSION['user_id'];
$user     = get_user_by_id($userId);
$message  = '';
$error    = '';

// Simple QR payload uses receiver email + amount
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mode   = $_POST['mode'] ?? '';
    $amount = floatval($_POST['amount'] ?? 0);

    if ($mode === 'pay_with_qr') {
        $payload = trim($_POST['qr_payload'] ?? '');

        // Expected format: novabank|email@example.com
        $parts = explode('|', $payload);
        if (count($parts) !== 2 || $parts[0] !== 'novabank') {
            $error = 'Invalid QR payload.';
        } else {
            $receiverEmail = $parts[1];
            if (!filter_var($receiverEmail, FILTER_VALIDATE_EMAIL)) {
                $error = 'QR contains invalid email.';
            } elseif ($amount <= 0) {
                $error = 'Enter an amount greater than zero.';
            } else {
                $receiver = get_user_by_email($receiverEmail);
                if (!$receiver) {
                    $error = 'Receiver not found.';
                } elseif ((int)$receiver['id'] === $userId) {
                    $error = 'You cannot pay yourself.';
                } else {
                    $result = transfer_money($userId, (int)$receiver['id'], $amount, 'qr_payment');
                    if ($result['success']) {
                        $message = 'QR payment successful to ' . e($receiverEmail) . '.';
                    } else {
                        $error = $result['message'];
                    }
                }
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
    <title>QR Payment - NovaBank</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- Lightweight QR code generator -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
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
                <a href="deposit.php" class="nav-item">Deposit</a>
                <a href="withdraw.php" class="nav-item">Withdraw</a>
                <a href="transfer.php" class="nav-item">Transfer</a>
                <a href="qr_payment.php" class="nav-item active">QR Payment</a>
                <a href="atm_simulator.php" class="nav-item">ATM Simulator</a>
                <a href="transactions.php" class="nav-item">Transactions</a>
                <a href="logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>
        <main class="main-content">
            <header class="main-header">
                <h1>QR Code Payment</h1>
                <p>Share your QR to receive payments or scan another user’s QR to pay.</p>
                <p>Current balance: ₹ <?php echo number_format($balance, 2); ?></p>
            </header>

            <section class="cards-row qr-layout">
                <div class="card">
                    <h3>Your Receive QR</h3>
                    <p>This QR encodes your NovaBank email.</p>
                    <canvas id="userQrCanvas" class="qr-canvas"></canvas>
                    <p class="muted">Data: <code>novabank|<?php echo e($user['email']); ?></code></p>
                </div>

                <div class="card">
                    <h3>Pay Using QR</h3>
                    <?php if ($error): ?>
                        <div class="alert alert-error"><?php echo e($error); ?></div>
                    <?php endif; ?>
                    <?php if ($message): ?>
                        <div class="alert alert-success"><?php echo e($message); ?></div>
                    <?php endif; ?>

                    <form method="POST" class="form">
                        <input type="hidden" name="mode" value="pay_with_qr">

                        <div class="form-group">
                            <label for="qr_payload">Scanned QR Data</label>
                            <textarea id="qr_payload" name="qr_payload" rows="2" placeholder="Paste QR data here" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="amount">Amount (₹)</label>
                            <input type="number" id="amount" name="amount" min="1" step="0.01" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Pay Now</button>
                    </form>
                    <p class="muted">
                        In a production app you would scan the QR using the camera and decode it automatically.
                        For this mini project, copy the data string from a user’s QR and paste it here.
                    </p>
                </div>
            </section>
        </main>
    </div>

    <script>
        window.NOVABANK_USER_EMAIL = <?php echo json_encode($user['email']); ?>;
    </script>
    <script src="js/qr.js"></script>
</body>
</html>

