/**
 * app.js
 * Handles Dashboard UI interactions, view routing, data loading, 
 * transfers, QR, and Charts simulation.
 */

// We assume `currentUserId` is defined globally via auth.js requireAuth() check on the page
let currentUser = null;
let allUsers = [];

// Initialize Dashboard when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Determine active nav item or default to dashboard
    loadUserData();
    setupThemeToggle();
    setupNavigation();
    setupSidebarToggle();
    setupForms();
});

/**
 * Data Loading
 */
function loadUserData() {
    allUsers = JSON.parse(localStorage.getItem('nexusUsers')) || [];
    currentUser = allUsers.find(u => u.id === currentUserId);

    if (!currentUser) {
        logout();
        return;
    }

    // Populate Topbar & Dashboard specific generic user points
    document.getElementById('topbarName').innerText = currentUser.name;
    document.getElementById('dashWaveName').innerText = currentUser.name.split(' ')[0];

    setAvatar(currentUser.name, currentUser.profilePic);

    // Populate Data
    updateBalanceDisplay();
    populateRecentTransactions();
    populateFullHistory();
    populateProfileForm();
    updateNotificationsBadge();
    populateNotifications();
    setupCharts();
    
    // Fetch and populate Loans from Backend
    populateLoans();

    // Generate QR
    generateMyQR();
}

function setAvatar(name, picUrl) {
    const defaultInitial = name.charAt(0).toUpperCase();

    const els = ['topbarAvatar', 'profileAvatarBig'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (picUrl) {
                el.innerHTML = `<img src="${picUrl}" alt="${name}">`;
            } else {
                el.innerHTML = defaultInitial;
            }
        }
    });
}

function saveUserData() {
    const index = allUsers.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
        allUsers[index] = currentUser;
        localStorage.setItem('nexusUsers', JSON.stringify(allUsers));
    }
}

/**
 * View Routing & Navigation
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active from all
            navItems.forEach(n => n.classList.remove('active'));
            // Add to clicked
            item.classList.add('active');

            // Hide all sections
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
            // Show target
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Close sidebar on mobile after clicking
            if (window.innerWidth <= 992) {
                document.getElementById('sidebar').classList.remove('mobile-open');
                document.getElementById('sidebarOverlay').classList.remove('active');
            }

            // Re-render specifics if needed
            if (targetId === 'view-analytics') { setupCharts(); }
        });
    });
}

function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleMobile() {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
    }

    toggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 992) { toggleMobile(); }
        else { sidebar.classList.toggle('collapsed'); }
    });

    closeBtn.addEventListener('click', toggleMobile);
    overlay.addEventListener('click', toggleMobile);
}

/**
 * Sub-Feature: Profiles
 */
function populateProfileForm() {
    document.getElementById('profName').value = currentUser.name;
    document.getElementById('profEmail').value = currentUser.email;
    document.getElementById('profPhone').value = currentUser.phone;
}

function setupForms() {
    // Profile Edit
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser.name = document.getElementById('profName').value;
        currentUser.phone = document.getElementById('profPhone').value;
        saveUserData();
        loadUserData();

        const msg = document.getElementById('profMessage');
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
    });

    // Profile Picture mock
    document.getElementById('profilePicInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                currentUser.profilePic = re.target.result;
                saveUserData();
                loadUserData();
            };
            reader.readAsDataURL(file);
        }
    });

    // Transfer logic
    setupTransferLogic();

    // QR Pay logic
    setupQRPayLogic();

    // Loan logic
    setupLoanLogic();
}

/**
 * Sub-Feature: Money Transfer (UPI Style)
 */
