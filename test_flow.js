async function run() {
    console.log("1. Registering new user...");
    const regPayload = {
        name: "Test User",
        email: "test_a@example.com",
        phone: "1111111111",
        password: "password123",
        aadhaarNumber: "123456789012",
        dob: "1990-01-01",
        gender: "Male"
    };

    let res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regPayload)
    });
    console.log("Reg result:", res.status, await res.text());

    console.log("2. Accountant Force Updating email to test_b@example.com...");
    const updatePayload = {
        name: "Test User",
        email: "test_b@example.com",
        phone: "1111111111",
        dob: "1990-01-01",
        gender: "Male",
        oldEmail: "test_a@example.com"
    };
    
    // We pass a dummy ID since that matches local storage logic
    res = await fetch('http://localhost:5000/api/admin/force-update-user/U123456', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });
    const errorText = await res.text();
    console.log("Update result:", res.status);
    require('fs').writeFileSync('tmp_error.html', errorText);

    console.log("3. Logging in with new email...");
    res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "test_b@example.com", password: "password123" })
    });
    console.log("Login result:", res.status, await res.text());
}
run();
