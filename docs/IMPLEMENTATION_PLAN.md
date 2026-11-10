# Implementation Plan: Kedata CMS (baseline rekonstruksi)

> Varian deploy InfinityFree v1.0 (2026-11-10): pengguna memilih PHP 8.2+/PDO MySQL + React build, satu origin/domain, upload FTP ke htdocs, tanpa Docker/Node runtime. Implementasi di `hosting/infinityfree/`, builder `scripts/build-infinityfree.mjs`; source/data Node tidak diganti. Keputusan §3 Unknown di bawah hanya baseline Node; untuk varian ini platform sudah ditentukan. Urutan: backup konsisten → backend/SQL → pengujian MySQL terisolasi → ZIP terpisah dari SQL data → upload dan pemeriksaan oleh pengelola. Kriteria selesai dan rollback: [INFINITYFREE.md](INFINITYFREE.md).

> Tahap 4 v0.5 (2026-11-09): kalender editorial, endpoint scope anggota, bulan WIB, UI/filter/agenda/antrean, serta pengalihan sesi aktif dari root/login ke dashboard. Lihat [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md). Tanpa migrasi atau dependensi baru; backup menjadi tahap berikutnya.

> Tahap 3 v0.4 (2026-11-09): endpoint review, transaksi status/snapshot/audit, guard mutasi konten, dialog dan filter review, uji peran/situs/konflik. Detail [CONTENT_REVIEW.md](CONTENT_REVIEW.md); tanpa migrasi. Kalender dan backup tetap tahap berikutnya.

> Tahap 3 v0.4 (2026-11-09): endpoint review, transaksi status/snapshot/audit, guard mutasi konten, dialog dan filter review, uji peran/situs/konflik. Detail [CONTENT_REVIEW.md](CONTENT_REVIEW.md); tanpa migrasi. Kalender dan backup tetap tahap berikutnya.

> Tahap 2 v0.3 (2026-11-09): [EDITOR_DRAFTS.md](EDITOR_DRAFTS.md) menetapkan cadangan editor lokal, debounce 700 ms, pemulihan eksplisit, isolasi akun/situs/record, dan perlindungan gagal simpan. Tidak menambah endpoint atau mengubah database. Tahap 3–5 tetap berikutnya.

> Tambahan rencana v0.2 (2026-11-09): implementasikan fitur secara berurutan sesuai [ACCESS_CONTROL.md](ACCESS_CONTROL.md): hak akses → autosave → persetujuan → kalender → backup. Tahap pertama meliputi migrasi membership aditif, middleware default-deny, pengelolaan akun, UI sesuai izin, OpenAPI, dan uji HTTP pada DB sementara. Stack/arsitektur tetap. Kriteria selesai: kasus akses, lint/build lulus, tampilan diperiksa; tidak mereset atau seed database pengguna.

**Status:** Reconstructed — menunggu konfirmasi manusia  
**Versi:** 0.1 · **Tanggal:** 2026-11-06  
**Dasar:** repository, README, Prisma schema, tests, dan verifikasi lokal satu kali. Ini memotret kondisi saat ini; bukan rencana kerja yang disetujui. Pilihan arsitektur/deployment yang tidak teramati dibiarkan Unknown.

## 1. Arsitektur

**Observed:** monolith full-stack dalam satu proses: Express mengelola admin/public REST/feeds/static files dan memakai Vite middleware saat bukan production; frontend React disajikan dari `dist/` pada production. Prisma menyediakan akses DB. Tidak terlihat layanan FE/BE terpisah atau message queue.

**Risiko struktur:** tree serupa juga berada di `kedata-cms/`. File kunci (`package.json`, `server.ts`, `src/server/api/v1.ts`, schema, README) yang diperiksa identik byte-for-byte dengan versi root; belum ada keputusan sumber kebenaran. README clean-install menunjuk subfolder, sementara verifikasi lokal dilakukan dari root.

## 2. Layout Repository

| Lokasi | Isi teramati |
|---|---|
| `src/` | React UI, komponen, views, server-side API/security/auth/DB |
| `server.ts` | Entry point Express, mounts API, feeds, docs, health, Vite/static serving |
| `prisma/` | SQLite Prisma schema + seed; terdapat database sample terlacak di `prisma/prisma/dev.db` |
| `tests/` | 3 TypeScript test files, dijalankan `tsx --test` |
| `packages/client/` | SDK TypeScript |
| `examples/` | Next.js, Nuxt/Vue, React, static HTML, PHP/Laravel, curl |
| `kedata-cms/` | Salinan hampir sama termasuk app, schema, tests, examples dan DB sample |
| `docs/` | Artefak rekonstruksi ini; belum ada sebelumnya |

## 3. Deployment Platform

**Unknown.** Tidak ditemukan Dockerfile, Compose, CI workflow, Cloud Build, Cloud Run config, atau runbook deployment yang terlacak. README menjelaskan lokal SQLite dan local filesystem uploads; klaim tentang PostgreSQL/cloud storage adalah arah migrasi, bukan deploy yang terverifikasi. Server hardcodes port 3000 dan bind `0.0.0.0`; `PORT` template tidak digunakan.

## 4. Supporting Architecture / Stack

