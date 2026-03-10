<?php
require_once __DIR__ . '/php/functions.php';

require_login();

start_secure_session();
$userId  = (int)$_SESSION['user_id'];
$step    = $_POST['step'] ?? 'insert_card';
$message = '';
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 'withdraw') {
    $amount = floatval($_POST['amount'] ?? 0);
    if ($amount <= 0) {
        $error = 'Amount must be greater than zero.';
    } else {
        $pdo = getPDO();
        $pdo->beginTransaction();
        try {
            $currentBalance = get_user_balance($userId);
            if ($currentBalance < $amount) {
                throw new Exception('Insufficient balance.');
            }
            $newBalance = $currentBalance - $amount;
            update_user_balance($userId, $newBalance, $pdo);
            record_transaction($userId, null, 'atm_withdraw', $amount, $pdo);
            $pdo->commit();
            $message = 'ATM withdrawal successful.';
        } catch (Exception $e) {
            $pdo->rollBack();
            $error = $e->getMessage();
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
    <title>ATM Simulator - NovaBank</title>
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
                <a href="atm_simulator.php" class="nav-item active">ATM Simulator</a>
                <a href="transactions.php" class="nav-item">Transactions</a>
                <a href="logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>ATM Simulator</h1>
                <p>Simulate basic ATM actions in a safe environment.</p>
            </header>

            <section class="card atm-card">
                <?php if ($error): ?>
                    <div class="alert alert-error"><?php echo e($error); ?></div>
                <?php endif; ?>
                <?php if ($message): ?>
                    <div class="alert alert-success"><?php echo e($message); ?></div>
                <?php endif; ?>

                <div class="atm-screen">
                    <?php if ($step === 'insert_card'): ?>
                        <h3>Insert Card</h3>
                        <p>Click below to insert your virtual card.</p>
                        <form method="POST">
                            <input type="hidden" name="step" value="enter_pin">
                            <button class="btn btn-primary">Insert Card</button>
                        </form>
                    <?php elseif ($step === 'enter_pin'): ?>
                        <h3>Enter PIN</h3>
                        <p>For demo, any 4-digit PIN will work.</p>
                        <form method="POST">
                            <input type="hidden" name="step" value="menu">
                            <div class="form-group">
                                <label for="pin">PIN</label>
                                <input type="password" id="pin" name="pin" maxlength="4" pattern="\d{4}" required>
                            </div>
                            <button class="btn btn-primary">Submit PIN</button>
                        </form>
                    <?php elseif ($step === 'menu'): ?>
                        <h3>ATM Menu</h3>
                        <p>Select an action.</p>
                        <div class="atm-menu">
                            <form method="POST">
                                <input type="hidden" name="step" value="check_balance">
                                <button class="btn btn-outline">Check Balance</button>
                            </form>
                            <form method="POST">
                                <input type="hidden" name="step" value="withdraw_form">
                                <button class="btn btn-primary">Withdraw Cash</button>
                            </form>
                            <form method="POST">
                                <input type="hidden" name="step" value="exit">
                                <button class="btn btn-dark">Exit</button>
                            </form>
                        </div>
                    <?php elseif ($step === 'check_balance'): ?>
                        <h3>Account Balance</h3>
                        <p>Available balance: ₹ <?php echo number_format($balance, 2); ?></p>
                        <form method="POST">
                            <input type="hidden" name="step" value="menu">
                            <button class="btn btn-primary">Back to Menu</button>
                        </form>
                    <?php elseif ($step === 'withdraw_form'): ?>
                        <h3>Withdraw Cash</h3>
                        <p>Available balance: ₹ <?php echo number_format($balance, 2); ?></p>
                        <form method="POST">
                            <input type="hidden" name="step" value="withdraw">
                            <div class="form-group">
                                <label for="amount">Amount (₹)</label>
                                <input type="number" id="amount" name="amount" min="1" step="0.01" required>
                            </div>
                            <button class="btn btn-primary">Withdraw</button>
                        </form>
                    <?php elseif ($step === 'exit'): ?>
                        <h3>Thank You</h3>
                        <p>Your card has been ejected.</p>
                        <form method="POST">
                            <input type="hidden" name="step" value="insert_card">
                            <button class="btn btn-primary">Start Again</button>
                        </form>
                    <?php endif; ?>
                </div>
            </section>
        </main>
    </div>
</body>
</html>

