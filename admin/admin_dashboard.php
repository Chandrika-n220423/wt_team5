<?php
require_once __DIR__ . '/../php/functions.php';
require_once __DIR__ . '/../php/db.php';

require_admin();

start_secure_session();
$pdo = getPDO();

// Aggregate stats for admin view
$totalUsersStmt = $pdo->query('SELECT COUNT(*) AS c FROM users');
$totalUsers = (int)$totalUsersStmt->fetch()['c'];

$blockedUsersStmt = $pdo->query('SELECT COUNT(*) AS c FROM users WHERE status = "blocked"');
$blockedUsers = (int)$blockedUsersStmt->fetch()['c'];

$systemBalanceStmt = $pdo->query('SELECT SUM(balance) AS total_balance FROM users');
$systemBalanceRow = $systemBalanceStmt->fetch();
$systemBalance = $systemBalanceRow['total_balance'] !== null ? (float)$systemBalanceRow['total_balance'] : 0.0;

$totalTxStmt = $pdo->query('SELECT COUNT(*) AS c FROM transactions');
$totalTransactions = (int)$totalTxStmt->fetch()['c'];

$recentTxStmt = $pdo->query(
    'SELECT t.*, u.name AS user_name, u2.email AS receiver_email
     FROM transactions t
     LEFT JOIN users u ON t.user_id = u.id
     LEFT JOIN users u2 ON t.receiver_id = u2.id
     ORDER BY t.created_at DESC
     LIMIT 10'
);
$recentTransactions = $recentTxStmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - NovaBank</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body class="app-body">
    <div class="layout">
        <aside class="sidebar admin-sidebar">
            <div class="logo sidebar-logo">
                <span class="logo-mark">N</span>
                <span class="logo-text">NovaBank Admin</span>
            </div>
            <nav class="sidebar-nav">
                <a href="admin_dashboard.php" class="nav-item active">Dashboard</a>
                <a href="manage_users.php" class="nav-item">Manage Users</a>
                <a href="../logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>
        <main class="main-content">
            <header class="main-header">
                <h1>Admin Dashboard</h1>
                <p>Monitor the health of the NovaBank system.</p>
            </header>

            <section class="cards-row">
                <div class="card">
                    <h3>Total Users</h3>
                    <p class="stat-number"><?php echo $totalUsers; ?></p>
                </div>
                <div class="card">
                    <h3>Blocked Users</h3>
                    <p class="stat-number"><?php echo $blockedUsers; ?></p>
                </div>
                <div class="card">
                    <h3>System Balance</h3>
                    <p class="stat-number">₹ <?php echo number_format($systemBalance, 2); ?></p>
                </div>
                <div class="card">
                    <h3>Total Transactions</h3>
                    <p class="stat-number"><?php echo $totalTransactions; ?></p>
                </div>
            </section>

            <section class="card table-card">
                <h3>Recent Transactions</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Type</th>
                            <th>Amount (₹)</th>
                            <th>Receiver</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($recentTransactions)): ?>
                            <tr><td colspan="6" class="text-center">No transactions yet.</td></tr>
                        <?php else: ?>
                            <?php foreach ($recentTransactions as $t): ?>
                                <tr>
                                    <td><?php echo (int)$t['transaction_id']; ?></td>
                                    <td><?php echo e($t['user_name'] ?? 'Unknown'); ?></td>
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