function setupTransferLogic() {
    const verifyBtn = document.getElementById('verifyReceiverBtn');
    const phoneInput = document.getElementById('transPhone');
    const receiverDisplay = document.getElementById('receiverNameDisplay');
    const sendBtn = document.getElementById('sendMoneyBtn');

    let validReceiver = null;

    document.getElementById('transAvailableBal').innerText = formatMoney(currentUser.balance);

    // Reset receiver on input change
    phoneInput.addEventListener('input', () => {
        validReceiver = null;
        receiverDisplay.innerText = '';
        sendBtn.disabled = true;
    });

    verifyBtn.addEventListener('click', () => {
        document.getElementById('transError').style.display = 'none';
        const phone = phoneInput.value.trim();

        if (phone === currentUser.phone) {
            document.getElementById('transError').innerText = "Cannot transfer to yourself.";
            document.getElementById('transError').style.display = 'block';
            return;
        }

        allUsers = JSON.parse(localStorage.getItem('nexusUsers')) || [];
        const receiver = allUsers.find(u => u.phone === phone);

        if (receiver) {
            validReceiver = receiver;
            receiverDisplay.innerText = `Verified: ${receiver.name}`;
            sendBtn.disabled = false;
        } else {
            document.getElementById('transError').innerText = "Receiver not found.";
            document.getElementById('transError').style.display = 'block';
        }
    });

    document.getElementById('transferForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validReceiver) return;

        const errorDiv = document.getElementById('transError');
        const successDiv = document.getElementById('transSuccess');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        const amount = parseFloat(document.getElementById('transAmount').value);
        const desc = document.getElementById('transDesc').value || 'UPI Transfer';


        if (amount > currentUser.balance) {
            errorDiv.innerText = "Insufficient balance.";
            errorDiv.style.display = 'block';
            return;
        }

        // daily limits validation
        const todayStr = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        let todayTransferTotal = 0;
        
        currentUser.transactions.forEach(tx => {
            if (tx.date.startsWith(todayStr)) {
                todayCount++;
                if (tx.type === 'DEBIT') { // assumption: all DEBITS are transfers/payments
                    todayTransferTotal += tx.amount;
                }
            }
        });

        // Limit 2: max 20 per day
        if (todayCount >= 20) {
            errorDiv.innerText = "Daily limit of 20 transactions reached.";
            errorDiv.style.display = 'block';
            return;
        }

        // Limit 3: max 100000 total per day
        if (todayTransferTotal + amount > 100000) {
            errorDiv.innerText = `Maximum total transfer per day (₹100,000) exceeded. You can only transfer up to ₹${(100000 - todayTransferTotal).toFixed(2)} more today.`;
            errorDiv.style.display = 'block';
            return;
        }

        executeTransfer(validReceiver, amount, desc, 'UPI');

        // Reset form
        document.getElementById('transferForm').reset();
        validReceiver = null;
        receiverDisplay.innerText = '';
        sendBtn.disabled = true;

        successDiv.style.display = 'block';
        successDiv.classList.add('success-pop-anim');
        setTimeout(() => {
            successDiv.style.display = 'none';
            successDiv.classList.remove('success-pop-anim');
        }, 3000);
    });
}

function executeTransfer(receiver, amount, description, typeLabel) {
    // Deduct
    currentUser.balance -= amount;
    const txSender = {
        id: 'TX' + Date.now(),
        date: new Date().toISOString(),
        description: `To ${receiver.name} - ${description}`,
        type: 'DEBIT',
        amount: amount,
        counterparty: receiver.name
    };
    currentUser.transactions.unshift(txSender);

    // Add Notification to Sender
    addNotification(currentUser, `Sent ${formatMoney(amount)} to ${receiver.name}`);

    // Add to Receiver
    const recIndex = allUsers.findIndex(u => u.id === receiver.id);
    if (recIndex !== -1) {
        allUsers[recIndex].balance += amount;
        const txRec = {
            id: 'TX' + Date.now() + 'R',
            date: new Date().toISOString(),
            description: `From ${currentUser.name} - ${description}`,
            type: 'CREDIT',
            amount: amount,
            counterparty: currentUser.name
        };
        allUsers[recIndex].transactions.unshift(txRec);

        // Add Notification to Receiver
        addNotification(allUsers[recIndex], `Received ${formatMoney(amount)} from ${currentUser.name}`);
    }

    // Save state
    saveUserData();
    if (recIndex !== -1) {
        localStorage.setItem('nexusUsers', JSON.stringify(allUsers));
    }

    // Reload UI
    loadUserData();
}

/**
 * Sub-Feature: QR Logic
 */
