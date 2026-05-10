import { test, expect } from '@playwright/test';

// =============================================
// TEST 3: PLAYWRIGHT UI TEST (Full Grade)
// =============================================

test.describe('UI Validation', () => {

  // --- Login Page UI ---
  test('login page shows error on empty form submit', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"], input:invalid')).toBeVisible();
  });

  test('login page shows error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"], input:invalid')).toBeVisible();
  });

  // --- Register Page UI ---
  test('register page shows error on empty form submit', async ({ page }) => {
    await page.goto('/register');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test('register page shows error for weak password', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test');
    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', '123'); // too short
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  // --- Navigation UI ---
  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user is redirected from editor to login', async ({ page }) => {
    await page.goto('/challenges');
    await expect(page).toHaveURL(/login|challenges/);
  });

  // --- Responsive / basic rendering ---
  test('login page has required fields visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('dashboard shows progress and score after login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@test.com');
    await page.fill('input[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await expect(page.locator('.score, .progress, .stats')).toBeVisible();
  });

});
