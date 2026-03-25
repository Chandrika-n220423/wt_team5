/**
 * auth.js
 * Handles Registration, Login, OTP simulation and Session Management
 */

const API_URL = "http://localhost:5000/api";
const SESSION_KEY = "nexusSession";

/* ===============================
   USER REGISTRATION
================================ */





async function handleRegistration(e){

  e.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const balance = document.getElementById("regBalance").value;
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword")?.value;
  const dob = document.getElementById("regDob").value;
  const aadhaarNumber = document.getElementById("regAadhaar").value.trim();
  const gender = document.getElementById("regGender").value;
  const errorDiv = document.getElementById("regGlobalError");

  if (confirmPassword !== undefined && password !== confirmPassword) {
    if (errorDiv) { errorDiv.innerText = "Passwords do not match."; errorDiv.style.display = "block"; }
    return;
  }

  if (errorDiv) { errorDiv.style.display = "none"; }

  try{

    const response = await fetch(`${API_URL}/register`,{

      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        balance,
        password,
        dob,
        aadhaarNumber,
        gender
      })

    });

    const data = await response.json();

    if(response.ok){
      // Registration submitted — redirect to login with pending status
      window.location.href = "login.html?status=pending&email=" + encodeURIComponent(email);
    } else if (data.status === "pending") {
      if (errorDiv) { errorDiv.innerText = "A registration request with this email is already pending approval."; errorDiv.style.display = "block"; }
    } else if (data.status === "rejected") {
      if (errorDiv) { errorDiv.innerText = "Your previous registration was rejected. Please contact the bank."; errorDiv.style.display = "block"; }
    } else {
      if (errorDiv) { errorDiv.innerText = data.message || "Registration failed."; errorDiv.style.display = "block"; }
    }

  }catch(error){
    console.error(error);
    if (errorDiv) { errorDiv.innerText = "Server error. Please try again."; errorDiv.style.display = "block"; }
  }

}

/* ===============================
   FORGOT PASSWORD
================================ */

async function handleForgotPassword(e) {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim();
  const newPassword = document.getElementById("forgotNewPassword").value;
  const confirmPassword = document.getElementById("forgotConfirmPassword").value;
  const errorDiv = document.getElementById("forgotError");
  const successDiv = document.getElementById("forgotSuccess");

  errorDiv.style.display = "none";
  successDiv.style.display = "none";

  if (!email || !newPassword || !confirmPassword) {
    showError(errorDiv, "All fields are required.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showError(errorDiv, "Passwords do not match.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      successDiv.innerText = "Password reset successfully. Redirecting to login...";
      successDiv.style.display = "block";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      showError(errorDiv, data.message || "Failed to reset password.");
    }
  } catch (error) {
    showError(errorDiv, "Server error. Please try again later.");
  }
}

/* ===============================
   LOGIN WITH PASSWORD
================================ */

