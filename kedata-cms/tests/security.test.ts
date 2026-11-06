import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashApiKey,
  generateApiKey,
  signWebhookPayload,
  sanitizeHtmlContent,
  checkRateLimit,
} from '../src/server/security.js';

test('API Key generation and hashing behaves deterministically', () => {
  const { rawKey, hash, prefix } = generateApiKey('kd_live_test');
  assert.equal(rawKey.startsWith('kd_live_test_'), true);
  assert.equal(prefix.length > 5, true);

  // Hash of rawKey must match
  const computedHash = hashApiKey(rawKey);
  assert.equal(computedHash, hash);
  assert.notEqual(rawKey, hash); // Must be one-way hashed
});

test('Webhook payload HMAC signature verification', () => {
  const payload = JSON.stringify({ event: 'post.published', id: 'post_123' });
  const secret = 'super_secret_webhook_key_2026';

  const signature = signWebhookPayload(payload, secret);
  assert.equal(typeof signature, 'string');
  assert.equal(signature.length, 64); // SHA-256 hex string

  // Altered payload must mismatch
  const tamperedSignature = signWebhookPayload(payload + 'tampered', secret);
  assert.notEqual(signature, tamperedSignature);
});

test('HTML sanitizer strips malicious scripts while preserving safe markup', () => {
  const maliciousInput = '<p>Normal text</p><script>alert("hack")</script><img src="x" onerror="stealCookie()" /><a href="javascript:void(0)">Click</a>';
  const sanitized = sanitizeHtmlContent(maliciousInput);

  assert.equal(sanitized.includes('<script>'), false);
  assert.equal(sanitized.includes('onerror'), false);
  assert.equal(sanitized.includes('javascript:'), false);
  assert.equal(sanitized.includes('<p>Normal text</p>'), true);
});

test('Rate limiter throttles excessive requests', () => {
  const testKey = 'test_ip_or_key_' + Math.random();
  // Limit to 3 requests
  const r1 = checkRateLimit(testKey, 3);
  const r2 = checkRateLimit(testKey, 3);
  const r3 = checkRateLimit(testKey, 3);
  const r4 = checkRateLimit(testKey, 3);

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, true);
  assert.equal(r4.allowed, false); // Throttled!
});
