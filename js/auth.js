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
        password
      })

    });

    const data = await response.json();

    if(response.ok){
      alert("Registration successful");
      window.location.href="dashboard.html";
    }else{
      alert(data.message);
    }

  }catch(error){
    console.error(error);
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

    errorDiv.style.display="none";

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

        if(response.ok){
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
                     transactions: [],
                     notifications: []
                 });
                 localStorage.setItem('nexusUsers', JSON.stringify(mockUsers));
            }

            startSession(userId, data.token);
        }else{
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
   AUTO CHECK LOGIN
================================ */

if(window.location.pathname.includes("login.html") ||
   window.location.pathname.includes("register.html")){

    redirectIfAuthenticated();

}