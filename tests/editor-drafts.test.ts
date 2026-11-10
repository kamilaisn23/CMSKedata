import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorDraftSession, PageDraftSchema, PostDraftSchema, DRAFT_MAX_AGE, draftKey, type PageDraft } from '../src/lib/editorDrafts.js';

function fixture() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const baseline: PageDraft = { title: '', slug: '', contentHtml: '', contentJson: '{}', status: 'DRAFT', metaTitle: '', metaDescription: '', ogImage: '' };
const changed = { ...baseline, title: 'Belum selesai', contentHtml: '<p>Tulisan aman saat offline</p>', metaTitle: 'SEO tersimpan' };
const key = draftKey('user-a', 'site-a', 'PAGE', null);

test('recovery preserves incomplete form fields without changing canonical content', () => {
  const storage = fixture();
  const session = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  session.update(changed); session.flush();
  assert.ok(session.savedAt);
  const reopened = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  assert.deepEqual(reopened.recovery?.data, changed);
  reopened.update({ ...baseline, title: 'New typing while recovery prompt is open' }); reopened.flush();
  assert.deepEqual(new EditorDraftSession(storage, key, baseline, null, PageDraftSchema).recovery?.data, changed);
  assert.deepEqual(reopened.restore(), changed);
});

test('draft identity isolates user, site, content type and record', () => {
  const storage = fixture(); const session = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  session.update(changed); session.flush();
  for (const other of [draftKey('user-b', 'site-a', 'PAGE', null), draftKey('user-a', 'site-b', 'PAGE', null), draftKey('user-a', 'site-a', 'POST', null), draftKey('user-a', 'site-a', 'PAGE', 'record')]) {
    assert.equal(new EditorDraftSession(storage, other, baseline, null, PageDraftSchema).recovery, null);
  }
});

test('server success clears matching backup, failed requests leave it available', () => {
  const storage = fixture(); const session = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  session.update(changed); session.flush();
  // An API failure does not call savedToServer, so a new editor recovers the original work.
  assert.ok(new EditorDraftSession(storage, key, baseline, null, PageDraftSchema).recovery);
  session.savedToServer(changed); session.flush();
  assert.equal(storage.getItem(key), null);
});

test('typing during a server save survives clearing and editor cleanup', () => {
  const storage = fixture(); const session = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  session.update(changed); session.flush();
  const newer = { ...changed, title: 'Typed during request' }; session.update(newer);
  session.savedToServer(changed); session.flush();
  assert.deepEqual(new EditorDraftSession(storage, key, changed, null, PageDraftSchema).recovery?.data, newer);
});

test('discard and returning to canonical content clear backups without resurrecting them', () => {
  const storage = fixture(); const session = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  session.update(changed); session.flush(); session.update(baseline); session.flush(); assert.equal(storage.getItem(key), null);
  session.update(changed); session.flush();
  const reopened = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  reopened.discardRecovery(); reopened.flush(); assert.equal(storage.getItem(key), null);
});

test('corrupt, wrong-shape and expired browser data cannot crash or restore into editor', () => {
  const storage = fixture();
  for (const raw of ['{broken', JSON.stringify({ version: 1, savedAt: Date.now(), baseUpdatedAt: null, data: { title: 5 } }), JSON.stringify({ version: 1, savedAt: Date.now() - DRAFT_MAX_AGE - 1, baseUpdatedAt: null, data: changed })]) {
    storage.setItem(key, raw); assert.equal(new EditorDraftSession(storage, key, baseline, null, PageDraftSchema).recovery, null); assert.equal(storage.getItem(key), null);
  }
});

test('unavailable/full storage is surfaced and another tab cannot be silently overwritten', () => {
  const unavailable = new EditorDraftSession(null, key, baseline, null, PageDraftSchema); unavailable.update(changed); assert.throws(() => unavailable.flush(), /tidak tersedia/);
  const storage = fixture(); const session = new EditorDraftSession({ ...storage, setItem: () => { throw new Error('quota'); } }, key, baseline, null, PageDraftSchema);
  session.update(changed); assert.throws(() => session.flush(), /quota/); assert.equal(session.savedAt, null);
  const tabA = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  const tabB = new EditorDraftSession(storage, key, baseline, null, PageDraftSchema);
  tabA.update(changed); tabA.flush(); tabB.update({ ...changed, title: 'Other tab' });
  assert.throws(() => tabB.flush(), /tab lain/);
  assert.deepEqual(new EditorDraftSession(storage, key, baseline, null, PageDraftSchema).recovery?.data, changed);
});

test('post metadata and original server version survive round trip; matching canonical data is cleaned', () => {
  const storage = fixture(); const post = { ...changed, status: 'SCHEDULED' as const, excerpt: 'Intro', featuredImage: '/image.webp', categoryId: 'category', tagIds: ['tag-a', 'tag-b'], scheduledAt: '2026-11-10T12:30' };
  const emptyPost = { ...post, title: '', contentHtml: '', tagIds: [] };
  const session = new EditorDraftSession(storage, key, emptyPost, 'old-version', PostDraftSchema); session.update(post); session.flush();
  const reopened = new EditorDraftSession(storage, key, emptyPost, 'new-version', PostDraftSchema);
  assert.equal(reopened.recovery?.baseUpdatedAt, 'old-version'); assert.deepEqual(reopened.restore(), post);
  assert.equal(new EditorDraftSession(storage, key, post, 'new-version', PostDraftSchema).recovery, null); assert.equal(storage.getItem(key), null);
});
