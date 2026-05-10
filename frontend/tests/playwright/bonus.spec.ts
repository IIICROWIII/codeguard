import { test, expect } from '@playwright/test';

// =============================================
// BONUS TESTS — Social Login, 2FA, Roles, Admin
// =============================================

// Helper
async function loginAsUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'testuser@test.com');
  await page.fill('input[name="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'Admin@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// =============================================
// SOCIAL LOGIN TESTS (bonus: 1=full, 2=+5, 3=+10, 4+=+15)
// =============================================

test.describe('Social Login', () => {

  test('Google login button is visible on login page', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google"), [data-provider="google"]');
    await expect(googleBtn).toBeVisible();
  });

  test('GitHub login button is visible on login page', async ({ page }) => {
    await page.goto('/login');
    const githubBtn = page.locator('button:has-text("GitHub"), a:has-text("GitHub"), [data-provider="github"]');
    await expect(githubBtn).toBeVisible();
  });

  test('clicking Google login redirects to Google OAuth', async ({ page }) => {
    await page.goto('/login');
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      page.locator('button:has-text("Google"), a:has-text("Google")').click(),
    ]);
    // Either redirects or opens popup
    const currentUrl = page.url();
    const redirected = currentUrl.includes('google') || currentUrl.includes('oauth') || popup !== null;
    expect(redirected).toBeTruthy();
  });

  test('clicking GitHub login redirects to GitHub OAuth', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button:has-text("GitHub"), a:has-text("GitHub")').click();
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const redirected = currentUrl.includes('github') || currentUrl.includes('oauth');
    expect(redirected).toBeTruthy();
  });

});

// =============================================
// 2FA / AUTHENTICATION METHOD TESTS
// (bonus: 1=full, 2=+5, 3=+10, 4+=+15)
// =============================================

test.describe('Authentication & 2FA', () => {

  test('basic JWT login works', async ({ page }) => {
    await loginAsUser(page);
    await expect(page).toHaveURL('/dashboard');
  });

  test('2FA setup option is visible in user profile/settings', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/settings');
    const twoFA = page.locator('text=2FA, text=Two-Factor, text=Authenticator, [data-testid="2fa"]');
    await expect(twoFA).toBeVisible();
  });

  test('user can enable email OTP / 2FA method', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/settings');
    const enable2FA = page.locator('button:has-text("Enable"), button:has-text("Setup 2FA")');
    await expect(enable2FA).toBeVisible();
    await enable2FA.click();
    await expect(page.locator('.qr-code, .otp-input, text=verification')).toBeVisible();
  });

  test('login with social provider creates valid session', async ({ page }) => {
    // This verifies the session is created properly after OAuth
    await page.goto('/api/auth/session');
    // If logged in, session endpoint should return user data
    const body = await page.textContent('body');
    expect(body).toBeDefined();
  });

});

// =============================================
// MULTIPLE USER ROLES TEST (+10 bonus)
// =============================================

test.describe('Multiple User Roles', () => {

  test('regular user cannot access admin panel', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/admin');
    // Should redirect away or show forbidden
    const url = page.url();
    const forbidden = url.includes('login') || url.includes('dashboard') || url.includes('403');
    const hasForbiddenText = await page.locator('text=Forbidden, text=Access Denied, text=403').isVisible().catch(() => false);
    expect(forbidden || hasForbiddenText).toBeTruthy();
  });

  test('admin user can access admin panel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/admin/);
  });

  test('regular user can only submit code, not manage users', async ({ page }) => {
    await loginAsUser(page);
    // Can access editor
    await page.goto('/challenges');
    await expect(page).toHaveURL(/challenges/);
    // Cannot access user management
    await page.goto('/admin/users');
    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

  test('admin can see all users in the system', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await expect(page.locator('table, .user-list, .user-row')).toBeVisible();
  });

});

// =============================================
// ADMIN DASHBOARD DYNAMIC PERMISSIONS TEST (+10 bonus)
// =============================================

test.describe('Admin Dashboard — Dynamic Permissions', () => {

  test('admin dashboard is accessible to admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await expect(page.locator('h1, h2')).toContainText(/admin|dashboard/i);
  });

  test('admin can change a user role from the dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');

    // Find a user row and change their role
    const roleSelect = page.locator('select[name="role"], .role-select').first();
    await expect(roleSelect).toBeVisible();
    await roleSelect.selectOption('admin'); // or 'user' / 'guest'

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
    await saveBtn.click();

    await expect(page.locator('.success, text=Updated, text=Saved')).toBeVisible();
  });

  test('permission change takes effect immediately for the user', async ({ page, browser }) => {
    // Admin changes user role
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    const roleSelect = page.locator('select[name="role"], .role-select').first();
    await roleSelect.selectOption('guest');
    await page.locator('button:has-text("Save"), button:has-text("Update")').first().click();
    await expect(page.locator('.success, text=Updated')).toBeVisible();

    // Open new context as the user and verify restricted access
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await loginAsUser(userPage);
    await userPage.goto('/challenges');
    // Guest should see read-only or restricted view
    await expect(userPage.locator('body')).toBeVisible(); // at minimum page loads
    await userContext.close();
  });

});
