<?php
require_once __DIR__ . '/php/functions.php';

require_login();

start_secure_session();
$userId       = (int)$_SESSION['user_id'];
$transactions = get_transactions_for_user($userId, 100);
$balance      = get_user_balance($userId);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transactions - NovaBank</title>
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
                <a href="deposit.php" class="nav-item">Deposit</a>
                <a href="withdraw.php" class="nav-item">Withdraw</a>
                <a href="transfer.php" class="nav-item">Transfer</a>
                <a href="qr_payment.php" class="nav-item">QR Payment</a>
                <a href="atm_simulator.php" class="nav-item">ATM Simulator</a>
                <a href="transactions.php" class="nav-item active">Transactions</a>
                <a href="logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>
        <main class="main-content">
            <header class="main-header">
                <h1>Transaction History</h1>
                <p>Current balance: ₹ <?php echo number_format($balance, 2); ?></p>
            </header>

            <section class="card table-card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Type</th>
                            <th>Amount (₹)</th>
                            <th>Receiver</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($transactions)): ?>
                            <tr>
                                <td colspan="5" class="text-center">No transactions yet.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($transactions as $t): ?>
                                <tr>
                                    <td><?php echo (int)$t['transaction_id']; ?></td>
                                    <td><?php echo e(ucwords(str_replace('_', ' ', $t['type']))); ?></td>
                                    <td><?php echo number_format($t['amount'], 2); ?></td>
                                    <td><?php echo $t['receiver_email'] ? e($t['receiver_email']) : '-'; ?></td>
                                    <td><?php echo e($t['created_at']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </section>
        </main>
    </div>
</body>
</html>

