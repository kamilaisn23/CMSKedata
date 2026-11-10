# Deploy Kedata CMS ke Vercel — varian serverless

Tanggal 10 November 2026. Target: hosting gratis di Vercel (Hobby) dengan database Neon PostgreSQL dan media di Vercel Blob. Aplikasi utama Node/SQLite di lokal tidak berubah.

## Arsitektur varian

| Komponen | Penanganan |
|---|---|
| Frontend React | `npm run build` (Vite) — disajikan Vercel dari `dist/` |
| Backend Express | Satu fungsi serverless catch-all `api/index.ts` yang memasang `src/server/vercel-app.ts` (router `api/v1`, `api/admin`, feeds sama dengan aplikasi utama) |
| Database | Neon PostgreSQL — schema `hosting/vercel/schema.prisma` (model identik, provider postgresql) |
| Upload media | Vercel Blob (`@vercel/blob`), batas 4 MB per file di varian ini (batas body serverless) |
| Backup ZIP | Dinonaktifkan di Vercel (balas 503 dengan pesan) — filesystem read-only; pakai ekspor Neon |
| Publikasi terjadwal | Tetap diproses saat request publik + Vercel Cron `/api/cron/publish` 1×/hari (batas Hobby) |
| Docs & OpenAPI | File statis hasil `scripts/export-openapi.mjs` di `public/openapi.json`, `public/docs/` |

Perubahan pada aplikasi utama bersifat kondisional lewat `process.env.VERCEL` (hanya aktif di Vercel): upload multer memakai memory + Blob, backup router membalas 503. Perilaku lokal tidak berubah (test access/backups/calendar/editor-drafts tetap lolos).

## File varian

- `api/index.ts` — entry fungsi serverless
- `src/server/vercel-app.ts` — Express app untuk serverless + endpoint cron
- `vercel.json` — build command (`prisma generate` postgres + export OpenAPI + `vite build`), rewrites `/health`, `/rss.xml`, `/sitemap.xml`, `/robots.txt`, SPA fallback, cron
- `hosting/vercel/schema.prisma` — schema PostgreSQL (+ generator `clientMigrate` terpisah untuk skrip)
- `scripts/export-openapi.mjs` — tulis spec OpenAPI + aset Swagger ke `public/`
- `scripts/migrate-vercel.mjs` — pindahkan data SQLite lokal ke Neon (read-only snapshot; buat tabel; `--force` untuk timpa)
- `tests/vercel.test.ts` — uji wiring serverless (health, feeds dua path, auth API key, login cookie, cron, 404)

## Langkah deploy

### 1. Dorong kode ke GitHub

Vercel menarik kode dari Git; tidak ada file yang di-upload manual. Pastikan seluruh perubahan sudah ter-commit dan ter-push ke `kamilaisn23/CMSKedata` (branch `main`). Jangan commit `.env`, `public/openapi.json` (hasil build), atau `hosting/vercel/generated-migrate/` — sudah ada di `.gitignore`.

### 2. Buat database Neon

1. Daftar di neon.com (gratis) → buat project.
2. Ambil **pooled connection string** dari dashboard (berakhiran `-pooler...neon.tech/...?sslmode=require`), format `postgresql://user:pass@host/db?sslmode=require`.

### 3. Migrasikan data lokal (di komputer ini)

```
npm run migrate:vercel -- --database-url "postgresql://...neon.tech/...?sslmode=require"
```

Skrip ini membuat tabel di Neon, lalu menyalin Site, User (termasuk password hash — akun lama tetap bisa login), konten, media, menu, audit. Sumber SQLite hanya dibaca lewat snapshot di `.backups/vercel-migration/`. Tambah `--force` untuk menimpa data yang sudah ada. Tanpa argumen, skrip hanya menampilkan pesan penggunaan.

### 4. Buat Storage Blob di Vercel

1. Dashboard Vercel → project Anda → tab **Storage** → **Create Database** → **Blob**.
2. Hubungkan ke project; env `BLOB_READ_WRITE_TOKEN` otomatis ditambahkan.

### 5. Import project di Vercel

1. vercel.com → **Add New... Project** → import repo `kamilaisn23/CMSKedata`.
2. Di field **Project Name**, isi `cms` (jangan biarkan default nama repo) — nama project menentukan URL produksi, mis. `cms-<nama-akun>.vercel.app`. Kalau project sudah ter-import dengan nama lain: **Settings → General → Rename Project**.
3. Framework: Vite (terdeteksi otomatis). Build command dan output sudah diatur `vercel.json` — jangan ditimpa di dashboard.
4. Environment Variables (Production):
   - `DATABASE_URL` = connection string Neon (langkah 2)
   - `BLOB_READ_WRITE_TOKEN` = otomatis dari langkah 4 (periksa ada)
   - `CRON_SECRET` (opsional tapi disarankan) = string acak ≥32 karakter; cron memakai header `Authorization: Bearer <CRON_SECRET>`
5. **Deploy**. Build menjalankan: generate klien Prisma PostgreSQL → export OpenAPI → `vite build`.

### 6. Verifikasi pasca-deploy

- `https://<domain>.vercel.app/health` → `{"status":"healthy",...,"backend":"vercel-serverless"}`
- Login dashboard `/login` dengan akun CMS lama (email + password yang sama dengan lokal)
- Simpan draf, cek `/rss.xml`, `/sitemap.xml`, `/docs`, `/api/v1/posts` dengan API key situs
- Upload gambar kecil (≤4 MB) → URL media harus berupa `https://<akun>.public.blob.vercel-storage.com/...`
- `/api/admin/backups` → harus membalas 503 BACKUP_UNAVAILABLE (memang dibatasi)

### 7. Update selanjutnya

Push ke `main` → Vercel otomatis build ulang. Perubahan schema: sunting `hosting/vercel/schema.prisma` (dan `prisma/schema.prisma` agar model sinkron), lalu `npm run migrate:vercel -- --database-url ... --force` bila perlu.

## Batas dan catatan

- Hobby: fungsi serverless batas body ±4,5 MB → upload media varian ini dibatasi 4 MB (`admin.ts`).
- Cron hanya 1×/hari di Hobby; konten terjadwal tetap terbit saat ada request publik yang menyentuh API.
- Media lama dengan URL `/uploads/...` tidak ada di Vercel (folder lokal kosong saat migrasi ini; URL media lama di database memakai host eksternal). Bila kelak ada file lokal, upload ulang lewat dashboard.
- Cookie sesi `SameSite=Lax` + `secure` — same-origin di domain vercel.app, login bekerja tanpa konfigurasi CORS.
- Rate limiter & pembatas login in-memory per-instance serverless — berlaku per region/instance, bukan global.
- SDK/API eksternal dan webhook keluar bekerja dari Vercel (tidak diblokir seperti InfinityFree).

## Verifikasi yang sudah dilakukan lokal

- `npm run lint` lolos; `npx prisma validate --schema hosting/vercel/schema.prisma` valid (dengan DATABASE_URL postgres).
- `npx tsx --test tests/vercel.test.ts` → 7/7 lolos (health, feeds dua path, penolakan tanpa API key, login+cookie+/me, cron dengan secret, 404).
- Regresi aplikasi utama: access 13/13, calendar, editor-drafts, security, api-compatibility lolos.
- `node scripts/export-openapi.mjs` menghasilkan aset docs.
- Deploy nyata ke akun Vercel/Neon milik pengguna belum dijalankan dari sini — perlu akun dan akses dashboard pengguna.
