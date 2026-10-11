import { expect, test } from '@playwright/test';

test('contact link opens a prefilled Slabberjaws feedback email', async ({ page }) => {
  await page.goto('/');
  const contact = page.getByRole('link', { name: 'Contact / feedback' });
  await expect(contact).toHaveAttribute('href', /^mailto:contact@mirpworks\.com\?/);
  const href = await contact.getAttribute('href');
  const url = new URL(href!);
  expect(url.searchParams.get('subject')).toBe('Slabberjaws — Feedback');
  expect(url.searchParams.get('body')).toBe('Sent from: Slabberjaws\n\n[Your message here]');
  await expect(contact).toHaveCSS('min-height', '44px');
});
