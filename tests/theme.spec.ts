import { test, expect } from '@playwright/test';

const mockedLikes = process.env.THEME_MOCK_LIKES === '1';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test('short page anchors the footer and navigates to the article', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto('/');
  const distance = await page.locator('footer').evaluate(footer =>
    innerHeight - footer.getBoundingClientRect().bottom - parseFloat(getComputedStyle(footer).marginBottom));
  expect(Math.abs(distance)).toBeLessThan(2);
  await page.getByRole('link', { name: 'Long article', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Long article');
});

test('likes are disabled without Firebase and pages have no runtime errors', async ({ page }) => {
  test.skip(mockedLikes, 'This case checks the unconfigured build');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/long/');
  await expect(page.locator('#likeButton')).toBeDisabled();
  await expect(page.locator('#likeButton')).toHaveAttribute('title', 'Likes are unavailable');
  expect(errors).toEqual([]);
});

test('mocked likes update the counter and remember the vote', async ({ page }, testInfo) => {
  test.skip(!mockedLikes, 'This case checks the mocked Firebase build');
  await page.goto('/long/');
  const button = page.locator('#likeButton');
  await expect(page.locator('#likeCounter')).toHaveText('7');
  if (testInfo.project.name === 'mobile') {
    await button.scrollIntoViewIfNeeded();
    await button.dispatchEvent('touchstart');
  } else await button.hover();
  await expect(button).toBeDisabled({ timeout: 6000 });
  await expect(page.locator('#likeCounter')).toHaveText('8');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('likedPages')!))).toContain('fixture-article');
});

for (const path of ['/', '/long/']) {
  test(`visual appearance ${path}`, async ({ page }) => {
    test.skip(mockedLikes, 'Visual baselines use the unconfigured build');
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(path === '/' ? 'short.png' : 'long.png', { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.01 });
  });
}
