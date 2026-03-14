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

module.exports = router;

/* ===============================
   SEND OTP (LOGIN STEP 1)
================================ */

async function handleSendOtp(){

    const phone = document.getElementById("loginPhone").value.trim();
    const errorDiv = document.getElementById("loginError");
    const successDiv = document.getElementById("loginSuccess");

    errorDiv.style.display="none";
    successDiv.style.display="none";

    if(!phone){
        showError(errorDiv,"Enter phone number");
        return;
    }

    try{

        const response = await fetch(`${API_URL}/login`,{

            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },

            body: JSON.stringify({ phone })

        });

        const data = await response.json();

        if(response.ok){

            const mockedOtp = "123456";

            sessionStorage.setItem("expectedOtp",mockedOtp);
            sessionStorage.setItem("pendingUser",data.userId);

            successDiv.innerText = `OTP sent (Use: ${mockedOtp})`;
            successDiv.style.display="block";

            document.getElementById("otpGroup").style.display="block";

        }else{

            showError(errorDiv,data.message);

        }

    }catch(err){

        showError(errorDiv,"Server error");

    }

}

/* ===============================
   VERIFY OTP & LOGIN
================================ */

function handleFinalLogin(e){

    e.preventDefault();

    const enteredOtp = document.getElementById("loginOtp").value.trim();
    const expectedOtp = sessionStorage.getItem("expectedOtp");
    const userId = sessionStorage.getItem("pendingUser");

    const errorDiv = document.getElementById("loginError");

    errorDiv.style.display="none";

    if(!enteredOtp){
        showError(errorDiv,"Enter OTP");
        return;
    }

    if(enteredOtp !== expectedOtp){

        showError(errorDiv,"Invalid OTP");
        return;

    }

    sessionStorage.removeItem("expectedOtp");
    sessionStorage.removeItem("pendingUser");

    startSession(userId);

}

/* ===============================
   START SESSION
================================ */

function startSession(userId){

    const token = "token_" + Math.random().toString(36).substr(2);

    const session = {

        userId:userId,
        token:token,
        expiresAt: Date.now() + (1000 * 60 * 60 * 2)

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