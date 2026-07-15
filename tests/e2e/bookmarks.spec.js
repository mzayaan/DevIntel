const { test, expect } = require('@playwright/test');

test.describe('Bookmarks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear bookmarks before each test
    await page.evaluate(() => localStorage.removeItem('devintelBookmarks'));
  });

  test('bookmark container shows empty state initially', async ({ page }) => {
    await page.reload();
    const container = page.locator('#bookmarkContainer');
    await expect(container).toContainText('No bookmarks yet');
  });

  test('saving a bookmark shows success notification', async ({ page }) => {
    // Inject a bookmark directly via saveBookmark function
    await page.evaluate(() => {
      saveBookmark(
        encodeURIComponent('Test Article'),
        encodeURIComponent('https://example.com/article')
      );
    });

    const notif = page.locator('.notification.success');
    await expect(notif).toBeVisible({ timeout: 3000 });
    await expect(notif).toContainText('Bookmark saved');
  });

  test('saved bookmark appears in the bookmarks section', async ({ page }) => {
    await page.evaluate(() => {
      saveBookmark(
        encodeURIComponent('My Test Article'),
        encodeURIComponent('https://example.com/my-article')
      );
    });

    await page.locator('#bookmarkContainer article.cyber-card').first().waitFor({ timeout: 3000 });
    const bookmarkCards = page.locator('#bookmarkContainer article.cyber-card');
    await expect(bookmarkCards).toHaveCount(1);
  });

  test('saving the same URL again shows already bookmarked notification', async ({ page }) => {
    const url = encodeURIComponent('https://example.com/duplicate');
    const title = encodeURIComponent('Duplicate Article');

    // First save
    await page.evaluate(([t, u]) => saveBookmark(t, u), [title, url]);
    await page.waitForTimeout(100);

    // Second save — should show info notification
    await page.evaluate(([t, u]) => saveBookmark(t, u), [title, url]);

    const notif = page.locator('.notification.info', { hasText: 'bookmarked' });
    await expect(notif).toBeVisible({ timeout: 3000 });
    await expect(notif).toContainText('bookmarked');
  });

  test('analytics shows correct bookmark count', async ({ page }) => {
    await page.evaluate(() => {
      saveBookmark(
        encodeURIComponent('Article 1'),
        encodeURIComponent('https://example.com/1')
      );
      saveBookmark(
        encodeURIComponent('Article 2'),
        encodeURIComponent('https://example.com/2')
      );
      loadAnalytics();
    });

    const analyticsContainer = page.locator('#analyticsContainer');
    await expect(analyticsContainer).toContainText('2');
  });
});
