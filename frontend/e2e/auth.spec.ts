import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('CodeGuard');
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 5000 });
  });

  test('switches to register tab', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('shows Google login button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('register shows error for short password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register' }).click();
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', '123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('password must be at least 8 characters')).toBeVisible({ timeout: 5000 });
  });
});