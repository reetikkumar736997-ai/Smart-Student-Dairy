// Node 18+ has native fetch
const API_BASE = process.env.TEST_API_BASE || "http://localhost:5005/api";

async function testAuth() {
  console.log("Registering user...");
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User_" + Date.now(),
      email: "test_" + Date.now() + "@u.com",
      password: "password123",
      role: "student"
    })
  });
  
  const regData = await regRes.json();
  console.log("Register Response:", regData);

  if (regData.token) {
    console.log("Fetching /me with token:", regData.token.substring(0, 20) + "...");
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": `Bearer ${regData.token}` }
    });
    const meData = await meRes.json();
    console.log("/me Response:", meData);
  }
}

testAuth().catch(console.error);
