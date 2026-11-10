# API Contracts: Kedata CMS (rekonstruksi)

> Varian PHP/InfinityFree v1.0 (2026-11-10): path/payload admin dan public dipertahankan, PDO MySQL, cookie sesi yang sama, scope/peran yang sama. Backup varian menggunakan GET `/api/admin/backups/export` (ADMIN, ZIP berisi schema.sql + data.sql + uploads; tanpa Session); restore melalui phpMyAdmin. Paket backup SQLite lama tidak diterima langsung. Draft preview mensyaratkan sesi penerbit yang berhak selain token preview; respons preview no-store. Endpoint `/setup` terkunci bila User ada, memerlukan setup_token privat untuk instalasi kosong. InfinityFree dapat memblokir API eksternal. Lihat [INFINITYFREE.md](INFINITYFREE.md).

> Kontrak v0.4: GET `/api/admin/calendar?month=YYYY-MM&siteId=opsional`, scope akun/situs dan format respons di [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md), tersedia di `/admin-openapi.json`. Autentikasi backend tetap berlaku; pengalihan sesi aktif hanya mengubah alur frontend.

> Kontrak review v0.3: GET/POST `/api/admin/{pages|posts}/:id/review`, bentuk body, status error, dan aturan penguncian di [CONTENT_REVIEW.md](CONTENT_REVIEW.md); tersedia juga di `/admin-openapi.json`. Update/delete/restore lama dapat membalas 409 jika versi/status berubah selama proses.

> Kontrak review v0.3: GET/POST `/api/admin/{pages|posts}/:id/review`, bentuk body, status error, dan aturan penguncian di [CONTENT_REVIEW.md](CONTENT_REVIEW.md); tersedia juga di `/admin-openapi.json`. Update/delete/restore lama dapat membalas 409 jika versi/status berubah selama proses.

> Tambahan kontrak v0.2 (2026-11-09): aturan akses, endpoint akun, `me.siteIds`, penyaringan situs/media, dan query upload mengikuti [ACCESS_CONTROL.md](ACCESS_CONTROL.md). Spesifikasi mesin: `/admin-openapi.json`. Route admin selain login/logout memeriksa peran dan penugasan; 403 berarti dilarang. Baseline yang hanya menyebut pemeriksaan login telah digantikan.

**Status:** Reconstructed — menunggu konfirmasi manusia  
**Versi:** 0.1 · **Sumber:** `src/server/server.ts`, `src/server/api/*.ts`, `src/server/feeds.ts`, `src/server/openapi.ts`, Zod schemas.  
Ini mencatat kontrak yang saat ini terimplementasi, bukan kontrak produk yang disetujui. Status untuk error DB/Multer yang tidak dipetakan eksplisit ditandai tidak diketahui.

## Konvensi

- JSON API publik normalnya memakai `{ data, meta, error }`; endpoint admin normalnya `{ data, error }`, tetapi shape tidak seragam pada semua error.
- Site API key dapat dikirim di header `x-api-key` atau query `apiKey`. Missing/invalid: `401`; habis kuota: `429`. Batas per site berasal dari `Site.rateLimit` (fallback 120/menit). Header kuota: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Respons publik sukses memakai `ETag`, `Cache-Control: public, max-age=60, stale-while-revalidate=300`; `If-None-Match` yang sama menghasilkan `304`.
- Admin: `POST /api/admin/login` dan `/logout` tidak memerlukan sesi. Semua route admin berikutnya memakai `requireAdmin`; sesi dari cookie `kd_cms_session` atau header `x-admin-token`; tanpa sesi valid: `401`.
- Sesi tujuh hari; cookie HttpOnly, SameSite=Lax, Secure hanya saat `NODE_ENV=production`.
- Path lengkap admin mendapat prefix `/api/admin`; public API mendapat `/api/v1`.

## Public REST API

Semua path di bawah memerlukan API key. Hanya metode GET didefinisikan.

