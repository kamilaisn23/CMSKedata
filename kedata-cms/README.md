# Kedata CMS - Headless Multi-Website Content Management System

Kedata CMS adalah platform Headless Content Management System yang dirancang untuk arsitektur multi-website terpadu (*framework-agnostic*). Satu dasbor admin tunggal mengelola konten untuk beragam situs web dan platform klien dengan teknologi berbeda (Next.js, Vue, Nuxt, React, Angular, Svelte, PHP/Laravel, HTML statis, maupun aplikasi mobile).

---

## 🎨 Desain & Identitas Visual
- **Slate Blue (`HEX #6C7A89`)**: Warna primer untuk teks judul, ikon, tombol utama, dan aksen penting.
- **Muse (`HEX #DFE2DC`)**: Warna latar belakang netral, panel, dan area kanvas.
- **Dark Mode Support**: Mendukung peralihan mode gelap dan terang secara mulus.

---

## 🚀 Panduan Instalasi & Menjalankan dari Mesin Bersih

### 1. Prasyarat
- Node.js versi 18+ (disarankan Node.js 20 atau 22)
- npm 9+

### 2. Langkah Instalasi
```bash
# Pindah ke direktori proyek kedata-cms
cd kedata-cms

# 1. Salin konfigurasi environment
cp .env.example .env

# 2. Pasang dependensi
npm install

# 3. Sinkronkan skema database SQLite (Prisma)
npx prisma generate
npx prisma db push

# 4. Jalankan seeding data awal (Akun admin, 2 situs contoh, artikel, halaman, menu)
npm run seed

# 5. Jalankan server pengembangan
npm run dev
```

Server akan aktif di: **`http://localhost:3000`**

---

## 🔑 Kredensial Login Awal

Akun admin tunggal otomatis dibuat melalui script seed dari variabel `.env` (tanpa hardcode password):
- **URL Login Dasbor**: `http://localhost:3000`
- **Email**: `admin@kedata.id` (dapat diubah via `ADMIN_EMAIL` di `.env`)
- **Password**: `KedataAdmin2026!` (dapat diubah via `ADMIN_PASSWORD` di `.env`)

---

## 📊 Database Schema & ERD (Entity Relationship Diagram)

Skema dirancang menggunakan Prisma ORM dengan SQLite untuk kemudahan portabilitas prototipe lokal, dan 100% kompatibel untuk dipindahkan ke PostgreSQL (hanya dengan mengubah `provider = "postgresql"` di `prisma/schema.prisma`).

```
+----------------------------------------------------------------------------+
|                                    USER                                    |
| id (PK) | email (UQ) | name | passwordHash | role ("ADMIN") | createdAt    |
+----------------------------------------------------------------------------+
                                      | 1
                                      | N
+----------------------------------------------------------------------------+
|                                  SESSION                                   |
| id (PK) | token (UQ) | userId (FK) | expiresAt | createdAt                 |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                                    SITE                                    |
| id (PK) | name | slug (UQ) | domain | description | apiKeyHash (UQ)        |
| apiKeyPrefix | corsOrigins | webhookUrl | webhookSecret | rateLimit        |
+----------------------------------------------------------------------------+
       | 1                | 1             | 1            | 1          | 1
       | 1                | N             | N            | N          | N
+--------------+   +-------------+  +------------+  +-----------+  +---------+
| SITE_SETTING |   |    PAGE     |  |    POST    |  | CATEGORY  |  |   TAG   |
| siteId (FK)  |   | siteId (FK) |  | siteId(FK) |  | siteId(FK)|  |siteId(FK|
| siteTitle    |   | title, slug |  | title, slug|  | name, slug|  |name,slug|
| tagline      |   | contentHtml |  | excerpt    |  |description|  +---------+
| logoUrl      |   | contentJson |  |contentHtml |  +-----------+       | 1
| socialLinks  |   | status      |  |contentJson |       | 1            | N
| footerText   |   | metaTitle   |  |status      |       | N      +----------+
+--------------+   | metaDesc    |  |category(FK)|-------+        | POST_TAG |
                   | ogImage     |  |publishedAt |----------------| postId   |
                   +-------------+  |scheduledAt |                | tagId    |
                                    | ogImage    |                +----------+
                                    +------------+

+----------------------------------------------------------------------------+
|                               CONTENT_VERSION                              |
| id (PK) | entityType ("PAGE"|"POST") | entityId | versionNumber | title    |
| contentHtml | contentJson | snapshotData (JSON) | createdBy | createdAt    |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                                   MEDIA                                    |
| id (PK) | siteId (FK) | filename | originalName | mimeType | sizeBytes     |
| url | altText | caption | createdAt                                        |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                                    MENU                                    |
| id (PK) | siteId (FK) | name | location ("HEADER"|"FOOTER"|"SIDEBAR")      |
| itemsJson ([{ id, label, url, target, children }]) | updatedAt             |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                                 AUDIT_LOG                                  |
| id (PK) | siteId | actor | action | entityType | entityId | details (JSON) |
| ipAddress | createdAt                                                      |
+----------------------------------------------------------------------------+
```

