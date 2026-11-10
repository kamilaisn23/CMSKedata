# Data Catalog: Kedata CMS (rekonstruksi)

> Varian MySQL v1.0 (2026-11-10): model Prisma yang sama dipetakan ke InnoDB/utf8mb4 oleh builder; ID/foreign key VARCHAR(191), tanggal UTC ISO VARCHAR(32), isi HTML/JSON LONGTEXT. Unique dan foreign key dipertahankan. Tabel internal CmsRate untuk pembatasan permintaan lintas proses PHP, CmsLock untuk koordinasi backup/tulis. Ekspor migrasi mengabaikan Session dan mempertahankan ID/hash akun. SQLite asli tidak diubah. Lihat [INFINITYFREE.md](INFINITYFREE.md).

> Tahap 3 v0.4: Page/Post.status kini dapat bernilai IN_REVIEW, hanya lewat endpoint review. Catatan/aktor/waktu memakai AuditLog; snapshot memakai ContentVersion. Tidak menambah kolom/tabel; lihat [CONTENT_REVIEW.md](CONTENT_REVIEW.md).

> Tahap 3 v0.4: Page/Post.status kini dapat bernilai IN_REVIEW, hanya lewat endpoint review. Catatan/aktor/waktu memakai AuditLog; snapshot memakai ContentVersion. Tidak menambah kolom/tabel; lihat [CONTENT_REVIEW.md](CONTENT_REVIEW.md).

> Tambahan v0.3 (2026-11-09): format salinan browser dan retensi di [EDITOR_DRAFTS.md](EDITOR_DRAFTS.md). Tidak ada perubahan schema backend. Salinan editor bukan konten resmi.

> Tambahan katalog v0.2 (2026-11-09): model `SiteMembership(userId, siteId)` dengan primary key gabungan, index `siteId`, dan foreign key cascade ke User/Site; `User.memberships` serta `Site.memberships` adalah relasi balik. Peran didukung: ADMIN, MANAGER, EDITOR, PUBLISHER. Data User lama dipertahankan. Lihat [ACCESS_CONTROL.md](ACCESS_CONTROL.md) untuk migrasi dan aturan akses.

**Status:** Reconstructed — menunggu konfirmasi manusia  
**Versi:** 0.1 · **Sumber:** `prisma/schema.prisma` dan route/service code.  
DB provider yang ditemukan: SQLite. Tipe Prisma ditulis apa adanya; nilai JSON disimpan sebagai `String`, bukan kolom JSON tervalidasi.

## Entitas

Semua `id` bertipe `String @id @default(cuid())`, kecuali `PostTag` yang memakai primary key gabungan. `@updatedAt` diisi Prisma saat perubahan. `?` berarti nullable; `[]` relasi banyak.

