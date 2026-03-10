<?php
// Core helper and banking functions.

require_once __DIR__ . '/db.php';

/**
 * Starts a secure PHP session if not already started.
 */
function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

/**
 * Simple HTML escaping helper to prevent XSS when outputting.
 */
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/**
 * Fetch a user by email.
 */
function get_user_by_email(string $email): ?array
{
    $pdo = getPDO();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    return $user ?: null;
}

/**
 * Fetch a user by id.
 */
function get_user_by_id(int $id): ?array
{
    $pdo = getPDO();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    return $user ?: null;
}

/**
 * Creates a new user with a hashed password.
 */
function create_user(string $name, string $email, string $password, float $initialBalance): bool
{
    $pdo = getPDO();

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password, balance, status, created_at)
         VALUES (:name, :email, :password, :balance, :status, NOW())'
    );

    try {
        return $stmt->execute([
            ':name'     => $name,
            ':email'    => $email,
            ':password' => $hash,
            ':balance'  => $initialBalance,
            ':status'   => 'active',
        ]);
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * Records a transaction for a user (and optional receiver).
 */
function record_transaction(
    int $userId,
    ?int $receiverId,
    string $type,
    float $amount,
    PDO $pdo = null
): bool {
    $pdo = $pdo ?: getPDO();

    $stmt = $pdo->prepare(
        'INSERT INTO transactions (user_id, receiver_id, type, amount, created_at)
         VALUES (:user_id, :receiver_id, :type, :amount, NOW())'
    );

    return $stmt->execute([
        ':user_id'    => $userId,
        ':receiver_id'=> $receiverId,
        ':type'       => $type,
        ':amount'     => $amount,
    ]);
}

/**
 * Updates a user balance with proper validation.
 */
function update_user_balance(int $userId, float $newBalance, PDO $pdo = null): bool
{
    $pdo = $pdo ?: getPDO();
    $stmt = $pdo->prepare('UPDATE users SET balance = :balance WHERE id = :id');
    return $stmt->execute([
        ':balance' => $newBalance,
        ':id'      => $userId,
    ]);
}

/**
 * Fetches the current balance safely.
 */
function get_user_balance(int $userId): float
{
    $pdo = getPDO();
    $stmt = $pdo->prepare('SELECT balance FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ? (float)$row['balance'] : 0.0;
}

/**
 * Transfers money between two users in a single DB transaction.
 */
function transfer_money(int $senderId, int $receiverId, float $amount, string $type = 'transfer'): array
{
    $pdo = getPDO();
    $pdo->beginTransaction();

    try {
        if ($amount <= 0) {
            throw new Exception('Amount must be greater than zero.');
        }

        $senderBalance = get_user_balance($senderId);
        if ($senderBalance < $amount) {
            throw new Exception('Insufficient balance.');
        }

        $receiver = get_user_by_id($receiverId);
        if (!$receiver) {
            throw new Exception('Receiver not found.');
        }
        if ($receiver['status'] === 'blocked') {
            throw new Exception('Receiver account is blocked.');
        }

        $newSenderBalance = $senderBalance - $amount;
        $receiverBalance  = (float)$receiver['balance'] + $amount;

        update_user_balance($senderId, $newSenderBalance, $pdo);
        update_user_balance($receiverId, $receiverBalance, $pdo);

        record_transaction($senderId, $receiverId, $type, $amount, $pdo);

        $pdo->commit();
        return ['success' => true, 'message' => 'Transfer completed successfully.'];
    } catch (Exception $e) {
        $pdo->rollBack();
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

/**
 * Returns transactions for a given user.
 */
function get_transactions_for_user(int $userId, int $limit = 50): array
{
    $pdo = getPDO();
    $stmt = $pdo->prepare(
        'SELECT t.*, u2.email AS receiver_email
         FROM transactions t
         LEFT JOIN users u2 ON t.receiver_id = u2.id
         WHERE t.user_id = :uid
         ORDER BY t.created_at DESC
         LIMIT :limitVal'
    );
    $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':limitVal', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/**
 * Returns aggregated monthly stats for Chart.js.
 */
function get_monthly_stats(int $userId): array
{
    $pdo = getPDO();

    $stmt = $pdo->prepare(
        'SELECT 
            DATE_FORMAT(created_at, "%Y-%m") AS month,
            SUM(CASE WHEN type = "deposit" THEN amount ELSE 0 END) AS deposits,
            SUM(CASE WHEN type IN ("withdraw", "atm_withdraw") THEN amount ELSE 0 END) AS withdrawals,
            COUNT(*) AS total_transactions
         FROM transactions
         WHERE user_id = :uid
         GROUP BY DATE_FORMAT(created_at, "%Y-%m")
         ORDER BY month ASC'
    );
    $stmt->execute([':uid' => $userId]);
    return $stmt->fetchAll();
}

/**
 * Redirects to login if user is not authenticated.
 */
function require_login(): void
{
    start_secure_session();
    if (empty($_SESSION['user_id'])) {
        header('Location: login.html');
        exit;
    }
}

/**
 * Redirects to admin login if admin not authenticated.
 */
function require_admin(): void
{
    start_secure_session();
    if (empty($_SESSION['admin_id'])) {
        header('Location: admin/admin_login.php');
        exit;
    }
}