| Method/path | Input | Output/status teramati |
|---|---|---|
| `GET /api/v1/pages` | Query `page` default 1; `perPage` default 20, clamp 1–100; `fields` comma-separated. | Daftar page terbit milik site, terbaru dibuat dahulu; `{data:[...],meta:{page,perPage,total,totalPages},error:null}`; `200`. |
| `GET /api/v1/pages/:slug` | Path `slug`; query `preview`, `fields`. | Page; status bukan PUBLISHED tanpa token preview site-derived → `404 PAGE_NOT_PUBLISHED`; tidak ada → `404 PAGE_NOT_FOUND`; sukses `200`, meta null. |
| `GET /api/v1/posts` | Query `page` default 1; `perPage` default 10, clamp 1–100; `search`; `category` slug; `tag` slug; `sort` (`publishedAt`,`createdAt`,`title`, default `publishedAt`); `order` (`asc` atau `desc`, default `desc`); `fields`; `include` comma-separated. | Post terbit; filter, pagination; sort tidak dikenal fallback `publishedAt desc`; category/tags disertakan jika diminta atau tanpa `fields`; `200` + meta pagination. |
| `GET /api/v1/posts/:slug` | Path `slug`; query `preview`, `fields`. | Post + category/tags; belum terbit tanpa preview yang cocok → `404 POST_NOT_PUBLISHED`; tidak ada → `404 POST_NOT_FOUND`; sukses `200`. |
| `GET /api/v1/categories` | — | Kategori site, urut nama, `postCount` menghitung post terbit; `200`. |
| `GET /api/v1/tags` | — | Tag site, urut nama, `postCount` menghitung relasi post tanpa filter status; `200`. |
| `GET /api/v1/menus` | Query opsional `location` (diubah uppercase). | Menu site; `itemsJson` di-parse, parse gagal → `[]`; `200`. |
| `GET /api/v1/settings` | — | Setting site atau fallback dari site + null/empty defaults jika tidak ada; `200`. |
| `GET /api/v1/media/:id` | Path `id`. | Metadata media untuk site itu atau media global (`siteId=null`); tidak ada → `404 MEDIA_NOT_FOUND`; sukses `200`. |

Bentuk error autentikasi/kuota: `{data:null,meta:null,error:{code,message}}`. API middleware juga mengembalikan `500 SERVER_ERROR` pada kegagalan middleware, dengan pesan runtime yang berasal dari error.

**Preview:** implementasi membandingkan `preview` dengan token berpola `kd_preview_<siteId>`; bukan token acak/rahasia yang dikelola. `OPTIONS` ditangani setelah API key tervalidasi; CORS mengizinkan GET/OPTIONS untuk origin yang dikonfigurasi.

## Admin API

Semua route pada tabel ini selain login/logout memerlukan sesi admin. Body JSON kecuali upload multipart.

