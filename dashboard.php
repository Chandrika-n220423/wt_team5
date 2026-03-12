<?php
require_once __DIR__ . '/php/functions.php';

require_login();

start_secure_session();
$userId   = (int)$_SESSION['user_id'];
$userName = $_SESSION['user_name'] ?? 'User';
$balance  = get_user_balance($userId);
$stats    = get_monthly_stats($userId);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - NovaBank</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="app-body">
    <div class="layout">
        <aside class="sidebar">
            <div class="logo sidebar-logo">
                <span class="logo-mark">N</span>
                <span class="logo-text">NovaBank</span>
            </div>
            <nav class="sidebar-nav">
                <a href="dashboard.php" class="nav-item active">Dashboard</a>
                <a href="transfer.php" class="nav-item">Transfer</a>
                <a href="qr_payment.php" class="nav-item">QR Payment</a>
                <a href="transactions.php" class="nav-item">Transactions</a>
                <a href="logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <div>
                    <h1>Welcome back, <?php echo e($userName); ?> 👋</h1>
                    <p>Your mini digital banking hub.</p>
                </div>
            </header>

            <section class="cards-row">
                <div class="card card-balance-main">
                    <div class="card-header">
                        <span>Current Balance</span>
                    </div>
                    <div class="card-body">
                        <h2>₹ <?php echo number_format($balance, 2); ?></h2>
                        <p>Available for all digital banking operations.</p>
                    </div>
                </div>
                <div class="card card-actions">
                    <h3>Quick Actions</h3>
                    <div class="quick-actions">
                        <a href="transfer.php" class="chip chip-blue">Transfer</a>
                        <a href="qr_payment.php" class="chip chip-purple">QR Pay</a>
                        <a href="transactions.php" class="chip chip-grey">History</a>
                    </div>
                </div>
            </section>

            <section class="charts-row">
                <div class="card">
                    <h3>Monthly Analytics</h3>
                    <canvas id="depositsWithdrawalsChart"></canvas>
                </div>
                <div class="card">
                    <h3>Transaction Volume</h3>
                    <canvas id="transactionsChart"></canvas>
                </div>
            </section>
        </main>
    </div>

    <script>
        window.NOVABANK_STATS = <?php echo json_encode($stats); ?>;
    </script>
    <script src="js/charts.js"></script>
</body>
</html>

