import { test, expect } from '@playwright/test';

// =============================================
// TEST 2: PLAYWRIGHT SUBMIT CODE TEST (Full Grade)
// =============================================

// Helper: login before each test
async function loginAsUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'testuser@test.com');
  await page.fill('input[name="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Code Submission Flow', () => {

  test('user can see the challenge list', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/challenges');
    await expect(page.locator('.challenge-card, .challenge-item').first()).toBeVisible();
  });

  test('user can open a challenge and see the editor', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/challenges');
    await page.locator('.challenge-card, .challenge-item').first().click();
    await expect(page.locator('.code-editor, textarea, [role="textbox"]')).toBeVisible();
  });

  test('user can submit code and receive AI feedback', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/challenges');
    await page.locator('.challenge-card, .challenge-item').first().click();

    // Type some code into the editor
    const editor = page.locator('.code-editor, textarea, [role="textbox"]').first();
    await editor.click();
    await editor.fill(`
      const query = "SELECT * FROM users WHERE id = " + userId;
      db.execute(query);
    `);

    await page.click('button:has-text("Submit"), button:has-text("Analyze")');

    // Wait for AI feedback to appear
    await expect(page.locator('.feedback, .result, .ai-feedback')).toBeVisible({ timeout: 15000 });
  });

  test('submitted code shows security warnings for SQL injection', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/challenges');
    await page.locator('.challenge-card, .challenge-item').first().click();

    const editor = page.locator('.code-editor, textarea, [role="textbox"]').first();
    await editor.click();
    await editor.fill(`const query = "SELECT * FROM users WHERE id = " + userId;`);

    await page.click('button:has-text("Submit"), button:has-text("Analyze")');
    await expect(page.locator('.feedback, .result, .ai-feedback')).toBeVisible({ timeout: 15000 });

    // Feedback should mention SQL injection or security
    const feedbackText = await page.locator('.feedback, .result, .ai-feedback').innerText();
    const hasSecurity = feedbackText.toLowerCase().includes('sql') ||
                        feedbackText.toLowerCase().includes('injection') ||
                        feedbackText.toLowerCase().includes('security');
    expect(hasSecurity).toBeTruthy();
  });

  test('completed challenge appears in dashboard history', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard');
    await expect(page.locator('.history, .completed, .submissions')).toBeVisible();
  });

});
