'use strict';

const request = require('supertest');
const app = require('../app');
const { pool } = require('../db/pool');

const TEST_USER_ID = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001';
let firstChallengeId = null;

beforeAll(async () => {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID, 'test@codeguard.com', 'test-hash', 'user']
  );
});

afterAll(async () => {
  await pool.end();
});

// -------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------
describe('GET /api/health', () => {
  test('returns 200 and status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

// -------------------------------------------------------
// CHALLENGES
// -------------------------------------------------------
describe('GET /api/challenges', () => {
  test('returns list of challenges with correct shape', async () => {
    const res = await request(app).get('/api/challenges');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('challenges');
    expect(Array.isArray(res.body.challenges)).toBe(true);
    if (res.body.challenges.length > 0) {
      firstChallengeId = res.body.challenges[0].id;
      const ch = res.body.challenges[0];
      expect(ch).toHaveProperty('id');
      expect(ch).toHaveProperty('title');
      expect(ch).toHaveProperty('difficulty');
    }
  });

  test('filters by difficulty=beginner', async () => {
    const res = await request(app).get('/api/challenges?difficulty=beginner');
    expect(res.status).toBe(200);
    res.body.challenges.forEach(ch => {
      expect(ch.difficulty).toBe('beginner');
    });
  });

  test('filters by difficulty=security', async () => {
    const res = await request(app).get('/api/challenges?difficulty=security');
    expect(res.status).toBe(200);
    res.body.challenges.forEach(ch => {
      expect(ch.difficulty).toBe('security');
    });
  });

  test('rejects invalid difficulty filter with 400', async () => {
    const res = await request(app).get('/api/challenges?difficulty=expert');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/challenges/:id', () => {
  test('returns a single challenge with starter_code', async () => {
    if (!firstChallengeId) {
      const list = await request(app).get('/api/challenges');
      firstChallengeId = list.body.challenges[0]?.id;
    }
    if (!firstChallengeId) return;

    const res = await request(app).get(`/api/challenges/${firstChallengeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('challenge');
    expect(res.body.challenge).toHaveProperty('starter_code');
    expect(res.body.challenge).toHaveProperty('expected_issues');
  });

  test('returns 400 for invalid UUID', async () => {
    const res = await request(app).get('/api/challenges/not-a-uuid');
    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent UUID', async () => {
    const res = await request(app).get('/api/challenges/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

// -------------------------------------------------------
// SUBMISSIONS
// -------------------------------------------------------
describe('POST /api/submissions', () => {
  test('returns 401 without X-Dev-User-Id header', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .send({ challenge_id: '00000000-0000-0000-0000-000000000000', code: 'const x = 1;' });
    expect(res.status).toBe(401);
  });

  test('returns 401 with malformed (non-UUID) user id', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Dev-User-Id', 'not-a-uuid')
      .send({ challenge_id: '00000000-0000-0000-0000-000000000000', code: 'const x = 1;' });
    expect(res.status).toBe(401);
  });

  test('returns 400 when challenge_id is missing', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Dev-User-Id', TEST_USER_ID)
      .send({ code: 'const x = 1;' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when code is empty string', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Dev-User-Id', TEST_USER_ID)
      .send({ challenge_id: firstChallengeId || '00000000-0000-0000-0000-000000000000', code: '' });
    expect(res.status).toBe(400);
  });

  test('returns 413 when code exceeds 50KB', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Dev-User-Id', TEST_USER_ID)
      .send({
        challenge_id: firstChallengeId || '00000000-0000-0000-0000-000000000000',
        code: 'x'.repeat(51 * 1024),
      });
    expect(res.status).toBe(413);
  });

  test('creates submission and returns AI feedback for SQL injection code', async () => {
    if (!firstChallengeId) return;
    const sqlInjectionCode = `function getUserByEmail(db, email) {
  const sql = "SELECT id, email FROM users WHERE email = '" + email + "'";
  return db.query(sql);
}`;
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Dev-User-Id', TEST_USER_ID)
      .send({ challenge_id: firstChallengeId, code: sqlInjectionCode });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('submission');
    expect(res.body.submission).toHaveProperty('score');
    expect(res.body.submission).toHaveProperty('feedback');
    expect(res.body.submission.score).toBeGreaterThanOrEqual(0);
    expect(res.body.submission.score).toBeLessThanOrEqual(100);
  });
});

describe('GET /api/submissions/me', () => {
  test('returns 401 without auth header', async () => {
    const res = await request(app).get('/api/submissions/me');
    expect(res.status).toBe(401);
  });

  test('returns my submissions list when authenticated', async () => {
    const res = await request(app)
      .get('/api/submissions/me')
      .set('X-Dev-User-Id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('submissions');
    expect(Array.isArray(res.body.submissions)).toBe(true);
  });
});

describe('GET /api/submissions/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/submissions/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  test('returns 400 for invalid UUID', async () => {
    const res = await request(app)
      .get('/api/submissions/not-a-uuid')
      .set('X-Dev-User-Id', TEST_USER_ID);
    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent submission', async () => {
    const res = await request(app)
      .get('/api/submissions/00000000-0000-0000-0000-000000000000')
      .set('X-Dev-User-Id', TEST_USER_ID);
    expect(res.status).toBe(404);
  });
});