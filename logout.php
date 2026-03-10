<?php
require_once __DIR__ . '/php/functions.php';

start_secure_session();

// Destroy session and redirect to home
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}
session_destroy();

header('Location: index.html');
exit;

