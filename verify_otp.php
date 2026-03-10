<?php
require_once __DIR__ . '/php/functions.php';
require_once __DIR__ . '/php/db.php';

start_secure_session();

$pdo  = getPDO();
$step = $_POST['step'] ?? '';

if ($step === 'request_otp') {
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Invalid email.';
    } else {
        $user = get_user_by_email($email);
        if ($user && password_verify($password, $user['password'])) {
            if ($user['status'] === 'blocked') {
                $error = 'Your account is blocked. Contact admin.';
            } else {
                $otp         = random_int(100000, 999999);
                $expiryTime  = (new DateTime('+5 minutes'))->format('Y-m-d H:i:s');

                $stmt = $pdo->prepare(
                    'INSERT INTO otp_codes (email, otp, expiry_time, created_at)
                     VALUES (:email, :otp, :expiry_time, NOW())'
                );
                $stmt->execute([
                    ':email'       => $email,
                    ':otp'         => $otp,
                    ':expiry_time' => $expiryTime,
                ]);

                $_SESSION['pending_login_email'] = $email;
                $info = 'Your OTP (for demo only) is: ' . $otp;
            }
        } else {
            $error = 'Invalid credentials.';
        }
    }
} elseif ($step === 'verify_otp') {
    $inputOtp = trim($_POST['otp'] ?? '');
    $email    = $_SESSION['pending_login_email'] ?? '';

    if ($email === '' || $inputOtp === '') {
        $error = 'Session expired or invalid OTP.';
    } else {
        $stmt = $pdo->prepare(
            'SELECT * FROM otp_codes
             WHERE email = :email
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();

        if (!$row) {
            $error = 'OTP not found. Please login again.';
        } else {
            $now = new DateTime();
            $exp = new DateTime($row['expiry_time']);

            if ($now > $exp) {
                $error = 'OTP expired. Please login again.';
            } elseif ($row['otp'] !== $inputOtp) {
                $error = 'Incorrect OTP.';
            } else {
                $user = get_user_by_email($email);
                if (!$user) {
                    $error = 'User not found.';
                } elseif ($user['status'] === 'blocked') {
                    $error = 'Your account is blocked. Contact admin.';
                } else {
                    $_SESSION['user_id']   = $user['id'];
                    $_SESSION['user_name'] = $user['name'];
                    unset($_SESSION['pending_login_email']);

                    header('Location: dashboard.php');
                    exit;
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification - NovaBank</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="auth-body">
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-header">
                <div class="logo">
                    <span class="logo-mark">N</span>
                    <span class="logo-text">NovaBank</span>
                </div>
                <h2>OTP Verification</h2>
                <p>Enter the 6-digit code sent to your email.<br>(Shown below for demo purposes.)</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="alert alert-error"><?php echo e($error); ?></div>
            <?php endif; ?>

            <?php if (!empty($info)): ?>
                <div class="alert alert-info"><?php echo e($info); ?></div>
            <?php endif; ?>

            <?php if (!empty($_SESSION['pending_login_email']) && empty($error) && ($step === 'request_otp' || $step === 'verify_otp')): ?>
                <form action="verify_otp.php" method="POST" class="auth-form">
                    <input type="hidden" name="step" value="verify_otp">

                    <div class="form-group">
                        <label for="otp">6-digit OTP</label>
                        <input type="text" id="otp" name="otp" pattern="\d{6}" maxlength="6" required>
                    </div>

                    <button type="submit" class="btn btn-primary btn-full">Verify &amp; Login</button>
                </form>
            <?php else: ?>
                <p class="auth-footer-text">
                    <a href="login.html">Back to Login</a>
                </p>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>