---

## 🌟 Fitur Dashboard Admin

1. **Autentikasi & Keamanan Sesi**:
   - Proteksi brute force login (maksimal 5 percobaan salah per IP).
   - Password di-hash menggunakan `bcrypt` dengan salt rounds teruji.
   - Sesi berbasis token unik di database dengan cookie `httpOnly`, `sameSite: 'lax'`, dan `secure`.
2. **Multi-Site Management**:
   - CRUD situs: nama, slug unik, domain publik, deskripsi, CORS origins (bisa wildcard `*`), URL webhook, dan batas kuota rate limit.
   - API Key otomatis di-generate saat situs dibuat; kunci raw ditampilkan sekali, sedangkan hash SHA-256 disimpan di database.
   - Tombol **Regenerate API Key** untuk rotasi kunci keamanan secara instan.
   - Pemilih situs aktif di header atas yang secara otomatis mengisolasi seluruh konten.
3. **Halaman (Pages)**:
   - Judul, slug unik per situs, status (Draft / Published).
   - Editor rich-text TipTap WYSIWYG lengkap dengan toolbar format.
   - Output ganda: HTML yang disanitasi terhadap XSS dan JSON AST terstruktur.
   - Pengaturan SEO lengkap: Meta Title, Meta Description, dan OpenGraph Image.
4. **Artikel/Berita (Posts)**:
   - Judul, slug, ringkasan (excerpt), TipTap rich text, gambar utama (featured image).
   - Taksonomi: Kategori tunggal dan banyak Tag per artikel.
   - Status: `DRAFT`, `PUBLISHED`, dan `SCHEDULED`.
   - Jadwal Terbit: Artikel dengan status "SCHEDULED" otomatis terbit ketika waktu `scheduledAt` tercapai.
5. **Kategori dan Tag per Situs**:
   - Pengelompokan taksonomi terisolasi per situs dengan slug unik dan penghitung jumlah artikel terkait.
6. **Media Library**:
   - Upload file dengan validasi whitelist ketat (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) dan batas ukuran 5 MB.
   - Nama berkas otomatis disanitasi dan diacak (`kd_<basename>_<hex>.<ext>`) untuk mencegah file overwriting atau path traversal.
   - Pratinjau berkas, tombol Salin URL, editor Alt Text dan Caption, serta konfirmasi hapus permanen.
7. **Menu Navigasi Bertingkat**:
   - Dukungan lokasi menu: `HEADER`, `FOOTER`, dan `SIDEBAR`.
   - Pengaturan urutan tautan menggunakan tombol naik/turun yang intuitif.
8. **Pengaturan Situs (Settings)**:
   - Pengaturan Site Title, Tagline, Logo URL, Favicon URL, email dan telepon kontak, tautan sosial (Twitter/X, GitHub, LinkedIn, Instagram), dan teks hak cipta footer.
9. **Riwayat Versi & Rollback (Versioning)**:
   - Setiap pembaruan Halaman atau Artikel secara otomatis menyimpan snapshot lengkap di tabel `ContentVersion`.
   - Modal interaktif memungkinkan pratinjau snapshot versi lama dan pemulihan (*rollback*) dengan 1 klik.
10. **Audit Log Terpusat**:
    - Mencatat seluruh peristiwa administratif (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `RESTORE_VERSION`, `REGENERATE_API_KEY`).
    - Dilengkapi pencarian, filter aksi, dan penampil JSON detail perubahan.
11. **API Playground & Tester Terpadu**:
    - Menguji langsung panggilan REST API dari dalam dashboard.
    - Menghasilkan cuplikan kode otomatis untuk cURL, Next.js, Vue/Nuxt, Static HTML (`cms-embed.js`), dan `@kedata/cms-client`.

---

## 📡 Dokumentasi REST API Publik (`/api/v1`)

Semua endpoint bersifat *read-only*, *framework-agnostic*, dan mengembalikan struktur JSON konsisten:
```json
{
  "data": [...],
  "meta": { "page": 1, "perPage": 10, "total": 42, "totalPages": 5 },
  "error": null
}
```

### Autentikasi API
Klien harus menyertakan header:
`x-api-key: YOUR_SITE_API_KEY`

