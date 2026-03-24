async function testUpdate() {
    // Attempting to update a hypothetical user who registered with ramyasri@gmail.com
    const payload = {
        name: "Ramya Sri",
        email: "ramyasri12@gmail.com",
        phone: "9876543210",
        dob: "2000-01-01",
        gender: "Female",
        oldEmail: "ramyasri@gmail.com"
    };

    try {
        const res = await fetch('http://localhost:5000/api/admin/force-update-user/U123456', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch(err) {
        console.error(err);
    }
}

testUpdate();
