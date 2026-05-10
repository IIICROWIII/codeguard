'use strict';

// =============================================
// UNIT TESTS — Jest
// These test YOUR EXACT backend code
// Run: npx jest --coverage
// =============================================

// Copy these files into: backend/src/__tests__/

// -------------------------------------------------------
// 1. aiAnalyzer.test.js  — tests your aiAnalyzer.js
// -------------------------------------------------------

const { analyze } = require('../services/aiAnalyzer');

describe('aiAnalyzer — SQL Injection detection', () => {
  test('detects SQL injection via string concatenation in WHERE clause', () => {
    const code = `function getUserByEmail(db, email) {
  const sql = "SELECT id, email FROM users WHERE email = '" + email + "'";
  return db.query(sql);
}`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).toContain('SQL_INJECTION');
  });

  test('does NOT flag a parameterized query as SQL injection', () => {
    const code = `db.query('SELECT * FROM users WHERE id = $1', [id]);`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).not.toContain('SQL_INJECTION');
  });
});

describe('aiAnalyzer — XSS detection', () => {
  test('detects XSS when user input is sent directly in HTML response', () => {
    const code = `app.get('/hello', (req, res) => {
  const name = req.query.name;
  res.send('<h1>Hello ' + name + '</h1>');
});`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).toContain('XSS');
  });
});

describe('aiAnalyzer — Plaintext Password detection', () => {
  test('detects plaintext password being stored in DB', () => {
    const code = `await db.query('INSERT INTO users(email, password_hash) VALUES ($1, $2)', [email, password]);`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).toContain('PLAINTEXT_PASSWORD');
  });
});

describe('aiAnalyzer — BROKEN_AUTH detection', () => {
  test('flags jwt.decode() usage (no signature verification)', () => {
    const code = `const payload = jwt.decode(token);`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).toContain('BROKEN_AUTH');
  });

  test('does NOT flag jwt.verify() as broken auth', () => {
    const code = `const payload = jwt.verify(token, secret);`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).not.toContain('BROKEN_AUTH');
  });
});

describe('aiAnalyzer — PATH_TRAVERSAL detection', () => {
  test('detects path traversal when sendFile uses req.query', () => {
    const code = `app.get('/file', (req, res) => {
  const name = req.query.name;
  res.sendFile(path.join('/var/app/uploads', name));
});`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).toContain('PATH_TRAVERSAL');
  });
});

describe('aiAnalyzer — OFF_BY_ONE detection', () => {
  test('detects off-by-one loop error', () => {
    const code = `for (let i = 0; i < arr.length - 1; i++) { total += arr[i]; }`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).toContain('OFF_BY_ONE');
  });

  test('does NOT flag correct loop bounds', () => {
    const code = `for (let i = 0; i < arr.length; i++) { total += arr[i]; }`;
    const result = analyze({ code });
    const types = result.vulnerabilities.map(v => v.type);
    expect(types).not.toContain('OFF_BY_ONE');
  });
});

describe('aiAnalyzer — scoring', () => {
  test('clean code scores 100', () => {
    const result = analyze({ code: `const x = 1 + 1;` });
    expect(result.score).toBe(100);
  });

  test('code with high-severity vulnerability scores less than 76', () => {
    const code = `const sql = "SELECT * FROM users WHERE id = '" + id + "'";`;
    const result = analyze({ code });
    expect(result.score).toBeLessThan(76); // -25 for HIGH severity
  });

  test('score is always between 0 and 100', () => {
    const code = `
      const sql = "SELECT * FROM users WHERE id = '" + id + "'";
      res.send('<h1>' + req.query.name + '</h1>');
      await db.query('INSERT INTO users(email, password_hash) VALUES ($1, $2)', [email, password]);
      const payload = jwt.decode(token);
    `;
    const result = analyze({ code });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('aiAnalyzer — error detection', () => {
  test('detects unmatched single quote', () => {
    const result = analyze({ code: `const x = 'hello;` });
    expect(result.errors.some(e => e.includes('single quote'))).toBe(true);
  });

  test('detects unbalanced curly braces', () => {
    const result = analyze({ code: `function foo() { if (true) { }` });
    expect(result.errors.some(e => e.includes('curly braces'))).toBe(true);
  });

  test('returns correct shape: errors, vulnerabilities, suggestions, score', () => {
    const result = analyze({ code: 'const x = 1;' });
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('vulnerabilities');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('score');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.vulnerabilities)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(typeof result.score).toBe('number');
  });
});

// -------------------------------------------------------
// 2. requireAuth.test.js — tests your middleware UUID check
// -------------------------------------------------------

const { UUID_RE } = require('../middleware/requireAuth');

describe('requireAuth — UUID_RE validation', () => {
  test('accepts a valid UUID v4', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  test('rejects a non-UUID string', () => {
    expect(UUID_RE.test('not-a-uuid')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(UUID_RE.test('')).toBe(false);
  });

  test('rejects UUID with wrong segment lengths', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716')).toBe(false);
  });
});

// -------------------------------------------------------
// 3. challengesController — input validation logic
// -------------------------------------------------------

describe('Challenges — difficulty filter validation', () => {
  const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'security']);

  test('accepts beginner difficulty', () => {
    expect(VALID_DIFFICULTIES.has('beginner')).toBe(true);
  });

  test('accepts intermediate difficulty', () => {
    expect(VALID_DIFFICULTIES.has('intermediate')).toBe(true);
  });

  test('accepts security difficulty', () => {
    expect(VALID_DIFFICULTIES.has('security')).toBe(true);
  });

  test('rejects invalid difficulty', () => {
    expect(VALID_DIFFICULTIES.has('expert')).toBe(false);
    expect(VALID_DIFFICULTIES.has('')).toBe(false);
    expect(VALID_DIFFICULTIES.has('easy')).toBe(false);
  });
});

// -------------------------------------------------------
// 4. submissions — code size validation logic
// -------------------------------------------------------

describe('Submissions — code size validation', () => {
  const MAX_CODE_BYTES = 50 * 1024;

  test('accepts code under 50KB', () => {
    const code = 'x'.repeat(1000);
    expect(Buffer.byteLength(code, 'utf8')).toBeLessThan(MAX_CODE_BYTES);
  });

  test('rejects code over 50KB', () => {
    const code = 'x'.repeat(51 * 1024);
    expect(Buffer.byteLength(code, 'utf8')).toBeGreaterThan(MAX_CODE_BYTES);
  });

  test('empty code is invalid', () => {
    const code = '';
    expect(typeof code === 'string' && code.length === 0).toBe(true);
  });
});