| Method/path | Input utama | Hasil/status eksplisit |
|---|---|---|
| `POST /api/admin/login` | JSON `email`, `password` | Validasi `400`; kredensial salah `401`; 5 gagal/IP → lock 5 menit dan `429`; berhasil `200`, set cookie, user + token. |
| `POST /api/admin/logout` | Cookie sesi opsional | Hapus sesi bila ada, bersihkan cookie; `200`. |
| `GET /api/admin/me` | — | User sesi; `200`. |
| `GET /api/admin/sites` | — | Site terbaru dahulu + count pages/posts/categories/tags/media; `200`. Objek model dikirim tanpa field selection. |
| `POST /api/admin/sites` | `SiteCreate` | Validasi/slug duplikat `400`; create site + setting awal; `201`, API key mentah ditampilkan sekali. |
| `PUT /api/admin/sites/:id` | Path `id`; partial `SiteCreate` | `200`; record tak ada/DB error tidak dipetakan eksplisit. |
| `POST /api/admin/sites/:id/regenerate-api-key` | Path `id`; tanpa body | Tidak ada site `404`; rotasi dan key sekali `200`. |
| `DELETE /api/admin/sites/:id` | Path `id` | Jika satu site tersisa `400 MIN_ONE_SITE`; jika terhapus `200`; missing id tidak dipetakan eksplisit. |
| `GET /api/admin/pages` | Query wajib `siteId` | Tanpa `siteId` `400 SITE_REQUIRED`; list terbaru dahulu `200`. |
| `POST /api/admin/pages` | Query wajib `siteId`; `PageInput` | siteId/validasi/slug duplikat `400`; HTML disanitasi; `201`, publishedAt/webhook bila PUBLISHED. |
| `PUT /api/admin/pages/:id` | Path `id`; `PageInput` | Tidak ada page `404`; validasi `400`; snapshot versi + sanitasi + update; `200`. |
| `DELETE /api/admin/pages/:id` | Path `id` | Tidak ada page `404`; delete + webhook; `200`. |
| `GET /api/admin/posts` | Query wajib `siteId` | Tanpa siteId `400`; list + category/tags `200`. |
| `POST /api/admin/posts` | Query wajib `siteId`; `PostInput` | siteId/validasi/slug duplikat `400`; sanitasi HTML; `201`; published trigger webhook. |
| `PUT /api/admin/posts/:id` | Path `id`; `PostInput` | Missing `404`; validasi `400`; snapshot, replace tag links, update; `200`. |
| `DELETE /api/admin/posts/:id` | Path `id` | Missing `404`; delete + webhook; `200`. |
| `GET /api/admin/versions/:entityType/:entityId` | Path `entityType`, `entityId` | Riwayat terbaru dahulu; `200`. |
| `POST /api/admin/versions/:id/restore` | Path version `id` | Missing `404`; PAGE/POST dipulihkan sebagian dari snapshot `200`; tidak dapat restore `400 CANNOT_RESTORE`. |
| `GET /api/admin/categories` | Query wajib `siteId` | Tanpa siteId `400`; list alfabetis + count post; `200`. |
| `POST /api/admin/categories` | Query `siteId`; `CategoryInput` | Validasi `400`; create `201`; tidak ada validasi siteId eksplisit. |
| `DELETE /api/admin/categories/:id` | Path `id` | Delete `200`; missing/error tidak dipetakan eksplisit. |
| `GET /api/admin/tags` | Query wajib `siteId` | Tanpa siteId `400`; list alfabetis + related count; `200`. |
| `POST /api/admin/tags` | Query `siteId`; `TagInput` | Validasi `400`; create `201`; tidak ada validasi siteId eksplisit. |
| `DELETE /api/admin/tags/:id` | Path `id` | Delete `200`; missing/error tidak dipetakan eksplisit. |
| `GET /api/admin/media` | Query opsional `siteId` | Tanpa siteId: semua media; dengan siteId: milik site + global; `200`. |
| `POST /api/admin/media/upload` | Multipart file field `file`; opsional `siteId`, `altText`, `caption` | JPEG/PNG/WebP/PDF, maksimal 5 MiB; file hilang `400 NO_FILE`; sukses `201`; error Multer tidak dipetakan eksplisit. |
| `PUT /api/admin/media/:id` | Path `id`; JSON `{altText,caption}` | Update `200`; validasi/missing tidak dipetakan eksplisit. |
| `DELETE /api/admin/media/:id` | Path `id` | Missing `404`; hapus berkas lokal best-effort + record; `200`. |
| `GET /api/admin/menus` | Query wajib `siteId` | Tanpa siteId `400`; list `200`. |
| `POST /api/admin/menus` | Query `siteId`; `MenuInput` | Validasi `400`; create `201`; tidak ada validasi siteId eksplisit. |
| `PUT /api/admin/menus/:id` | Path `id`; `MenuInput` | Validasi `400`; update `200`; missing tidak dipetakan eksplisit. |
| `GET /api/admin/settings` | Query wajib `siteId` | Tanpa siteId `400`; setting atau null `200`. |
| `PUT /api/admin/settings` | Query wajib `siteId`; `SiteSettingInput` | Tanpa siteId/validasi `400`; upsert `200`. |
| `GET /api/admin/audit-logs` | Query `page` default 1; `perPage` default 25 clamp 1–100; opsional `siteId`,`action` | Log terbaru dahulu + pagination; `200`. |
| `POST /api/admin/cron/publish` | Tanpa body | Memublikasikan semua post due lintas site, mengirim webhook; jumlah + IDs; `200`. Route hanya dilindungi sesi admin, tidak ada credential cron terpisah. |

