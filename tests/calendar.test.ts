import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarBounds, jakartaDateKey, monthDays, shiftMonth } from '../src/lib/calendar.js';

test('calendar uses Jakarta midnight boundaries and correct year/month navigation', () => {
  const { start, end } = calendarBounds('2026-11');
  assert.equal(start.toISOString(), '2026-10-31T17:00:00.000Z');
  assert.equal(end.toISOString(), '2026-11-30T17:00:00.000Z');
  assert.equal(jakartaDateKey('2026-10-31T17:00:00Z'), '2026-11-01');
  assert.equal(jakartaDateKey('2026-10-31T16:59:59Z'), '2026-10-31');
  assert.equal(shiftMonth('2026-12', 1), '2027-01'); assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(calendarBounds('2024-02').end.toISOString(), '2024-02-29T17:00:00.000Z');
  for (const invalid of ['2026-13', '2026-00', '26-11', '2026-1', '2026-11-01', '0000-01']) assert.throws(() => calendarBounds(invalid));
});
test('calendar grid starts on Monday, includes leap days and has unique date cells', () => {
  const days = monthDays('2024-02');
  assert.equal(days.length, 42); assert.equal(new Set(days).size, 42);
  assert.equal(days[0], '2024-01-29'); assert.ok(days.includes('2024-02-29'));
  assert.equal(monthDays('2026-11')[0], '2026-10-26');
});