async function handleFinalLogin(e){

    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorDiv = document.getElementById("loginError");
    const statusBanner = document.getElementById("loginStatusBanner");

    errorDiv.style.display="none";
    if (statusBanner) statusBanner.style.display = "none";

    if(!email || !password){
        showError(errorDiv,"Please enter email and password");
        return;
    }

    try{

        const response = await fetch(`${API_URL}/login`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if(response.ok && data.status === "active"){
            // Sync with frontend legacy localStorage array so app.js doesn't crash
            let mockUsers = JSON.parse(localStorage.getItem('nexusUsers')) || [];
            let userId = data.user?.id || data.user?._id || data.userId || data.token;
            let existing = mockUsers.find(u => u.id === userId);
            if (!existing && data.user) {
                 mockUsers.push({
                     id: userId,
                     name: data.user.name,
                     email: data.user.email,
                     phone: data.user.phone,
                     balance: data.user.balance || 0,
                     dob: data.user.dob,
                     aadhaarNumber: data.user.aadhaarNumber,
                     gender: data.user.gender,
                     accountNumber: data.user.accountNumber,
                     transactions: [],
                     notifications: []
                 });
                 localStorage.setItem('nexusUsers', JSON.stringify(mockUsers));
            }
            startSession(userId, data.token);
        } else if (response.status === 403 && data.status === "pending") {
            showStatusBanner(statusBanner, "pending", data.message);
        } else if (response.status === 403 && data.status === "rejected") {
            showStatusBanner(statusBanner, "rejected", data.message);
        } else {
            showError(errorDiv, data.message || "Invalid credentials");
        }

    }catch(err){
        showError(errorDiv,"Server error. Please try again later.");
    }

}


/* ===============================
   START SESSION
================================ */

function startSession(userId, tokenstr){

    const token = tokenstr || ("token_" + Math.random().toString(36).substr(2));

    const session = {

        userId:userId,
        token:token,
        expiresAt: Date.now() + (1000 * 60 * 60 * 24) // 24 hours to match backend expiresIn: "1d"

    };

    localStorage.setItem(SESSION_KEY,JSON.stringify(session));

    window.location.href="dashboard.html";

}

/* ===============================
   LOGOUT
================================ */

function logout(){

    localStorage.removeItem(SESSION_KEY);

    window.location.href="login.html";

}

/* ===============================
   PROTECT DASHBOARD
================================ */
function requireAuth(){

    // ✅ Step 1: Check token from URL (Google login)
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
        try {
            const payload = JSON.parse(atob(tokenFromUrl.split('.')[1]));

            const session = {
                userId: payload.id,
                token: tokenFromUrl,
                expiresAt: Date.now() + (1000 * 60 * 60 * 24)
            };

            localStorage.setItem(SESSION_KEY, JSON.stringify(session));

            // Clean URL
            window.history.replaceState({}, document.title, "/dashboard.html");

        } catch (err) {
            console.error("Invalid token from Google");
        }
    }

    // ✅ Step 2: Normal session check
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    if(!session || Date.now() > session.expiresAt){
        localStorage.removeItem(SESSION_KEY);
        window.location.href="login.html";
        return null;
    }

    return session.userId;
}

/* ===============================
   REDIRECT IF ALREADY LOGIN
================================ */

function redirectIfAuthenticated(){

    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    if(session && Date.now() < session.expiresAt){

        window.location.href="dashboard.html";

    }

}

/* ===============================
   SHOW ERROR
================================ */

function showError(element,message){

    element.innerText = message;

    element.style.display="block";

}

/* ===============================
   SHOW STATUS BANNER (Accountant Approval)
================================ */

function showStatusBanner(element, status, message) {
    if (!element) return;

    const configs = {
        pending: {
            bg: "rgba(245, 166, 35, 0.12)",
            border: "rgba(245, 166, 35, 0.5)",
            icon: "fa-clock",
            iconColor: "#f5a623",
            badgeText: "Pending",
            badgeBg: "rgba(245, 166, 35, 0.2)",
            badgeColor: "#c47d0e"
        },
        rejected: {
            bg: "rgba(255, 59, 48, 0.1)",
            border: "rgba(255, 59, 48, 0.4)",
            icon: "fa-times-circle",
            iconColor: "#ff3b30",
            badgeText: "Rejected",
            badgeBg: "rgba(255, 59, 48, 0.15)",
            badgeColor: "#cc2d24"
        },
        approved: {
            bg: "rgba(52, 199, 89, 0.1)",
            border: "rgba(52, 199, 89, 0.4)",
            icon: "fa-check-circle",
            iconColor: "#34c759",
            badgeText: "Approved",
            badgeBg: "rgba(52, 199, 89, 0.15)",
            badgeColor: "#2a9e47"
        }
    };

    const c = configs[status] || configs.pending;

    element.innerHTML = `
        <div style="display:flex; align-items:flex-start; gap:12px;">
            <i class="fas ${c.icon}" style="color:${c.iconColor}; font-size:1.3rem; margin-top:2px; flex-shrink:0;"></i>
            <div>
                <span style="display:inline-block; padding:2px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; letter-spacing:0.5px; background:${c.badgeBg}; color:${c.badgeColor}; margin-bottom:6px; text-transform:uppercase;">
                    ${c.badgeText}
                </span>
                <p style="margin:0; font-size:0.92rem; color:var(--text-main);">${message}</p>
            </div>
        </div>
    `;
    element.style.cssText = `display:block; background:${c.bg}; border:1px solid ${c.border}; border-radius:10px; padding:14px 16px; margin-bottom:16px;`;
}


/* ===============================
   AUTO CHECK LOGIN
================================ */

if(window.location.pathname.includes("login.html") ||
   window.location.pathname.includes("register.html")){

    redirectIfAuthenticated();

}