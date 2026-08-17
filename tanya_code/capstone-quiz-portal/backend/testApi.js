const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create a valid token (using the secret from .env)
const token = jwt.sign({ id: '6a7cd620-e827-46a8-b9a6-78b730d61352', role: 'STUDENT' }, 'quiz_portal_jwt_secret_key_class_10_2026!');

async function main() {
  try {
    const res = await axios.get('http://localhost:5000/api/attempts/bb9ad59c-d716-41d0-8d56-66d5862428e3/results', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data.studentStanding, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
main();
