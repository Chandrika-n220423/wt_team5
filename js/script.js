// Core banking logic using localStorage (frontend simulation)

const STORAGE_KEYS = {
    USERS: 'bank_users',
    TRANSACTIONS: 'bank_transactions',
    SCHEDULES: 'bank_schedules',
    NOTIFICATIONS: 'bank_notifications',
    SESSION: 'bank_session',
    OTP: 'bank_pending_otp'
};

// Helper: get & set localStorage JSON
function getStore(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch {
        return defaultValue;
    }
}

function setStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Password hashing using Web Crypto SHA-256
async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utility: format money
function formatMoney(amount) {
    const n = Number(amount || 0);
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Utility: random ID
function randomId(prefix = 'TX') {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// Utility: now ISO string
function nowIso() {
    return new Date().toISOString();
}

// OTP helpers
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function setPendingOtp(email, otp) {
    const payload = { email, otp, createdAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEYS.OTP, JSON.stringify(payload));
}

function getPendingOtp() {
    const raw = sessionStorage.getItem(STORAGE_KEYS.OTP);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        if (Date.now() - data.createdAt > 5 * 60 * 1000) { // 5 minutes
            sessionStorage.removeItem(STORAGE_KEYS.OTP);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function clearPendingOtp() {
    sessionStorage.removeItem(STORAGE_KEYS.OTP);
}

// Session helpers
function setSession(email) {
    setStore(STORAGE_KEYS.SESSION, { email, loggedInAt: nowIso() });
}

function getSession() {
    return getStore(STORAGE_KEYS.SESSION, null);
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// User helpers
function findUser(email) {
    const users = getStore(STORAGE_KEYS.USERS, []);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function saveUser(user) {
    const users = getStore(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    setStore(STORAGE_KEYS.USERS, users);
}

function deleteUser(email) {
    let users = getStore(STORAGE_KEYS.USERS, []);
    users = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    setStore(STORAGE_KEYS.USERS, users);
}

// Transactions
function addTransaction(tx) {
    const txs = getStore(STORAGE_KEYS.TRANSACTIONS, []);
    txs.unshift(tx);
    setStore(STORAGE_KEYS.TRANSACTIONS, txs);
}

// Notifications
function addNotification(email, message) {
    const list = getStore(STORAGE_KEYS.NOTIFICATIONS, []);
    list.unshift({
        id: randomId('NT'),
        email,
        message,
        createdAt: nowIso(),
        read: false
    });
    setStore(STORAGE_KEYS.NOTIFICATIONS, list);
}

// Statement download (CSV)
function downloadStatementForUser(email) {
    const allTx = getStore(STORAGE_KEYS.TRANSACTIONS, []);
    const userTx = allTx.filter(tx => tx.from === email || tx.to === email);
    const header = ['Transaction ID', 'Type', 'Amount', 'From', 'To', 'Date'];
    const rows = userTx.map(tx => [
        `"${tx.id}"`,
        tx.type,
        tx.amount,
        `"${tx.from}"`,
        `"${tx.to}"`,
        new Date(tx.createdAt).toLocaleString()
    ]);

    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statement.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize default admin user (once)
(function initAdmin() {
    const users = getStore(STORAGE_KEYS.USERS, []);
    const adminEmail = 'admin@bank.com';
    if (!users.some(u => u.email === adminEmail)) {
        (async () => {
            const adminUser = {
                id: randomId('USR'),
                fullName: 'System Admin',
                email: adminEmail,
                phone: '+91 99999 00000',
                passwordHash: await hashPassword('Admin@123'),
                balance: 0,
                isBlocked: false,
                isAdmin: true,
                qrId: adminEmail
            };
            users.push(adminUser);
            setStore(STORAGE_KEYS.USERS, users);
        })();
    }
})();

// REGISTRATION PAGE
async function handleRegistration(e) {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const initialBalance = parseFloat(document.getElementById('initialBalance').value || '0');
    const acceptTerms = document.getElementById('acceptTerms').checked;

    if (!acceptTerms) {
        alert('Please accept the Terms & Conditions.');
        return;
    }
    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }
    if (findUser(email)) {
        alert('An account with this email already exists.');
        return;
    }
    if (!/^\+?\d[\d\s-]{7,}$/.test(phone)) {
        alert('Please enter a valid phone number.');
        return;
    }

    const passwordHash = await hashPassword(password);
    const user = {
        id: randomId('USR'),
        fullName,
        email,
        phone,
        passwordHash,
        balance: initialBalance || 0,
        isBlocked: false,
        isAdmin: false,
        qrId: email // QR ID = email for demo
    };
    saveUser(user);
    addNotification(email, `Welcome to Mini Digital Bank, ${fullName}!`);
    alert('Registration successful! You can now login.');
    window.location.href = 'login.html';
}

// LOGIN + OTP
async function handleLoginRequestOtp(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const user = findUser(email);
    if (!user) {
        alert('User not found. Please register first.');
        return;
    }
    if (user.isBlocked) {
        alert('This account is blocked. Contact admin.');
        return;
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
        alert('Invalid credentials.');
        return;
    }

    const otp = generateOtp();
    setPendingOtp(email, otp);

    // Simulate SMS OTP by showing it in alert for demo
    alert(`Demo OTP (sent to ${user.phone}): ${otp}`);
    document.getElementById('otpSection').classList.remove('hidden');
}

function handleLoginVerifyOtp() {
    const otpInput = document.getElementById('loginOtp').value.trim();
    if (!otpInput) {
        alert('Please enter the OTP.');
        return;
    }
    const pending = getPendingOtp();
    if (!pending) {
        alert('OTP expired or not requested. Please login again.');
        return;
    }
    if (pending.otp !== otpInput) {
        alert('Invalid OTP.');
        return;
    }
    clearPendingOtp();
    setSession(pending.email);
    window.location.reload();
}

// DASHBOARD INIT
function initDashboard() {
    const session = getSession();
    if (!session) return;

    const user = findUser(session.email);
    if (!user) return;

    const app = document.getElementById('app');
    const authLayer = document.getElementById('authLayer');
    if (app && authLayer) {
        authLayer.classList.add('hidden');
        app.classList.remove('hidden');
    }

    // Populate header
    const initials = user.fullName.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
    const userInitialsEl = document.getElementById('userInitials');
    const headerUserName = document.getElementById('headerUserName');
    const headerUserEmail = document.getElementById('headerUserEmail');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const accountBalanceEl = document.getElementById('accountBalance');

    if (userInitialsEl) userInitialsEl.textContent = initials || 'MB';
    if (headerUserName) headerUserName.textContent = user.fullName;
    if (headerUserEmail) headerUserEmail.textContent = user.email;
    if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.fullName.split(' ')[0]}`;
    if (accountBalanceEl) accountBalanceEl.textContent = `₹${formatMoney(user.balance)}`;

    // Stats
    const allTx = getStore(STORAGE_KEYS.TRANSACTIONS, []);
    const userTx = allTx.filter(tx => tx.from === user.email || tx.to === user.email);
    const scheduled = getStore(STORAGE_KEYS.SCHEDULES, []).filter(s => s.from === user.email);
    const notifications = getStore(STORAGE_KEYS.NOTIFICATIONS, []).filter(n => n.email === user.email);
    const unread = notifications.filter(n => !n.read);

    const totalTransactionsEl = document.getElementById('totalTransactions');
    const scheduledCountEl = document.getElementById('scheduledCount');
    const notificationCountEl = document.getElementById('notificationCount');
    if (totalTransactionsEl) totalTransactionsEl.textContent = userTx.length;
    if (scheduledCountEl) scheduledCountEl.textContent = scheduled.length;
    if (notificationCountEl) notificationCountEl.textContent = unread.length;

    // Profile form
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    if (profileName) profileName.value = user.fullName;
    if (profileEmail) profileEmail.value = user.email;
    if (profilePhone) profilePhone.value = user.phone;

    // Transactions table
    const txTbody = document.querySelector('#transactionsTable tbody');
    if (txTbody) {
        txTbody.innerHTML = '';
        userTx.forEach(tx => {
            const tr = document.createElement('tr');
            const typeLabel = tx.type === 'credit' ? 'Credit' : 'Debit';
            const counterparty = tx.type === 'credit' ? tx.from : tx.to;
            tr.innerHTML = `
                <td>${tx.id}</td>
                <td>${typeLabel}</td>
                <td class="${tx.type === 'credit' ? 'text-success' : 'text-danger'}">₹${formatMoney(tx.amount)}</td>
                <td>${counterparty}</td>
                <td>${new Date(tx.createdAt).toLocaleString()}</td>
            `;
            txTbody.appendChild(tr);
        });
    }

    // Schedule table
    refreshScheduleTable(user.email);

    // Notifications
    const notificationList = document.getElementById('notificationList');
    if (notificationList) {
        notificationList.innerHTML = '';
        notifications.forEach(n => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <div>${n.message}</div>
                    <div class="notification-meta">${new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <span class="badge ${n.read ? 'badge-muted' : 'badge-success'}">${n.read ? 'Read' : 'New'}</span>
            `;
            notificationList.appendChild(li);
        });
        // Mark all as read
        notifications.forEach(n => { n.read = true; });
        const all = getStore(STORAGE_KEYS.NOTIFICATIONS, []);
        all.forEach(a => {
            const match = notifications.find(n => n.id === a.id);
            if (match) a.read = true;
        });
        setStore(STORAGE_KEYS.NOTIFICATIONS, all);
    }

    // Admin visibility
    const adminBtn = document.querySelector('.nav-item.admin-only');
    if (adminBtn) {
        if (user.isAdmin) {
            adminBtn.classList.remove('hidden');
            initAdminPanel();
        } else {
            adminBtn.classList.add('hidden');
        }
    }

    // Charts
    if (window.initChartsForUser) {
        window.initChartsForUser(user.email);
    }

    // QR
    if (window.initQrForUser) {
        window.initQrForUser(user);
    }
}

// Schedule table refresh
function refreshScheduleTable(email) {
    const schedules = getStore(STORAGE_KEYS.SCHEDULES, []).filter(s => s.from === email);
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    schedules.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.to}</td>
            <td>₹${formatMoney(s.amount)}</td>
            <td>${new Date(s.date).toLocaleDateString()}</td>
            <td><button data-id="${s.id}" class="btn btn-ghost" style="font-size:0.75rem;padding:4px 8px;">Cancel</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// Section navigation & hamburger
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-section');
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sections.forEach(sec => {
                if (sec.id === `section-${target}`) sec.classList.add('active');
                else sec.classList.remove('active');
            });
        });
    });

    // Quick action buttons
    const quickBtns = document.querySelectorAll('.quick-btn[data-section]');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-section');
            const nav = document.querySelector(`.nav-item[data-section="${target}"]`);
            if (nav) nav.click();
        });
    });

    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }
}

