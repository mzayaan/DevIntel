const { test, expect } = require('@playwright/test');

test.describe('PWA requirements', () => {
  test('manifest.json is served with correct content type', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toMatch(/manifest\+json/);
  });

  test('manifest has required PWA fields', async ({ request }) => {
    const res = await request.get('/manifest.json');
    const manifest = await res.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('all manifest icon files exist (no 404)', async ({ request }) => {
    const manifestRes = await request.get('/manifest.json');
    const manifest = await manifestRes.json();

    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status()).toBe(200);
    }
  });

  test('manifest shortcut URLs are valid', async ({ request }) => {
    const res = await request.get('/manifest.json');
    const manifest = await res.json();

    if (manifest.shortcuts) {
      for (const shortcut of manifest.shortcuts) {
        expect(shortcut.url).toBeTruthy();
        // Shortcut icon files should exist
        if (shortcut.icons && shortcut.icons.length > 0) {
          const iconRes = await request.get(shortcut.icons[0].src);
          expect(iconRes.status()).toBe(200);
        }
      }
    }
  });

  test('service worker file is reachable', async ({ request }) => {
    const res = await request.get('/pwa/service-worker.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/javascript/);
  });

  test('apple-touch-icon is reachable', async ({ request }) => {
    const res = await request.get('/icons/icon-180.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/image\/png/);
  });

  test('page has manifest link in <head>', async ({ page }) => {
    await page.goto('/');
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toBe('manifest.json');
  });

  test('page has viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('page has theme-color meta tag', async ({ page }) => {
    await page.goto('/');
    const themeColor = await page.locator('meta[name="theme-color"]').first().getAttribute('content');
    expect(themeColor).toBeTruthy();
  });
});
