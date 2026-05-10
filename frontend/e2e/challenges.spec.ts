import { test, expect } from '@playwright/test';

test.describe('Challenges', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/challenges');
    await expect(page).toHaveURL(/.*login/);
  });

  test('redirects to login from dashboard when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('redirects to login from admin when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*login/);
  });

  test('home page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });
});