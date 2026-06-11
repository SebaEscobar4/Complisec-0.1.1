import axios from 'axios';

async function run() {
  try {
    const res = await axios.post('http://localhost:4000/api/soa', {
      organization_id: "b5a462be-885a-4cf1-b584-533694bba32c", // mock
      control_id: "23f9b16f-1ed0-491f-8f8d-4a3220048054", // mock
      is_applicable: true,
      justification: "Test",
      implementation_status: "PARTIAL",
      risk_profile_id: "b42c6b89-9132-4b8b-8079-5ada5c839fc6" // mock risk
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
run();