### Skema body yang teramati

- `SiteCreate`: wajib `name` (min 2), `slug` (lowercase alphanumeric/hyphen, min 2), `domain` (min 3). Opsional `description`, `corsOrigins` (default `*`), `webhookUrl` (URL atau kosong), `webhookSecret`, `rateLimit` integer 10–1000 (default 120). `SiteUpdate` merupakan partial.
- `PageInput`: wajib `title` non-empty dan slug lowercase/digit/hyphen. `contentHtml` default `''`; `contentJson` default `'{}'`; `status` `DRAFT|PUBLISHED` default `DRAFT`; opsional `metaTitle`,`metaDescription`,`ogImage`.
- `PostInput`: wajib `title`, slug; optional `excerpt`, `featuredImage`, `categoryId` nullable, `tagIds` default `[]`, `scheduledAt` nullable string, metadata SEO; content defaults sama; `status` `DRAFT|PUBLISHED|SCHEDULED` default `DRAFT`.
- `CategoryInput`: wajib `name`,`slug`; opsional `description`. `TagInput`: wajib `name`,`slug`. Slug lowercase/digit/hyphen.
- `MenuInput`: wajib `name`; `location` `HEADER|FOOTER|SIDEBAR` default `HEADER`; `itemsJson` string default `'[]'`.
- `SiteSettingInput`: wajib `siteTitle`; opsional tagline/logo/favicon/contactEmail/contactPhone/footerText; `socialLinks` dan `customMetadata` string default `'{}'`.
- Login: email valid, password minimal 6 karakter.

## Feeds, dokumentasi, dan utilitas

| Method/path | Input | Output/status |
|---|---|---|
| `GET /rss.xml`, `/api/v1/rss.xml` | Query `site` opsional, default `kedata-tech` | RSS XML, sampai 20 post terbit; site tak ada `404`; gagal `500`; cache 300 detik. |
| `GET /sitemap.xml`, `/api/v1/sitemap.xml` | Query `site` opsional, default `kedata-tech` | XML sitemap home + pages/posts terbit; site tak ada `404`; gagal `500`; cache 600 detik. |
| `GET /robots.txt` | — | Plain text `200`. |
| `GET /openapi.json` | — | OpenAPI 3.0.3 JSON `200`, CORS `*`. Spec hanya mendeskripsikan public API, bukan admin/feeds. |
| `GET /docs` | — | HTML Swagger UI `200`; aset diambil dari CDN eksternal. |
| `GET /health` | — | `{status:'healthy',timestamp}` `200`; tidak terlihat memeriksa DB. |
| `GET /uploads/*` | Path file | File statis dari folder lokal `public/uploads` bila ada. |

## Aspek yang belum dipastikan / risiko kontrak

- Beberapa handler mengirim objek Site penuh dari Prisma; perlu memverifikasi respons agar `apiKeyHash`/`webhookSecret` tidak terpapar.
- Middleware API publik mengizinkan query `apiKey`; token berpotensi masuk log/referrer. Fallback prefix/slug hanya mensyaratkan cookie admin ada, bukan validasi sesi admin di middleware tersebut.
- Preview token deterministik dari ID site. Error middleware API menyertakan `err.message`.
- Error status pada sebagian operasi DB, record hilang, dan upload Multer tidak memiliki kontrak eksplisit.
- OpenAPI yang dihasilkan bukan inventaris lengkap dan dapat berbeda dari kode; contoh PHP/Next/Vue juga bukan kontrak implementasi utama.