// Transfers & QR payments share same logic
function performTransfer(fromEmail, toEmail, amount, note, sourceLabel) {
    const sender = findUser(fromEmail);
    const receiver = findUser(toEmail);
    if (!receiver) {
        alert('Receiver not found.');
        return false;
    }
    if (receiver.isBlocked) {
        alert('Receiver account is blocked.');
        return false;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
        alert('Enter a valid amount.');
        return false;
    }
    if (sender.balance < amt) {
        alert('Insufficient balance.');
        return false;
    }

    sender.balance -= amt;
    receiver.balance += amt;
    saveUser(sender);
    saveUser(receiver);

    const txId = randomId('TX');
    const createdAt = nowIso();

    addTransaction({
        id: txId,
        type: 'debit',
        amount: amt,
        from: sender.email,
        to: receiver.email,
        note: note || '',
        source: sourceLabel,
        createdAt
    });
    addTransaction({
        id: txId,
        type: 'credit',
        amount: amt,
        from: sender.email,
        to: receiver.email,
        note: note || '',
        source: sourceLabel,
        createdAt
    });

    addNotification(sender.email, `You sent ₹${formatMoney(amt)} to ${receiver.email} (${sourceLabel}).`);
    addNotification(receiver.email, `You received ₹${formatMoney(amt)} from ${sender.email} (${sourceLabel}).`);

    alert(`Successfully sent ₹${formatMoney(amt)} to ${receiver.email}.`);

    // Refresh dashboard values
    initDashboard();
    return true;
}