### Daftar Endpoint Utama
| Method | Endpoint | Deskripsi | Query Parameters Penting |
|---|---|---|---|
| `GET` | `/api/v1/pages` | Daftar halaman terbit | `page`, `perPage`, `fields` |
| `GET` | `/api/v1/pages/:slug` | Detail halaman | `fields`, `preview` (untuk draft) |
| `GET` | `/api/v1/posts` | Daftar artikel terbit | `page`, `perPage`, `category`, `tag`, `search`, `sort`, `order`, `fields`, `include` |
| `GET` | `/api/v1/posts/:slug` | Detail artikel | `fields`, `preview` |
| `GET` | `/api/v1/categories` | Daftar kategori | — |
| `GET` | `/api/v1/tags` | Daftar tag | — |
| `GET` | `/api/v1/menus` | Navigasi menu | `location` (`HEADER`, `FOOTER`, `SIDEBAR`) |
| `GET` | `/api/v1/settings` | Pengaturan & branding | — |
| `GET` | `/api/v1/media/:id` | Metadata & URL berkas | — |

### Dokumentasi OpenAPI Interaktif & Feed Standar
- **OpenAPI 3.0 Interactive Docs**: `http://localhost:3000/docs`
- **OpenAPI Raw JSON**: `http://localhost:3000/openapi.json`
- **RSS 2.0 Feed**: `http://localhost:3000/rss.xml?site=kedata-tech`
- **XML Sitemap**: `http://localhost:3000/sitemap.xml?site=kedata-tech`
- **Robots.txt**: `http://localhost:3000/robots.txt`
- **Universal JS Embed**: `http://localhost:3000/cms-embed.js`

---

## 📦 Paket SDK Klien: `@kedata/cms-client`

Paket TypeScript ringan tanpa dependensi eksternal, siap digunakan di browser maupun server Node.js:
```bash
npm install @kedata/cms-client # atau impor langsung dari packages/client
```

Contoh pemakaian:
```typescript
import { KedataCmsClient } from '@kedata/cms-client';

const cms = new KedataCmsClient({
  baseUrl: 'http://localhost:3000/api/v1',
  apiKey: process.env.KEDATA_API_KEY!,
});

const { data: posts, meta } = await cms.posts.list({
  category: 'architecture',
  perPage: 5,
  include: ['category', 'tags'],
});
```

---

## 💻 Contoh Integrasi Lengkap (`examples/`)

Folder `examples/` berisi kode integrasi nyata yang dapat langsung dijalankan:
1. **`examples/nextjs/`**: Next.js App Router Server Component + Route handler Webhook on-demand ISR revalidation bertanda tangan HMAC.
2. **`examples/vue-nuxt/`**: Composable Vue 3 (`useKedataCms.ts`) dan halaman SSR Nuxt 3 (`NuxtBlogPage.vue` menggunakan `useFetch`).
3. **`examples/static-html/index.html`**: Halaman HTML statis yang mendemonstrasikan vanilla fetch dan penyematan widget dengan satu tag `<script src="/cms-embed.js">`.
4. **`examples/curl/curl-examples.sh`**: Script bash yang menguji seluruh endpoint REST via cURL.
5. **`examples/react-vite/`**: Komponen React hook untuk SPA.
6. **`examples/php-laravel/`**: Service PHP/Laravel dengan Http client dan verifikasi webhook.

---

## 🧪 Pengujian Otomatis

Jalankan rangkaian tes menggunakan runner bawaan Node.js:
```bash
npm test
# atau: npx --yes tsx --test tests/*.test.ts
```

Hasil pengujian meliputi:
- **`tests/validation.test.ts`**: Validasi Zod schema untuk formulir login, situs, halaman, artikel, kategori, dan tag.
- **`tests/security.test.ts`**: Pengecekan pembuatan dan pencocokan hash API key, pembuatan tanda tangan HMAC webhook, sanitasi HTML TipTap terhadap XSS, dan mekanisme rate limiting.
- **`tests/api-compatibility.test.ts`**: Pengecekan filter konten terbit (konten draft/jadwal tidak bocor ke publik) dan otentikasi kunci API.

---

## 📋 Catatan Batasan & Fitur Lanjutan

1. **GraphQL Endpoint (`/api/graphql`)**:
   - Status: Ditandai sebagai opsi terakhir (*optional*) dalam spesifikasi.
   - Pertimbangan: REST API `/api/v1` saat ini telah dilengkapi fitur field selection (`?fields=...`) dan relation embedding (`?include=...`) yang memberikan fleksibilitas setara GraphQL dengan latensi lebih rendah, kompatibilitas cache HTTP standar (ETag, Cache-Control), serta kompatibilitas penuh dengan edge runtime dan browser statis.
2. **Penyimpanan Berkas Cloud**:
   - Berkas media disimpan pada filesystem lokal server di `/public/uploads` dengan sanitasi nama. Untuk produksi skala multi-server, backend ini siap dipasangkan dengan adaptor S3/GCS.
