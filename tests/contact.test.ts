import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APPLICATION_NAME, CONTACT_BODY, CONTACT_RECIPIENT, CONTACT_SUBJECT, getContactEmailHref } from '../lib/contact.ts';

const root = new URL('../', import.meta.url);

test('Slabberjaws contact email follows the Mirpworks convention and encodes fields', () => {
  assert.equal(APPLICATION_NAME, 'Slabberjaws');
  assert.equal(CONTACT_RECIPIENT, 'contact@mirpworks.com');
  assert.equal(CONTACT_SUBJECT, 'Slabberjaws — Feedback');
  assert.equal(CONTACT_BODY, 'Sent from: Slabberjaws\n\n[Your message here]');

  const href = getContactEmailHref();
  assert.ok(href.startsWith('mailto:contact@mirpworks.com?'));
  const parsed = new URL(href);
  assert.equal(parsed.protocol, 'mailto:');
  assert.equal(parsed.pathname, CONTACT_RECIPIENT);
  assert.equal(parsed.searchParams.get('subject'), CONTACT_SUBJECT);
  assert.equal(parsed.searchParams.get('body'), CONTACT_BODY);
  assert.match(href, /%E2%80%94|%e2%80%94/i);
  assert.match(href, /%0A/);
});

test('all app feedback links use the shared contact helper', async () => {
  const page = await readFile(new URL('app/page.tsx', root), 'utf8');
  assert.equal((page.match(/getContactEmailHref\(\)/g) ?? []).length, 1);
  assert.match(page, /<a href=\{getContactEmailHref\(\)\}>Contact \/ feedback<\/a>/);
});