// Admin panel
function initAdminPanel() {
    const users = getStore(STORAGE_KEYS.USERS, []);
    const txs = getStore(STORAGE_KEYS.TRANSACTIONS, []);

    const adminTotalUsers = document.getElementById('adminTotalUsers');
    const adminSystemBalance = document.getElementById('adminSystemBalance');
    const adminTotalTransactions = document.getElementById('adminTotalTransactions');
    const adminUsersTableBody = document.querySelector('#adminUsersTable tbody');

    if (adminTotalUsers) adminTotalUsers.textContent = users.length;
    if (adminSystemBalance) {
        const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
        adminSystemBalance.textContent = formatMoney(totalBalance);
    }
    if (adminTotalTransactions) adminTotalTransactions.textContent = txs.length;

    if (adminUsersTableBody) {
        adminUsersTableBody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.email}</td>
                <td>${u.fullName}</td>
                <td>₹${formatMoney(u.balance)}</td>
                <td>
                    <span class="badge ${u.isBlocked ? 'badge-danger' : 'badge-success'}">
                        ${u.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                    ${u.isAdmin ? '<span class="badge badge-muted">Admin</span>' : ''}
                </td>
                <td>
                    <button class="btn btn-ghost" data-action="block" data-email="${u.email}" style="font-size:0.7rem;padding:4px 8px;">
                        ${u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    ${u.isAdmin ? '' : `
                    <button class="btn btn-ghost" data-action="delete" data-email="${u.email}" style="font-size:0.7rem;padding:4px 8px;">
                        Delete
                    </button>`}
                </td>
            `;
            adminUsersTableBody.appendChild(tr);
        });

        adminUsersTableBody.addEventListener('click', (e) => {
            const target = e.target.closest('button[data-action]');
            if (!target) return;
            const action = target.getAttribute('data-action');
            const email = target.getAttribute('data-email');
            if (action === 'block') {
                const user = findUser(email);
                if (!user) return;
                user.isBlocked = !user.isBlocked;
                saveUser(user);
                initAdminPanel();
                alert(`User ${email} is now ${user.isBlocked ? 'blocked' : 'active'}.`);
            } else if (action === 'delete') {
                if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
                deleteUser(email);
                initAdminPanel();
            }
        }, { once: true });
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Registration page
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            handleRegistration(e).catch(err => console.error(err));
        });
    }

    // Login page
    const loginForm = document.getElementById('loginForm');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const downloadStatementBtn = document.getElementById('downloadStatementBtn');
    const profileForm = document.getElementById('profileForm');
    const transferForm = document.getElementById('transferForm');
    const scheduleForm = document.getElementById('scheduleForm');
    const scheduleTableBody = document.querySelector('#scheduleTable tbody');
    const qrPayForm = document.getElementById('qrPayForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            handleLoginRequestOtp(e).catch(err => console.error(err));
        });
    }
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', handleLoginVerifyOtp);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearSession();
            window.location.href = 'index.html';
        });
    }
    if (downloadStatementBtn) {
        downloadStatementBtn.addEventListener('click', () => {
            const session = getSession();
            if (!session) return;
            downloadStatementForUser(session.email);
        });
    }

    // Profile update
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const session = getSession();
            if (!session) return;

            const user = findUser(session.email);
            if (!user) return;
            const newName = document.getElementById('profileName').value.trim();
            const newPhone = document.getElementById('profilePhone').value.trim();
            const newPassword = document.getElementById('profileNewPassword').value;

            if (!/^\+?\d[\d\s-]{7,}$/.test(newPhone)) {
                alert('Please enter a valid phone number.');
                return;
            }

            user.fullName = newName;
            user.phone = newPhone;
            if (newPassword) {
                user.passwordHash = await hashPassword(newPassword);
            }
            saveUser(user);
            addNotification(user.email, 'Your profile has been updated.');

            alert('Profile updated successfully.');
            document.getElementById('profileNewPassword').value = '';
            initDashboard();
        });
    }

    // Transfer form
    if (transferForm) {
        transferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const session = getSession();
            if (!session) return;
            const toEmail = document.getElementById('transferTo').value.trim();
            const amount = document.getElementById('transferAmount').value;
            const note = document.getElementById('transferNote').value.trim();
            if (performTransfer(session.email, toEmail, amount, note, 'UPI Transfer')) {
                transferForm.reset();
            }
        });
    }

    // QR Pay form
    if (qrPayForm) {
        qrPayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const session = getSession();
            if (!session) return;
            const qrIdInput = document.getElementById('qrIdInput').value.trim();
            const amount = document.getElementById('qrAmount').value;
            if (!qrIdInput) {
                alert('Enter a QR ID (email) or scan a QR code.');
                return;
            }
            if (performTransfer(session.email, qrIdInput, amount, 'QR Payment', 'QR Payment')) {
                qrPayForm.reset();
            }
        });
    }

    // Schedule form
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const session = getSession();
            if (!session) return;
            const fromEmail = session.email;
            const to = document.getElementById('scheduleTo').value.trim();
            const amount = parseFloat(document.getElementById('scheduleAmount').value || '0');
            const date = document.getElementById('scheduleDate').value;
            if (!findUser(to)) {
                alert('Receiver not found.');
                return;
            }
            if (!date) {
                alert('Please choose a date.');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('Enter a valid amount.');
                return;
            }

            const schedules = getStore(STORAGE_KEYS.SCHEDULES, []);
            schedules.push({
                id: randomId('SC'),
                from: fromEmail,
                to,
                amount,
                date
            });
            setStore(STORAGE_KEYS.SCHEDULES, schedules);
            addNotification(fromEmail, `Scheduled payment of ₹${formatMoney(amount)} to ${to} on ${new Date(date).toLocaleDateString()}.`);
            alert('Payment scheduled.');
            scheduleForm.reset();
            refreshScheduleTable(fromEmail);
            initDashboard();
        });
    }

    // Cancel scheduled payments
    if (scheduleTableBody) {
        scheduleTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-id]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            let schedules = getStore(STORAGE_KEYS.SCHEDULES, []);
            const session = getSession();
            const current = schedules.find(s => s.id === id);
            schedules = schedules.filter(s => s.id !== id);
            setStore(STORAGE_KEYS.SCHEDULES, schedules);
            if (session && current) {
                addNotification(session.email, `Cancelled scheduled payment to ${current.to}.`);
                refreshScheduleTable(session.email);
                initDashboard();
            }
        });
    }

    // Nav & Dashboard
    if (document.getElementById('app')) {
        setupNavigation();
        initDashboard();
    }
});