| Bagian | Implementasi teramati |
|---|---|
| Runtime | Node.js; sesi verifikasi menggunakan v24.19.0; README menyatakan Node 18+ dan menyarankan 20/22. |
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS; SPA. |
| Backend | Express 4 + TypeScript/tsx. |
| Database | Prisma 6 + SQLite, `DATABASE_URL`; schema `prisma/schema.prisma`. |
| Auth | bcryptjs, token sesi acak tersimpan di DB, cookie admin. API key per site di-hash SHA-256. |
| Validation | Zod schemas di `src/server/security.ts`. |
| Testing | Node built-in test runner via `tsx --test`; tidak tampak Jest/Vitest/Supertest. |
| Lint/typecheck | `npm run lint` menjalankan `tsc --noEmit`; bukan ESLint. |
| Media | Upload lokal ke `public/uploads`. |
| Deployment | Unknown; belum ada CI/deploy manifests. |

## 5. Task Breakdown Baseline

### Sudah teramati/dijalankan

| ID | Task | Status/bukti |
|---|---|---|
| B0 | Implementasi CMS multi-site, dashboard, REST API, schema, seed, contoh integrasi. | Observed di source/README; status produk belum dikonfirmasi. |
| B1 | Verifikasi lokal dari root tanpa mengubah source atau tracked DB. | Dijalankan: dependency dipasang tanpa memperbarui lockfile; test 9/9 lulus memakai salinan DB di scratch; lint lulus; build lulus; `/`, `/health`, `/docs`, `/openapi.json` memberi HTTP 200. |

### Backlog yang perlu konfirmasi/prioritas

| ID | Gap/pekerjaan | Bukti dan acceptance awal | Prioritas |
|---|---|---|---|
| B2 | Sinkronkan lockfile npm dengan manifest dan buktikan `npm ci` bersih. | `npm ci --dry-run` gagal karena entri dependency/platform hilang dari `package-lock.json`; npm install tanpa lock berhasil. Uji `npm ci`, test, lint, build setelah perubahan. | Inferred; perlu persetujuan |
| B3 | Tetapkan direktori kanonis dan hapus/otomasi sinkronisasi salinan. | README menunjuk `kedata-cms/`, tetapi root/subfolder memiliki salinan identik untuk file utama. Jangan hapus sebelum konfirmasi. | Unknown |
| B4 | Audit `cookies.txt`, kedua DB sample, demo key/fallback dan output seed. | File cookie + DB terlacak; isi cookie belum diperiksa; seed menulis kredensial/kunci ke stdout. Klasifikasikan fixture vs secret/data, lalu rotasi/hapus jika perlu. | P0 jika credential aktif; belum diketahui |
| B5 | Verifikasi kebocoran field sensitif di response admin Site. | Route mengembalikan object Prisma penuh; perlu uji/konfirmasi field yang diekspos dan persetujuan kontrak sebelum mengubahnya. | Inferred |
| B6 | Lengkapi coverage untuk kontrak, media, RBAC, relation/same-site, session expiry, version restore, error paths. | Test suite ada 9 kasus tetapi cakupannya terbatas; tidak ada Test Plan produk. | Inferred |
| B7 | Putuskan konfigurasi production: host/port, database, storage, secrets, migrations, backups, deployment. | Belum ada artefak deployment dan PORT tidak dipakai. | Unknown |

Task B2 adalah dugaan perbaikan paling langsung dari kegagalan `npm ci`; perubahan source lain tidak dimulai sebelum artefak dan scope dikonfirmasi.

## 6. Endpoint Surface

Source path dan kontrak saat ini diringkas di `API_CONTRACTS.md`: 9 public GET REST routes; 35 admin routes; feeds, health, OpenAPI dan Swagger UI. Public endpoints serta admin CRUD dipasang dari `server.ts`; OpenAPI yang ditulis manual hanya menggambarkan public API.

## 7. Data Model

SQLite Prisma, 13 models. Field/relasi/constraint/risiko ada di `DATA_CATALOG.md`. Tidak ada migrations SQL teramati; README menggunakan `prisma db push`. Database sample terlacak dan tidak boleh ditimpa tanpa backup serta persetujuan.

## 8. Environment Variables

Inventaris dan drift lengkap ada di `ENVIRONMENT_VARIABLES.md`. Ringkas: `DATABASE_URL`, `NODE_ENV`, `ADMIN_*`, `DISABLE_HMR`, dan env integrasi examples; `.env.example` mencantumkan pula variabel yang belum terbukti dibaca aplikasi. Jangan menganggap `.env.example` kontrak runtime.

## 9. Dependencies dan Milestone

- **Observed:** `package.json` dan `package-lock.json` ada di root; tidak ada lockfile npm di `kedata-cms/`; `bun.lock` memiliki versi Prisma/Prisma Client berbeda dari manifest dan tidak mencantumkan plugin React. Package `npm ci` tidak lolos preflight pada sesi ini.
- **Observed:** `npm run dev`, `build`, `lint`, `seed`, `test` tersedia. `clean` memakai sintaks `rm -rf`, kompatibilitas Windows belum diuji.
- **Unknown:** milestone/tanggal rilis, owner, target production, CI trigger, dan dependency update policy.

## 10. Definition of Done Baseline

Untuk perbaikan teknis berikutnya, definisi minimal yang **diusulkan, belum disetujui**:

- Install reproducible dari clean checkout memakai satu package manager/lockfile yang diputuskan.
- `npm test`, `npm run lint`, `npm run build` pass; test database memakai DB terisolasi, bukan database tracked.
- Endpoint yang disentuh diuji dengan HTTP request dan status/response diverifikasi.
- Tidak ada tracked secret/PII yang tidak disengaja; source DB sample tidak tertimpa.
- Docs/contracts/env diperbarui bila perilaku berubah.
- Risiko deployment/security yang belum ditangani dilaporkan eksplisit.

**Open gates:** dokumen berstatus Reconstructed; user perlu memastikan direktori kanonis, maksud product, dan risk flags sebelum rencana ini diperlakukan sebagai Approved.
