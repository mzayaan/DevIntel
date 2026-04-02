const { test, expect } = require('@playwright/test');

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear stored theme preference so tests are independent
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('devintelTheme'));
  });

  test('theme button exists in sidebar', async ({ page }) => {
    await page.goto('/');
    // Button exists in DOM (may be visually hidden on mobile behind menu)
    const btn = page.locator('#themeToggle');
    await expect(btn).toHaveCount(1);
  });

  test('applyTheme(dark) adds dark class to <html>', async ({ page }) => {
    await page.goto('/');

    // Call the app function directly — works on all viewports without sidebar interaction
    await page.evaluate(() => applyTheme('dark'));

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark).toBe(true);
    const stored = await page.evaluate(() => localStorage.getItem('devintelTheme'));
    expect(stored).toBe('dark');
  });

  test('applyTheme(light) removes dark class from <html>', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => applyTheme('dark'));  // first set dark
    await page.evaluate(() => applyTheme('light')); // then back to light

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark).toBe(false);
  });

  test('theme preference persists after page reload', async ({ page }) => {
    await page.goto('/');

    // Set dark theme via app function
    await page.evaluate(() => applyTheme('dark'));

    // Reload and check class is restored from localStorage
    await page.reload();
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark).toBe(true);
  });

  test('respects prefers-color-scheme dark on first visit', async ({ browser }) => {
    // Create a new context with dark color scheme
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();

    await page.goto('/');
    // Clear stored pref to force system preference detection
    await page.evaluate(() => localStorage.removeItem('devintelTheme'));
    await page.reload();

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark).toBe(true);

    await context.close();
  });
});
