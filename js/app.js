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
            if(targetId === 'view-analytics') { setupCharts(); }
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
        setTimeout(() => msg.style.display='none', 3000);
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
        receiverDisplay.innerText = '';
    });

    verifyBtn.addEventListener('click', () => {
        document.getElementById('transError').style.display='none';
        const email = phoneInput.value.trim();
        
        if(email === currentUser.email) {
            document.getElementById('transError').innerText = "Cannot transfer to yourself.";
            document.getElementById('transError').style.display = 'block';
            return;
        }

        // Mock verification - in a real app you'd hit an API to check if the user exists
        if(email) {
            validReceiver = { email }; // Set the object with email
            receiverDisplay.innerText = `Verified: ${email}`;
            sendBtn.disabled = false;
        } else {
             document.getElementById('transError').innerText = "Please enter an email.";
             document.getElementById('transError').style.display = 'block';
        }
    });

    document.getElementById('transferForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorDiv = document.getElementById('transError');
        const successDiv = document.getElementById('transSuccess');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        
        const email = phoneInput.value.trim();
        if(!email) {
            errorDiv.innerText = "Please enter an email.";
            errorDiv.style.display = 'block';
            return;
        }

        const amount = parseFloat(document.getElementById('transAmount').value);
        const desc = document.getElementById('transDesc').value || 'Transfer';
        
        if (amount > currentUser.balance) {
            errorDiv.innerText = "Insufficient balance.";
            errorDiv.style.display = 'block';
            return;
        }

        sendBtn.innerText = "Processing...";
        sendBtn.disabled = true;

        await executeTransfer(email, amount, desc);
        
        // Reset form
        document.getElementById('transferForm').reset();
        validReceiver = null;
        receiverDisplay.innerText = '';
        sendBtn.disabled = false;
        sendBtn.innerText = "Send Money";
        
        successDiv.style.display = 'block';
        setTimeout(() => successDiv.style.display='none', 3000);
    });
}

async function executeTransfer(toEmail, amount, description) {
    const session = JSON.parse(localStorage.getItem('nexusSession'));
    const token = session ? session.token : '';

    try {
        const response = await fetch(`${API_URL}/users/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ toEmail, amount })
        });

        const data = await response.json();

        if (response.ok) {
            // Success: Update the local balance
            currentUser.balance = data.balance;
            
            // Add a mock transaction item for immediate UI update
            const txSender = {
                id: data.transaction ? data.transaction._id : ('TX' + Date.now()),
                date: new Date().toISOString(),
                description: `Sent to ${toEmail} - ${description}`,
                type: 'DEBIT',
                amount: amount
            };
            currentUser.transactions.unshift(txSender);
            addNotification(currentUser, `Sent ${formatMoney(amount)} to ${toEmail}`);
            
            saveUserData();
            loadUserData();
        } else {
            const errorDiv = document.getElementById('transError');
            errorDiv.innerText = data.message || "Transfer failed.";
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error("Transfer Error:", error);
        const errorDiv = document.getElementById('transError');
        errorDiv.innerText = "Server error during transfer.";
        errorDiv.style.display = 'block';
    }
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
        colorDark : "#212121",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function downloadQR() {
    const canvas = document.querySelector("#myQRCode canvas");
    if(canvas) {
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
        
        if(!receiver) {
            msg.innerText = "Invalid QR / User not found.";
            msg.style.color = "var(--danger)";
            return;
        }
        
        if (amount > currentUser.balance) {
            msg.innerText = "Insufficient balance.";
            msg.style.color = "var(--danger)";
            return;
        }
        
        executeTransfer(receiver, amount, 'QR Payment', 'QR');
        
        msg.innerText = `Successfully paid ${formatMoney(amount)} to ${receiver.name}`;
        msg.style.color = "var(--success)";
        document.getElementById('qrPayForm').reset();
    });
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
    if(!userObj.notifications) userObj.notifications = [];
    userObj.notifications.unshift({
        title: 'Transaction Alert',
        message: messageStr,
        date: new Date().toISOString(),
        read: false
    });
}

function updateNotificationsBadge() {
    if(!currentUser.notifications) currentUser.notifications = [];
    const unread = currentUser.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if(unread > 0) {
        badge.innerText = unread;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function populateNotifications() {
    const cont = document.getElementById('notificationsContainer');
    cont.innerHTML = '';
    
    if(!currentUser.notifications || currentUser.notifications.length === 0) {
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
    if(currentUser.notifications) {
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
    if(!document.getElementById('balanceChart')) return;
    
    // Prepare Data
    let credits = 0;
    let debits = 0;
    
    currentUser.transactions.forEach(tx => {
        if(tx.type === 'CREDIT') credits += tx.amount;
        if(tx.type === 'DEBIT') debits += tx.amount;
    });

    // Chart 1: Income vs Expense (Bar)
    const ctxBal = document.getElementById('balanceChart').getContext('2d');
    if(balChartObj) balChartObj.destroy();
    
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
    if(typChartObj) typChartObj.destroy();
    
    let qrCount = 0;
    let upiCount = 0;
    currentUser.transactions.forEach(tx => {
        if(tx.description.includes('QR')) qrCount++;
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
    return `${d.getMonth()+1}/${d.getDate()}`;
}

function formatDateLong(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
