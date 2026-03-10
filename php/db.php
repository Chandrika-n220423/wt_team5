<?php
// Database connection using PDO with error handling and prepared statements.

define('DB_HOST', 'localhost');
define('DB_NAME', 'digital_bank');
define('DB_USER', 'root');      // Change if your XAMPP MySQL user is different
define('DB_PASS', '');          // Set password if configured

/**
 * Returns a shared PDO instance.
 *
 * @return PDO
 */
function getPDO(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // In production you would log this instead of echoing it.
            die('Database connection failed: ' . htmlspecialchars($e->getMessage()));
        }
    }

    return $pdo;
}

