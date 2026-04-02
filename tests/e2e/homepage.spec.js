const { test, expect } = require('@playwright/test');

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/DevIntel/i);
  });

  test('displays DEVINTEL heading', async ({ page }) => {
    // The page header h1 has text-transparent (bg-clip-text) — check DOM presence + text
    const heading = page.locator('header h1');
    await expect(heading).toHaveText(/DEVINTEL/i);
  });

  test('all 6 section headings are present', async ({ page }) => {
    await expect(page.locator('#newsSection h2')).toBeVisible();
    await expect(page.locator('#githubSection h2')).toBeVisible();
    await expect(page.locator('#hnSection h2')).toBeVisible();
    await expect(page.locator('#aiSection h2')).toBeVisible();
    await expect(page.locator('#securitySection h2')).toBeVisible();
    await expect(page.locator('#bookmarksSection h2')).toBeVisible();
  });

  test('analytics section shows stats cards', async ({ page }) => {
    const analyticsSection = page.locator('#analyticsSection');
    await expect(analyticsSection).toBeVisible();
    await expect(page.locator('#analyticsContainer')).not.toBeEmpty();
  });

  test('footer shows last sync time', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Last sync');
  });

  test('news section shows cards or error state (live network)', async ({ page }) => {
    // Wait for skeleton to be replaced by either real cards OR an error card
    await page.waitForFunction(
      () => {
        const container = document.getElementById('newsContainer');
        if (!container) return false;
        // Real cards are <article>, error state is a <div> — both replace skeleton
        const hasArticle = container.querySelector('article.cyber-card') !== null;
        const hasError = container.querySelector('.cyber-card.security') !== null;
        const hasFallback = container.querySelector('p') !== null;
        return hasArticle || hasError || hasFallback;
      },
      { timeout: 20000 }
    );
    // The container should have SOMETHING (not empty, not only skeletons)
    const container = page.locator('#newsContainer');
    await expect(container).not.toBeEmpty();
  });

  test('PWA manifest is reachable', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toMatch(/manifest\+json/);

    const manifest = await res.json();
    expect(manifest.name).toContain('DevIntel');
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('all manifest icons resolve without 404', async ({ request, page }) => {
    const res = await request.get('/manifest.json');
    const manifest = await res.json();

    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status()).toBe(200);
    }
  });
});
