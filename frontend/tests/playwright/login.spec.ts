import { test, expect } from '@playwright/test';

// =============================================
// TEST 1: PLAYWRIGHT LOGIN TEST (Full Grade)
// =============================================

test.describe('Login Flow', () => {

  test('user can register a new account', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'testuser@test.com');
    await page.fill('input[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@test.com');
    await page.fill('input[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('login fails with wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('login fails with unregistered email', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'notexist@test.com');
    await page.fill('input[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@test.com');
    await page.fill('input[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    await expect(page).toHaveURL('/login');
  });

});
