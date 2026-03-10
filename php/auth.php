<?php
// Handles registration and shared authentication-related operations.

require_once __DIR__ . '/functions.php';

start_secure_session();

$action = $_POST['action'] ?? '';

if ($action === 'register') {
    $name            = trim($_POST['name'] ?? '');
    $email           = trim($_POST['email'] ?? '');
    $password        = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    $initialBalance  = $_POST['initial_balance'] ?? '0';

    if ($password !== $confirmPassword) {
        header('Location: ../register.html?error=' . urlencode('Passwords do not match.'));
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header('Location: ../register.html?error=' . urlencode('Invalid email address.'));
        exit;
    }

    $amount = floatval($initialBalance);
    if ($amount < 0) {
        header('Location: ../register.html?error=' . urlencode('Initial balance cannot be negative.'));
        exit;
    }

    if (get_user_by_email($email)) {
        header('Location: ../register.html?error=' . urlencode('Email already registered.'));
        exit;
    }

    $created = create_user($name, $email, $password, $amount);
    if ($created) {
        header('Location: ../login.html?success=' . urlencode('Account created. Please login.'));
    } else {
        header('Location: ../register.html?error=' . urlencode('Registration failed. Please try again.'));
    }
    exit;
}

// If action not recognized, redirect to home.
header('Location: ../index.html');
exit;

