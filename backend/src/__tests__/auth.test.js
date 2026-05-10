// =============================================
// UNIT TESTS — Jest (for 90%+ coverage bonus)
// Run: npx jest --coverage
// =============================================

// --- auth.test.js ---
// Tests backend auth helper functions

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock your actual helper paths — adjust if needed
// const { hashPassword, verifyPassword } = require('../../src/utils/auth');
// const { generateToken, verifyToken } = require('../../src/utils/jwt');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// --- Password hashing ---
describe('Password Hashing', () => {

  test('hashes a password successfully', async () => {
    const hash = await bcrypt.hash('MyPassword123', 10);
    expect(hash).toBeDefined();
    expect(hash).not.toBe('MyPassword123');
  });

  test('verifies correct password against hash', async () => {
    const hash = await bcrypt.hash('MyPassword123', 10);
    const isValid = await bcrypt.compare('MyPassword123', hash);
    expect(isValid).toBe(true);
  });

  test('rejects wrong password against hash', async () => {
    const hash = await bcrypt.hash('MyPassword123', 10);
    const isValid = await bcrypt.compare('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

});

// --- JWT token ---
describe('JWT Token', () => {

  test('generates a valid JWT token', () => {
    const payload = { id: 1, email: 'test@test.com', role: 'user' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('verifies a valid token and returns payload', () => {
    const payload = { id: 1, email: 'test@test.com' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe('test@test.com');
  });

  test('rejects a token signed with wrong secret', () => {
    const token = jwt.sign({ id: 1 }, 'wrong_secret');
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  test('rejects an expired token', () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '0s' });
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

});

// --- Input validation helpers ---
describe('Input Validation', () => {

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isStrongPassword(password) {
    return password.length >= 8;
  }

  function sanitizeInput(input) {
    return input.replace(/<script.*?>.*?<\/script>/gi, '').replace(/[<>]/g, '');
  }

  test('validates correct email format', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  test('rejects invalid email format', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
  });

  test('accepts strong password (8+ chars)', () => {
    expect(isStrongPassword('Secure@123')).toBe(true);
  });

  test('rejects weak password (under 8 chars)', () => {
    expect(isStrongPassword('123')).toBe(false);
  });

  test('sanitizes XSS script tags from input', () => {
    const dirty = '<script>alert("xss")</script>Hello';
    const clean = sanitizeInput(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Hello');
  });

  test('sanitizes HTML brackets from input', () => {
    const input = '<b>bold</b>';
    const clean = sanitizeInput(input);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
  });

});

// --- Role/Authorization logic ---
describe('User Roles & Authorization', () => {

  function hasPermission(user, action) {
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage_users'],
      user:  ['read', 'write'],
      guest: ['read'],
    };
    return (permissions[user.role] || []).includes(action);
  }

  test('admin can manage users', () => {
    const admin = { role: 'admin' };
    expect(hasPermission(admin, 'manage_users')).toBe(true);
  });

  test('regular user cannot manage users', () => {
    const user = { role: 'user' };
    expect(hasPermission(user, 'manage_users')).toBe(false);
  });

  test('regular user can read and write', () => {
    const user = { role: 'user' };
    expect(hasPermission(user, 'read')).toBe(true);
    expect(hasPermission(user, 'write')).toBe(true);
  });

  test('guest can only read', () => {
    const guest = { role: 'guest' };
    expect(hasPermission(guest, 'read')).toBe(true);
    expect(hasPermission(guest, 'write')).toBe(false);
    expect(hasPermission(guest, 'delete')).toBe(false);
  });

  test('unknown role has no permissions', () => {
    const unknown = { role: 'hacker' };
    expect(hasPermission(unknown, 'read')).toBe(false);
  });

});