| Entitas | Field teramati | Unique/index |
|---|---|---|
| **User** | `id`; `email String`; `name String`; `passwordHash String`; `role String @default("ADMIN")`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `sessions Session[]`. | Unique `email`. |
| **Session** | `id`; `token String`; `userId String`; `user User`; `expiresAt DateTime`; `createdAt DateTime @default(now())`. | Unique `token`. |
| **Site** | `id`; `name String`; `slug String`; `domain String`; `description String?`; `apiKeyHash String`; `apiKeyPrefix String`; `corsOrigins String @default("*")`; `webhookUrl String?`; `webhookSecret String?`; `rateLimit Int @default(120)`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; relasi `pages Page[]`, `posts Post[]`, `categories Category[]`, `tags Tag[]`, `media Media[]`, `menus Menu[]`, `setting SiteSetting?`. | Unique `slug`, `apiKeyHash`. |
| **SiteSetting** | `id`; `siteId String`; `site Site`; `siteTitle String`; `tagline String?`; `logoUrl String?`; `faviconUrl String?`; `contactEmail String?`; `contactPhone String?`; `socialLinks String @default("{}")`; `footerText String?`; `customMetadata String @default("{}")`; `updatedAt DateTime @updatedAt`. | Unique `siteId` (one-to-one site). |
| **Category** | `id`; `siteId String`; `site Site`; `name String`; `slug String`; `description String?`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `posts Post[]`. | Unique `(siteId, slug)`. |
| **Tag** | `id`; `siteId String`; `site Site`; `name String`; `slug String`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `posts PostTag[]`. | Unique `(siteId, slug)`. |
| **Page** | `id`; `siteId String`; `site Site`; `title String`; `slug String`; `contentHtml String @default("")`; `contentJson String @default("{}")`; `status String @default("DRAFT")`; `metaTitle String?`; `metaDescription String?`; `ogImage String?`; `publishedAt DateTime?`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`. | Unique `(siteId, slug)`. |
| **Post** | `id`; `siteId String`; `site Site`; `title String`; `slug String`; `excerpt String?`; `contentHtml String @default("")`; `contentJson String @default("{}")`; `featuredImage String?`; `status String @default("DRAFT")`; `categoryId String?`; `category Category?`; `publishedAt DateTime?`; `scheduledAt DateTime?`; `metaTitle String?`; `metaDescription String?`; `ogImage String?`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `tags PostTag[]`. | Unique `(siteId, slug)`. |
| **PostTag** | `postId String`; `tagId String`; `post Post`; `tag Tag`. | Composite primary key `(postId, tagId)`. |
| **ContentVersion** | `id`; `entityType String`; `entityId String`; `versionNumber Int`; `title String`; `contentHtml String`; `contentJson String`; `snapshotData String`; `createdBy String?`; `createdAt DateTime @default(now())`. | Index `(entityType, entityId)`. Tidak ada FK ke Page/Post atau unique versi. |
| **Media** | `id`; `siteId String?`; `site Site?`; `filename String`; `originalName String`; `mimeType String`; `sizeBytes Int`; `url String`; `altText String?`; `caption String?`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`. | Tidak ada index eksplisit. |
| **Menu** | `id`; `siteId String`; `site Site`; `name String`; `location String @default("HEADER")`; `itemsJson String @default("[]")`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`. | Tidak ada index eksplisit. |
| **AuditLog** | `id`; `siteId String?`; `actor String`; `action String`; `entityType String`; `entityId String?`; `details String @default("{}")`; `ipAddress String?`; `createdAt DateTime @default(now())`. | Index `(siteId)` dan `(entityType, entityId)`. |

## Relasi dan perilaku delete

- `User 1:N Session`; delete User menghapus Session (`onDelete: Cascade`).
- `Site 1:N Page/Post/Category/Tag/Menu`; delete Site cascade ke relasi tersebut.
- `Site 1:1 SiteSetting`; delete Site cascade ke setting.
- `Site 1:N Media?`; relasi Media opsional, delete Site mengatur `Media.siteId` menjadi null.
- `Category 1:N Post?`; `Post.categoryId` opsional; delete Category mengatur category post menjadi null.
- `Post 1:N PostTag` dan `Tag 1:N PostTag`; delete Post/Tag cascade ke join rows.
- FK yang dideklarasikan memakai `ON UPDATE CASCADE` pada database SQLite yang diperiksa.
- `AuditLog.siteId`, `ContentVersion.entityType/entityId`, dan identitas snapshot tidak memiliki relasi FK di schema.

## Nilai domain dan validasi aplikasi

Prisma tidak mendefinisikan enum. `status`, `role`, dan `location` adalah `String`; batasan yang terlihat berada di Zod/admin:

- Page: `DRAFT | PUBLISHED`.
- Post: `DRAFT | PUBLISHED | SCHEDULED`.
- Menu location: `HEADER | FOOTER | SIDEBAR`.
- User role default `ADMIN`, tetapi daftar nilai yang diterima tidak dibatasi schema.
- Site rate limit default 120; `SiteCreateSchema` menerima integer 10–1000.
- Slug divalidasi lowercase huruf/angka/hyphen pada sejumlah input, tetapi database hanya menegakkan unique constraint yang tercantum di atas.

## Risiko integritas yang ditemukan

1. Category dan Tag mempunyai `siteId`, tetapi FK PostTag hanya menghubungkan Post↔Tag dan schema tidak menjamin kategori/tag berada pada site yang sama dengan post.
2. `ContentVersion.entityId` bukan foreign key dan `(entityType,entityId,versionNumber)` tidak unik. Kode membuat nomor berikutnya lewat read-then-increment, sehingga duplikasi concurrent dimungkinkan; versi dapat tertinggal setelah konten dihapus.
3. Restore versi mengembalikan subset field saja; pembacaan `snapshotData` tidak dibungkus validasi format.
4. JSON-like fields disimpan sebagai string; database tidak memvalidasi JSON.
5. Index eksplisit terbatas pada ContentVersion/AuditLog; query list sering filter/sort berdasarkan site/status/dates tanpa index eksplisit selain unique indexes.
6. README menyebut PostgreSQL portability dengan mengganti provider, namun migrasi dan perilaku PostgreSQL tidak diverifikasi.
7. Ada schema/DB SQLite salinan di root dan `kedata-cms/`; file DB terlacak dan isinya tidak diaudit selain pemeriksaan struktur tanpa menampilkan row values.

## Bukti yang diuji

Schema root dan struktur tabel/constraint database sample SQLite diperiksa konsisten. Tidak ditemukan folder migration SQL; README mengarahkan `prisma db push`. Test kompatibilitas hanya memeriksa published/draft filtering dan hash API key untuk site seed; bukan cakupan lengkap relasi/cascade.
