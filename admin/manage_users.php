<?php
require_once __DIR__ . '/../php/functions.php';
require_once __DIR__ . '/../php/db.php';

require_admin();

$pdo = getPDO();

// Handle actions (block, unblock, delete) with basic CSRF protection via query + POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;

    if ($userId > 0) {
        if ($action === 'block') {
            $stmt = $pdo->prepare('UPDATE users SET status = "blocked" WHERE id = :id');
            $stmt->execute([':id' => $userId]);
        } elseif ($action === 'unblock') {
            $stmt = $pdo->prepare('UPDATE users SET status = "active" WHERE id = :id');
            $stmt->execute([':id' => $userId]);
        } elseif ($action === 'delete') {
            // Delete transactions first to maintain referential integrity if FKs are added
            $stmt = $pdo->prepare('DELETE FROM transactions WHERE user_id = :id OR receiver_id = :id');
            $stmt->execute([':id' => $userId]);

            $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
            $stmt->execute([':id' => $userId]);
        }
    }
}

$usersStmt = $pdo->query('SELECT id, name, email, balance, status, created_at FROM users ORDER BY created_at DESC');
$users = $usersStmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users - NovaBank Admin</title>
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
                <a href="admin_dashboard.php" class="nav-item">Dashboard</a>
                <a href="manage_users.php" class="nav-item active">Manage Users</a>
                <a href="../logout.php" class="nav-item nav-danger">Logout</a>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Manage Users</h1>
                <p>View, block, or delete user accounts.</p>
            </header>

            <section class="card table-card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Balance (₹)</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($users)): ?>
                            <tr><td colspan="7" class="text-center">No users found.</td></tr>
                        <?php else: ?>
                            <?php foreach ($users as $u): ?>
                                <tr>
                                    <td><?php echo (int)$u['id']; ?></td>
                                    <td><?php echo e($u['name']); ?></td>
                                    <td><?php echo e($u['email']); ?></td>
                                    <td><?php echo number_format($u['balance'], 2); ?></td>
                                    <td>
                                        <span class="status-pill status-<?php echo e($u['status']); ?>">
                                            <?php echo e(ucfirst($u['status'])); ?>
                                        </span>
                                    </td>
                                    <td><?php echo e($u['created_at']); ?></td>
                                    <td class="table-actions">
                                        <?php if ($u['status'] === 'active'): ?>
                                            <form method="POST" class="inline-form">
                                                <input type="hidden" name="user_id" value="<?php echo (int)$u['id']; ?>">
                                                <input type="hidden" name="action" value="block">
                                                <button class="btn btn-small btn-danger" onclick="return confirm('Block this user?');">Block</button>
                                            </form>
                                        <?php else: ?>
                                            <form method="POST" class="inline-form">
                                                <input type="hidden" name="user_id" value="<?php echo (int)$u['id']; ?>">
                                                <input type="hidden" name="action" value="unblock">
                                                <button class="btn btn-small btn-outline">Unblock</button>
                                            </form>
                                        <?php endif; ?>
                                        <form method="POST" class="inline-form">
                                            <input type="hidden" name="user_id" value="<?php echo (int)$u['id']; ?>">
                                            <input type="hidden" name="action" value="delete">
                                            <button class="btn btn-small btn-dark" onclick="return confirm('Delete this user and their transactions?');">Delete</button>
                                        </form>
                                    </td>
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

