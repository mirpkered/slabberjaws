import { test, expect, type Page } from '@playwright/test';

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const [width, height] of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]) {
  test(`account form is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Account' }).click();
    await expect(page.locator('.auth-form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveAttribute('autocomplete', 'username');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('autocomplete', 'current-password');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue('');
    await fits(page);
    await page.getByRole('button', { name: 'Back to Sign In' }).click();
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.locator('input[name="new-password"]')).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.locator('input[name="confirm-password"]')).toHaveAttribute('autocomplete', 'new-password');
    await fits(page);
  });
}
