import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import Organization from '../../src/modules/organization/models/Organization.js';
import User from '../../src/modules/users/models/User.js';
import Employee from '../../src/modules/employees/models/Employee.js';
// import Department from '../../src/modules/departments/models/Department.js';
// import Designation from '../../src/modules/designations/models/Designation.js';
// import Location from '../../src/modules/locations/models/Location.js';
// import Shift from '../../src/modules/shifts/models/Shift.js';
import EmployeeProfileExtended from '../../src/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

vi.mock('axios');

let mongoServer;
let orgA_id;
let orgB_id;
let tokenA;
let tokenB;
let employeeA_id;
let employeeB_id;

describe('Skill Intelligence API (Phase 5C)', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Setup Orgs
    const orgA = await Organization.create({ name: 'Org A', domain: 'orga.com', code: 'ORGA', status: 'ACTIVE' });
    const orgB = await Organization.create({ name: 'Org B', domain: 'orgb.com', code: 'ORGB', status: 'ACTIVE' });
    orgA_id = orgA._id;
    orgB_id = orgB._id;

    // Setup Admins and Tokens
    const userA = await User.create({ organizationId: orgA_id, firstName: 'A', lastName: 'User', email: 'a@orga.com', passwordHash: 'hash', role: 'Super Admin' });
    const userB = await User.create({ organizationId: orgB_id, firstName: 'B', lastName: 'User', email: 'b@orgb.com', passwordHash: 'hash', role: 'Super Admin' });

    tokenA = jwt.sign({ userId: userA._id, organizationId: orgA_id, email: 'a@orga.com', role: 'Super Admin' }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: '1h' });
    tokenB = jwt.sign({ userId: userB._id, organizationId: orgB_id, email: 'b@orgb.com', role: 'Super Admin' }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: '1h' });

    // Setup Skills in Org A
    await Skill.create([
      { organizationId: orgA_id, canonicalName: 'Java', normalizedName: 'java', aliases: ['java 17'] },
      { organizationId: orgA_id, canonicalName: 'Apache Kafka', normalizedName: 'apache kafka', aliases: ['kafka'] }
    ]);

    // Setup Employee A
    const empAId = new mongoose.Types.ObjectId(); 
    await mongoose.connection.collection('employees').insertOne({ _id: empAId, organizationId: orgA_id, firstName: 'Emp', lastName: 'A', workEmail: 'empa@orga.com', employeeCode: 'EMP-A', status: 'ACTIVE' }); 
    employeeA_id = empAId;
    
    await EmployeeProfileExtended.create({
      organizationId: orgA_id,
      employeeId: employeeA_id,
      headline: 'Backend Engineer',
      summary: 'Experienced with Java and Kafka.',
      skills: [{ name: 'Java', category: 'BACKEND' }]
    });

    // Setup Employee B
    const empBId = new mongoose.Types.ObjectId(); 
    await mongoose.connection.collection('employees').insertOne({ _id: empBId, organizationId: orgB_id, firstName: 'Emp', lastName: 'B', workEmail: 'empb@orgb.com', employeeCode: 'EMP-B', status: 'ACTIVE' }); 
    employeeB_id = empBId;
    await EmployeeProfileExtended.create({
      organizationId: orgB_id,
      employeeId: employeeB_id,
      headline: 'Frontend Engineer'
    });

  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  describe('POST /api/v1/nexus/skills/extract', () => {
    it('should successfully extract and normalize text', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          skills: [
            { text: 'Java 17', confidence: 0.99, start: 0, end: 7 },
            { text: 'Spring Boot', confidence: 0.95, start: 10, end: 20 }
          ]
        }
      });

      const res = await request(app)
        .post('/api/v1/nexus/skills/extract')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'Java 17 and Spring Boot' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mentions).toHaveLength(2);
      
      const java = res.body.mentions.find(m => m.mention === 'Java 17');
      expect(java.canonicalSkill).toBe('Java');
      expect(java.matchType).toBe('ALIAS');

      const spring = res.body.mentions.find(m => m.mention === 'Spring Boot');
      expect(spring.matchType).toBe('UNKNOWN'); // Not seeded
    });

    it('handles GLiNER2 failure gracefully', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));

      const res = await request(app)
        .post('/api/v1/nexus/skills/extract')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'Java' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mentions).toEqual([]); // gracefully empty
    });
  });

  describe('POST /api/v1/nexus/employees/:id/skill-analysis', () => {
    it('analyzes employee data without persisting new skills', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          skills: [
            { text: 'Java', confidence: 0.99, start: 0, end: 4 },
            { text: 'Kafka', confidence: 0.98, start: 5, end: 10 }
          ]
        }
      });

      const res = await request(app)
        .post(`/api/v1/nexus/employees/${employeeA_id}/skill-analysis`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.employeeId).toBe(employeeA_id.toString());
      expect(res.body.mentions).toHaveLength(2);

      const java = res.body.mentions.find(m => m.mention === 'Java');
      expect(java.canonicalSkill).toBe('Java');
      
      const kafka = res.body.mentions.find(m => m.mention === 'Kafka');
      expect(kafka.canonicalSkill).toBe('Apache Kafka');

      // Verify no changes to DB
      const profile = await EmployeeProfileExtended.findOne({ employeeId: employeeA_id });
      expect(profile.skills).toHaveLength(1); // Still 1
      expect(profile.skills[0].name).toBe('Java');
    });

    it('rejects cross-tenant access', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${employeeB_id}/skill-analysis`)
        .set('Authorization', `Bearer ${tokenA}`);

      // User A trying to analyze Employee B should fail
      expect(res.status).toBe(404);
    });
  });
});
