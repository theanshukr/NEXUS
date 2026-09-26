const email = 'hr@dev.com';
const password = 'password123';
const baseUrl = 'http://localhost:5001/api/v1';

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    
    console.log('Fetching options...');
    const [depRes, desRes, locRes, shiftRes] = await Promise.all([
      fetch(`${baseUrl}/departments`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/designations`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/locations`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/shifts`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    
    const departments = (await depRes.json()).data.data || [];
    const designations = (await desRes.json()).data.data || [];
    const locations = (await locRes.json()).data.data || [];
    const shifts = (await shiftRes.json()).data.data || [];
    
    const engineeringDep = departments.find(d => d.name.includes('Engineering')) || departments[0];
    const devDesig = designations.find(d => d.name.includes('Senior Full Stack Developer')) || designations[0];
    const loc = locations[0];
    const shift = shifts[0];
    
    console.log('Creating employee...');
    const payload = {
      employeeCode: `EMP-TEST-${Math.floor(Math.random() * 1000)}`,
      firstName: 'Test',
      lastName: 'Employee',
      workEmail: 'test.employee@nexus.local',
      joiningDate: new Date().toISOString(),
      departmentId: engineeringDep._id,
      designationId: devDesig._id,
      locationId: loc._id,
      shiftId: shift._id,
      skills: [
        { name: 'Python', proficiency: 'Advanced', yearsOfExperience: 4 },
        { name: 'React', proficiency: 'Advanced', yearsOfExperience: 3 },
        { name: 'PostgreSQL', proficiency: 'Intermediate', yearsOfExperience: 2 },
        { name: 'Node.js', proficiency: 'Advanced', yearsOfExperience: 3 }
      ]
    };
    
    const empRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    
    const text = await empRes.text();
    console.log('Employee creation response:', empRes.status, text);
    
    if (empRes.ok) {
       console.log('Successfully created test employee!');
    }
  } catch (error) {
    console.error(error);
  }
}

run();

