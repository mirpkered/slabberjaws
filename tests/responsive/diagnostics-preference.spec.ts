import { test, expect, type Page } from '@playwright/test';

async function openMenu(page: Page) {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  return page.getByRole('switch', { name: 'Diagnostics' });
}

async function openAdd(page: Page) {
  const mobile = page.locator('.floating-add');
  if (await mobile.isVisible()) await mobile.click();
  else await page.locator('.desktop-add').click();
}

test('Diagnostics defaults off; hamburger switch enables it and persists across reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./', { waitUntil: 'networkidle' });
  const toggle = await openMenu(page);
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await openAdd(page);
  await expect(page.locator('.diagnostics-active')).toContainText('Diagnostics Active · build');
  await expect(page.locator('.diagnostics-active')).toHaveAttribute('data-build-id', /.+/);
  await page.locator('.add-modal .close').click();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(await openMenu(page)).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('slabberjaws.diagnostics.enabled'))).toBe('true');
});

test('diagnostics URL shortcut can be switched off and stays off after reload', async ({ page }) => {
  await page.goto('./?diagnostics=1', { waitUntil: 'networkidle' });
  const toggle = await openMenu(page);
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page).not.toHaveURL(/diagnostics=/);
  expect(await page.evaluate(() => localStorage.getItem('slabberjaws.diagnostics.enabled'))).toBe('false');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(await openMenu(page)).toHaveAttribute('aria-checked', 'false');
  await openAdd(page);
  await expect(page.locator('.diagnostics-active')).toHaveCount(0);
});

test('standalone-style launch keeps the menu preference without navigating or reloading', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
  });
  await page.goto('./', { waitUntil: 'networkidle' });
  const startingUrl = page.url();
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations += 1; });
  const toggle = await openMenu(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(page.url()).toBe(startingUrl);
  expect(navigations).toBe(0);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(await openMenu(page)).toHaveAttribute('aria-checked', 'true');
});

test('Diagnostics setting remains touch-sized and within the viewport from phone to desktop widths', async ({ page }) => {
  await page.goto('./', { waitUntil: 'networkidle' });
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Open account menu' }).click();
    const panel = page.locator('.account-menu-panel');
    const toggle = page.getByRole('switch', { name: 'Diagnostics' });
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    const target = await toggle.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(target?.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Close account menu' }).click();
  }
});

test('menu-enabled diagnostics reach Photograph Slab without changing its flow', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __SLABBERJAWS_OCR_TEST_WORKER__: async () => ({ async setParameters() {}, async recognize() { return { data: { text: '2021 Topps\n#285 Sample Player\n8.5', confidence: 94 } }; }, async terminate() {} }) });
  });
  await page.goto('./', { waitUntil: 'networkidle' });
  const toggle = await openMenu(page);
  await toggle.click();
  await openAdd(page);
  await page.getByRole('button', { name: 'Photograph Slab', exact: true }).click();
  await page.getByLabel('Grading company').selectOption('CSG');
  await page.getByRole('button', { name: 'Continue to photos' }).click();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="900"><rect width="640" height="900" fill="white"/><text x="50" y="100" font-size="44">2021 Topps</text></svg>';
  await page.locator('input[type=file]').setInputFiles({ name: 'diagnostic-synthetic.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await page.getByRole('button', { name: 'Confirm whole-slab crop' }).click();
  await page.getByRole('button', { name: 'Skip label crop' }).click();
  await page.getByRole('button', { name: 'Continue with front only' }).click();
  await page.getByRole('button', { name: 'Read label text' }).click();
  await expect(page.locator('.ocr-diagnostics')).toBeVisible();
  await expect(page.locator('.photo-entry .manual-grid').getByLabel('Certification number')).toHaveValue('');
});

