/**
 * auth.js
 * Handles mock registration, login, OTP simulation, and session management.
 */

// Initialize users array in localStorage if it doesn't exist
if (!localStorage.getItem('nexusUsers')) {
    localStorage.setItem('nexusUsers', JSON.stringify([]));
}

// Current session key
const SESSION_KEY = 'nexusSession';

/**
 * Handle User Registration
 */
function handleRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const phone = document.getElementById('regPhone').value.trim();
    const initialBalance = parseFloat(document.getElementById('regBalance').value);
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    const globalError = document.getElementById('regGlobalError');
    const passError = document.getElementById('passMismatchError');
    
    globalError.style.display = 'none';
    passError.style.display = 'none';
    
    // Basic validations
    if (password !== confirmPassword) {
        passError.style.display = 'block';
        return;
    }
    
    if (initialBalance < 0) {
        showError(globalError, 'Initial balance cannot be negative.');
        return;
    }

    let users = JSON.parse(localStorage.getItem('nexusUsers'));
    
    // Check if user already exists
    const userExists = users.some(u => u.email === email || u.phone === phone);
    if (userExists) {
        showError(globalError, 'An account with this email or phone number already exists.');
        return;
    }
    
    // Create new user object
    const newUser = {
        id: 'UX' + Date.now().toString().slice(-6),
        name: name,
        email: email,
        phone: phone,
        password: password, // In a real app, this MUST be hashed!
        balance: initialBalance,
        joinedAt: new Date().toISOString(),
        transactions: [],
        notifications: [{
            title: 'Welcome to NexusBank',
            message: 'Your account has been successfully created.',
            date: new Date().toISOString(),
            read: false
        }]
    };
    
    // Save user
    users.push(newUser);
    localStorage.setItem('nexusUsers', JSON.stringify(users));
    
    // Auto-login after registration
    startSession(newUser.id);
}

/**
 * Handle Send OTP Request (Step 1 of Login)
 */
function handleSendOtp() {
    const phone = document.getElementById('loginPhone').value.trim();
    const errorDiv = document.getElementById('loginError');
    const successDiv = document.getElementById('loginSuccess');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    if (!phone) {
        showError(errorDiv, 'Please enter a phone number.');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('nexusUsers')) || [];
    const user = users.find(u => u.phone === phone);
    
    if (!user) {
        showError(errorDiv, 'No account found with this phone number.');
        return;
    }
    
    // Simulate OTP sending
    const mockedOtp = '123456'; // Fixed OTP for demo purposes
    sessionStorage.setItem('expectedOtp', mockedOtp);
    sessionStorage.setItem('pendingOtpUserId', user.id);
    
    successDiv.innerText = `OTP sent to ${phone}. (Use: ${mockedOtp})`;
    successDiv.style.display = 'block';
    
    document.getElementById('otpGroup').style.display = 'block';
    
    const otpInput = document.getElementById('loginOtp');
    if (otpInput) {
        otpInput.focus();
    }
}

/**
 * Handle OTP Verification & Login (Step 2 of Login)
 */
function handleFinalLogin(e) {
    e.preventDefault();
    
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';
    
    const enteredOtp = document.getElementById('loginOtp').value.trim();
    const expectedOtp = sessionStorage.getItem('expectedOtp');
    const userId = sessionStorage.getItem('pendingOtpUserId');
    
    if (!enteredOtp) {
        showError(errorDiv, 'Please enter the OTP.');
        return;
    }
    
    if (enteredOtp !== expectedOtp) {
        showError(errorDiv, 'Invalid OTP. Please try again.');
        return;
    }
    
    // Clean up temp session storage
    sessionStorage.removeItem('expectedOtp');
    sessionStorage.removeItem('pendingOtpUserId');
    
    // Start true session
    startSession(userId);
}

/**
 * Start Session & Redirect
 */
function startSession(userId) {
    const sessionToken = 'token_' + Math.random().toString(36).substr(2) + Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: userId,
        token: sessionToken,
        expiresAt: Date.now() + (1000 * 60 * 60 * 2) // 2 hours expiry
    }));
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
}

/**
 * Logout
 */
function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

/**
 * Check Authentication status on protected pages
 * Should be called at the top of protected pages (like dashboard.html)
 */
function requireAuth() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!session || Date.now() > session.expiresAt) {
        // Not authenticated or session expired
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
        return null;
    }
    return session.userId;
}

/**
 * Check if user is already logged in (for login/register pages)
 */
function redirectIfAuthenticated() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session && Date.now() < session.expiresAt) {
        window.location.href = 'dashboard.html';
    }
}

// Utility function to display errors
function showError(element, message) {
    element.innerText = message;
    element.style.display = 'block';
}

// Auto-run checks if on auth pages
if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
    redirectIfAuthenticated();
}
