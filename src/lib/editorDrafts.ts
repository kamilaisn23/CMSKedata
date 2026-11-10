import { z } from 'zod';

const commonFields = {
  title: z.string(), slug: z.string(), contentHtml: z.string(), contentJson: z.string(),
  metaTitle: z.string(), metaDescription: z.string(), ogImage: z.string(),
};
export const PageDraftSchema = z.object({ ...commonFields, status: z.enum(['DRAFT', 'PUBLISHED']) });
export const PostDraftSchema = PageDraftSchema.extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']), excerpt: z.string(), featuredImage: z.string(),
  categoryId: z.string(), tagIds: z.array(z.string()), scheduledAt: z.string(),
});
export type PageDraft = z.infer<typeof PageDraftSchema>;
export type PostDraft = z.infer<typeof PostDraftSchema>;
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const draftKey = (userId: string, siteId: string, type: 'PAGE' | 'POST', entityId: string | null) =>
  `kd:editor-draft:v1:${JSON.stringify([userId, siteId, type, entityId])}`;
export const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export interface RecoveryDraft<T> { data: T; savedAt: number; baseUpdatedAt: string | null }

// One editing session owns its last payload, so cleanup cannot save the next site's form under the old key.
export class EditorDraftSession<T> {
  recovery: RecoveryDraft<T> | null = null;
  savedAt: number | null = null;
  latest: string;
  private expected: string | null = null;
  private written: string | null = null;
  private completed = false;
  private readonly baseline: string;

  constructor(private storage: DraftStorage | null, private key: string, data: T, private baseUpdatedAt: string | null, private schema: z.ZodType<T>) {
    this.baseline = this.latest = JSON.stringify(schema.parse(data));
    if (!storage) return;
    this.expected = storage.getItem(key);
    if (!this.expected) return;
    const envelope = z.object({ version: z.literal(1), savedAt: z.number().finite(), baseUpdatedAt: z.string().nullable(), data: schema });
    let parsed;
    try { parsed = envelope.safeParse(JSON.parse(this.expected)); } catch { /* Invalid browser data is never restored. */ }
    if (!parsed?.success || Date.now() - parsed.data.savedAt > DRAFT_MAX_AGE || parsed.data.savedAt > Date.now() + 60_000) {
      this.remove(); return;
    }
    const recovered = parsed.data as RecoveryDraft<T>;
    if (JSON.stringify(recovered.data) === this.baseline) { this.remove(); return; }
    this.recovery = recovered;
  }

  update(data: T) { this.latest = JSON.stringify(this.schema.parse(data)); }

  private checkStorage() {
    if (!this.storage) throw new Error('Penyimpanan browser tidak tersedia. Salin tulisan Anda sebelum meninggalkan editor.');
    if (this.storage.getItem(this.key) !== this.expected) throw new Error('Salinan berubah di tab lain. Simpan ke server atau salin tulisan Anda sebelum meninggalkan editor.');
    return this.storage;
  }

  private remove() {
    this.checkStorage().removeItem(this.key);
    this.expected = this.written = null; this.savedAt = null;
  }

  flush() {
    if (this.completed || this.recovery) return;
    if (this.latest === this.baseline) { if (this.expected) this.remove(); return; }
    if (this.latest === this.written) { this.checkStorage(); return; }
    const savedAt = Date.now();
    const value = JSON.stringify({ version: 1, savedAt, baseUpdatedAt: this.baseUpdatedAt, data: JSON.parse(this.latest) });
    this.checkStorage().setItem(this.key, value);
    this.expected = value; this.written = this.latest; this.savedAt = savedAt;
  }

  restore() {
    const draft = this.recovery;
    if (!draft) return null;
    this.latest = this.written = JSON.stringify(draft.data);
    this.baseUpdatedAt = draft.baseUpdatedAt;
    this.savedAt = draft.savedAt; this.recovery = null;
    return draft.data;
  }

  discardRecovery() { this.remove(); this.recovery = null; }

  savedToServer(data: T) {
    if (this.latest !== JSON.stringify(this.schema.parse(data))) { this.flush(); return; }
    // A different tab's snapshot belongs to that tab and must survive this save.
    if (this.storage?.getItem(this.key) === this.expected) this.remove();
    this.completed = true;
  }
}