function generateMyQR() {
    const qrContainer = document.getElementById('myQRCode');
    qrContainer.innerHTML = '';

    // Using qr.js / qrcode.js to generate
    new QRCode(qrContainer, {
        text: currentUser.id,
        width: 200,
        height: 200,
        colorDark: "#212121",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function downloadQR() {
    const canvas = document.querySelector("#myQRCode canvas");
    if (canvas) {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `QR_${currentUser.id}.png`;
        a.click();
    }
}

function setupQRPayLogic() {
    document.getElementById('qrPayForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const scannedId = document.getElementById('qrScannedId').value.trim();
        const amount = parseFloat(document.getElementById('qrAmount').value);
        const msg = document.getElementById('qrMessage');

        if (scannedId === currentUser.id) {
            msg.innerText = "Cannot pay yourself.";
            msg.style.color = "var(--danger)";
            return;
        }

        allUsers = JSON.parse(localStorage.getItem('nexusUsers')) || [];
        const receiver = allUsers.find(u => u.id === scannedId);

        if (!receiver) {
            msg.innerText = "Invalid QR / User not found.";
            msg.style.color = "var(--danger)";
            return;
        }

        if (amount > currentUser.balance) {
            msg.innerText = "Insufficient balance.";
            msg.style.color = "var(--danger)";
            return;
        }


        // daily limits validation
        const todayStr = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        let todayTransferTotal = 0;
        
        currentUser.transactions.forEach(tx => {
            if (tx.date.startsWith(todayStr)) {
                todayCount++;
                if (tx.type === 'DEBIT') { 
                    todayTransferTotal += tx.amount;
                }
            }
        });

        // Limit 2: max 20 per day
        if (todayCount >= 20) {
            msg.innerText = "Daily limit of 20 transactions reached.";
            msg.style.color = "var(--danger)";
            return;
        }

        // Limit 3: max 100000 total per day
        if (todayTransferTotal + amount > 100000) {
            msg.innerText = `Maximum total transfer per day (₹100,000) exceeded. Remaining limit: ₹${(100000 - todayTransferTotal).toFixed(2)}`;
            msg.style.color = "var(--danger)";
            return;
        }

        executeTransfer(receiver, amount, 'QR Payment', 'QR');

        msg.innerText = `Successfully paid ${formatMoney(amount)} to ${receiver.name}`;
        msg.style.color = "var(--success)";
        msg.classList.add('success-pop-anim');
        setTimeout(() => {
            msg.classList.remove('success-pop-anim');
            msg.innerText = '';
        }, 3000);
        document.getElementById('qrPayForm').reset();
    });
}

/**
 * Sub-Feature: Loans
 */
async function populateLoans() {
    try {
        const session = JSON.parse(localStorage.getItem('nexusSession'));
        if (!session || !session.token) return;

        const response = await fetch('http://localhost:5000/api/loans/my-loans', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch loans');
        const data = await response.json();
        
        currentUser.loans = data.loans || [];
        
        // Populate Status
        const statusDisp = document.getElementById('loanStatusDisplay');
        const activeLoan = currentUser.loans.find(l => l.status === 'Pending' || l.status === 'Approved');
        
        if (activeLoan) {
            statusDisp.innerHTML = `
                <div style="padding:16px; background:var(--bg-card); border-radius:8px; text-align:center; border: 1px solid var(--border-color);">
                    <h4 style="margin-bottom:8px;">${activeLoan.loanType} Loan</h4>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--text-main); margin-bottom:8px;">${formatMoney(activeLoan.amount)}</div>
                    <span class="badge-status ${activeLoan.status === 'Approved' ? 'badge-success' : (activeLoan.status === 'Rejected' ? 'badge-danger' : 'badge-warning')}">${activeLoan.status}</span>
                    <p style="margin-top:12px; font-size:0.9rem; color:var(--text-light);">Applied on: ${formatDateLong(activeLoan.date)}</p>
                </div>
            `;
        } else {
            statusDisp.innerHTML = `<p style="color:var(--text-light); text-align:center;">No active loans found.</p>`;
        }

        // Populate History Table
        const tbody = document.getElementById('loanHistoryTableBody');
        tbody.innerHTML = '';
        
        if (currentUser.loans.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-light);">No loan history</td></tr>`;
            return;
        }
        
        currentUser.loans.forEach(loan => {
            let badgeClass = 'badge-danger';
            if (loan.status === 'Approved') badgeClass = 'badge-success';
            if (loan.status === 'Pending') badgeClass = 'badge-warning';

            tbody.innerHTML += `
                <tr>
                    <td style="color:var(--text-light);">${formatDate(loan.date)}</td>
                    <td><strong>${loan.loanType}</strong></td>
                    <td style="font-weight:600;">${formatMoney(loan.amount)}</td>
                    <td><span class="badge-status ${badgeClass}">${loan.status}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error fetching loans:', error);
    }
}

function setupLoanLogic() {
    // EMI Calculator
    const calcEmiBtn = document.getElementById('calcEmiBtn');
    if (calcEmiBtn) {
        calcEmiBtn.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('emiAmount').value);
            const rate = parseFloat(document.getElementById('emiRate').value);
            const duration = parseInt(document.getElementById('emiDuration').value);
            
            if (!amount || !rate || !duration) return;
            
            const r = rate / (12 * 100);
            const emi = (amount * r * Math.pow(1 + r, duration)) / (Math.pow(1 + r, duration) - 1);
            
            document.getElementById('emiValue').innerText = emi.toFixed(2);
            document.getElementById('emiResult').style.display = 'block';
        });
    }

    // Loan Form Submission
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
        loanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('loanAmount').value);
            const loanType = document.getElementById('loanType').value;
            const monthlyIncome = parseFloat(document.getElementById('loanIncome').value);
            const employmentType = document.getElementById('loanEmployment').value;
            const durValue = parseInt(document.getElementById('loanDurationValue').value);
            const durUnit = document.getElementById('loanDurationUnit').value;
            
            const durationMonths = durUnit === 'Years' ? durValue * 12 : durValue;
            
            const msg = document.getElementById('loanMessage');
            const submitBtn = loanForm.querySelector('button[type="submit"]');
            
            msg.innerText = "Applying...";
            msg.style.color = "var(--text-light)";
            submitBtn.disabled = true;

            try {
                const session = JSON.parse(localStorage.getItem('nexusSession'));
                if (!session || !session.token) throw new Error('Unauthorized');
        
                const response = await fetch('http://localhost:5000/api/loans/apply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.token}`
                    },
                    body: JSON.stringify({
                        amount,
                        loanType,
                        monthlyIncome,
                        employmentType,
                        durationMonths
                    })
                });

                const data = await response.json();

                if (!response.ok) throw new Error(data.message || 'Failed to submit loan application');

                // Add Notification Locally
                addNotification(currentUser, `Loan application for ${formatMoney(amount)} submitted.`);
                saveUserData();
                
                // Refresh Loans UI from Backend
                await populateLoans();
                
                msg.innerText = "Loan application submitted successfully!";
                msg.style.color = "var(--success)";
                msg.classList.add('success-pop-anim');
                
                document.getElementById('loanForm').reset();
                
                setTimeout(() => {
                    msg.innerText = '';
                    msg.classList.remove('success-pop-anim');
                }, 3000);

            } catch (error) {
                msg.innerText = error.message;
                msg.style.color = "var(--danger)";
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Sub-Feature: Transactions & Balances
 */
function updateBalanceDisplay() {
    document.getElementById('dashBalance').innerText = formatMoney(currentUser.balance);
    document.getElementById('transAvailableBal').innerText = formatMoney(currentUser.balance);
}

function populateRecentTransactions() {
    const tbody = document.getElementById('recentTxTableBody');
    tbody.innerHTML = '';

    const recent = currentUser.transactions.slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-light);">No recent transactions</td></tr>`;
        return;
    }

    recent.forEach(tx => {
        const isCredit = tx.type === 'CREDIT';
        const amountStr = isCredit ? `+${formatMoney(tx.amount)}` : `-${formatMoney(tx.amount)}`;
        const amountColor = isCredit ? 'var(--success)' : 'var(--text-main)';

        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-light);">${formatDate(tx.date)}</td>
                <td><strong>${tx.description}</strong></td>
                <td><span class="badge-status ${isCredit ? 'badge-success' : 'badge-danger'}">${tx.type}</span></td>
                <td style="font-weight:600; color:${amountColor};">${amountStr}</td>
            </tr>
        `;
    });
}

function populateFullHistory() {
    const tbody = document.getElementById('fullHistoryTableBody');
    tbody.innerHTML = '';

    if (currentUser.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-light);">No transaction history</td></tr>`;
        return;
    }

    currentUser.transactions.forEach(tx => {
        const isCredit = tx.type === 'CREDIT';

        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace;">${tx.id}</td>
                <td>${formatDateLong(tx.date)}</td>
                <td>${tx.description}</td>
                <td><span class="badge-status ${isCredit ? 'badge-success' : 'badge-danger'}">${tx.type}</span></td>
                <td style="font-weight:600; color:${isCredit ? 'var(--success)' : 'var(--text-main)'};">
                    ${isCredit ? '+' : '-'}${formatMoney(tx.amount)}
                </td>
            </tr>
        `;
    });
}

/**
 * Sub-Feature: Statements
 */
function simulateDownload() {
    document.getElementById('downloadMsg').style.display = 'block';
    setTimeout(() => {
        document.getElementById('downloadMsg').style.display = 'none';

        // Simulating actual download by creating empty blob based on format
        const format = document.querySelector('input[name="format"]:checked').value;
        const blob = new Blob(["Simulated Document content"], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexus_statement_${Date.now()}.${format}`;
        a.click();
    }, 1500);
}

/**
 * Sub-Feature: Notifications
 */
function addNotification(userObj, messageStr) {
    if (!userObj.notifications) userObj.notifications = [];
    userObj.notifications.unshift({
        title: 'Transaction Alert',
        message: messageStr,
        date: new Date().toISOString(),
        read: false
    });
}

function updateNotificationsBadge() {
    if (!currentUser.notifications) currentUser.notifications = [];
    const unread = currentUser.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (unread > 0) {
        badge.innerText = unread;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function populateNotifications() {
    const cont = document.getElementById('notificationsContainer');
    cont.innerHTML = '';

    if (!currentUser.notifications || currentUser.notifications.length === 0) {
        cont.innerHTML = '<p style="color:var(--text-light);">No notifications at this time.</p>';
        return;
    }

    currentUser.notifications.forEach(n => {
        const bg = n.read ? 'var(--bg-card)' : '#f0f9ff'; // slight blue if unread
        cont.innerHTML += `
            <div class="dashboard-card" style="margin-bottom:0; background:${bg}; border-left: ${n.read ? '1px solid var(--border-color)' : '4px solid var(--primary)'};">
                <h4 style="margin-bottom:4px;">${n.title}</h4>
                <p style="color:var(--text-light); margin-bottom:8px;">${n.message}</p>
                <small style="color:var(--text-light);">${formatDateLong(n.date)}</small>
            </div>
        `;
    });
}

function markAllNotificationsRead() {
    if (currentUser.notifications) {
        currentUser.notifications.forEach(n => n.read = true);
        saveUserData();
        loadUserData();
    }
}

/**
 * Sub-Feature: Analytics (Chart.js)
 */
let balChartObj = null;
let typChartObj = null;

function setupCharts() {
    if (!document.getElementById('balanceChart')) return;

    // Prepare Data
    let credits = 0;
    let debits = 0;

    currentUser.transactions.forEach(tx => {
        if (tx.type === 'CREDIT') credits += tx.amount;
        if (tx.type === 'DEBIT') debits += tx.amount;
    });

    // Chart 1: Income vs Expense (Bar)
    const ctxBal = document.getElementById('balanceChart').getContext('2d');
    if (balChartObj) balChartObj.destroy();

    balChartObj = new Chart(ctxBal, {
        type: 'bar',
        data: {
            labels: ['Total Income', 'Total Expenses'],
            datasets: [{
                label: 'Amount ($)',
                data: [credits, debits],
                backgroundColor: ['#34c759', '#ff3b30'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // Chart 2: Tx Type Distribution (Pie)
    const ctxTyp = document.getElementById('typeChart').getContext('2d');
    if (typChartObj) typChartObj.destroy();

    let qrCount = 0;
    let upiCount = 0;
    currentUser.transactions.forEach(tx => {
        if (tx.description.includes('QR')) qrCount++;
        else upiCount++;
    });

    typChartObj = new Chart(ctxTyp, {
        type: 'doughnut',
        data: {
            labels: ['QR Payments', 'UPI Transfers/Other'],
            datasets: [{
                data: [qrCount, upiCount],
                backgroundColor: ['#212121', '#9e9e9e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}


/**
 * Helpers
 */
function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function formatDate(isoStr) {
    const d = new Date(isoStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateLong(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setupThemeToggle() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    if (!themeBtn || !themeIcon) return;
    
    // Check local storage for preference
    const savedTheme = localStorage.getItem('nexusTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        if (isDark) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('nexusTheme', 'dark');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('nexusTheme', 'light');
        }
        
        // Setup charts again so they adapt to new theme colors
        setupCharts();
    });
}
