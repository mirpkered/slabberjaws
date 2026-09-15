import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('account forms retain standard password-manager semantics', () => {
  assert.match(page, /<form className="auth-form" onSubmit=\{submitAuth\}>/);
  assert.match(page, /name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck=\{false\}/);
  assert.match(page, /name=\{authMode === "signin" \? "password" : "new-password"\}/);
  assert.match(page, /autoComplete=\{authMode === "signin" \? "current-password" : "new-password"\}/);
  assert.match(page, /name="confirm-password" type="password" required minLength=\{6\} autoComplete="new-password"/);
  assert.match(page, /<button type="submit" className="primary wide"/);
  assert.doesNotMatch(page, /autoComplete="off"/);
});

test('password recovery uses Supabase reset and update APIs with the Pages-safe URL', () => {
  assert.match(page, /supabase\.auth\.resetPasswordForEmail\(email, \{\s*redirectTo: authRedirectUrl\(\)/);
  assert.match(page, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(page, /event === "PASSWORD_RECOVERY"/);
  assert.match(page, /Forgot password\?/);
});
