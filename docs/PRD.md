# PRD: Kedata CMS

**Status:** Draft — pendalaman kebutuhan dengan skill resmi Kedata PRD
**Versi:** 0.2  
**Tanggal:** 2026-11-06  
**Sumber:** wawancara pengguna pada 2026-11-06, kode checkout lokal, README, Prisma schema, dan verifikasi UI sebelumnya.

**Proses:** pengguna memilih pendalaman lengkap (45–60 menit sebagai perkiraan sesi, bukan janji waktu selesai). Kebutuhan dicatat per domain; dokumen belum disetujui untuk implementasi baru.

Semua fakta diberi label: **Observed** = langsung terlihat di kode/dokumen; **Inferred** = dugaan dari implementasi; **Unknown** = belum dapat dipastikan. Tambahan label: **Confirmed** = dinyatakan pengguna; **Proposed** = usulan untuk dibahas. Status Draft bukan persetujuan implementasi fitur baru.

## 1. Ringkasan Produk

**Confirmed — wawancara domain masalah/nilai:** Kedata CMS harus mencakup tiga penggunaan sekaligus: (a) tim nonteknis memperbarui satu website, (b) pengelolaan konten beberapa website dari satu dashboard, dan (c) penyediaan CMS sebagai layanan untuk banyak klien. Pengguna menjawab "semua" untuk ketiganya. Ini menetapkan cakupan visi produk, belum berarti seluruh fitur menjadi P0 atau selesai dalam satu rilis.

| Dimensi | Arah yang dikonfirmasi | Ukuran kuantitatif |
|---|---|---|
| Publikasi | Artikel dapat diterbitkan ke website tanpa mengubah kode setelah integrasi awal tersedia. | Target waktu dan jumlah pengujian belum disepakati. |
| Multi-situs | Konten beberapa situs dikelola tanpa tertukar antar-situs. | Jumlah situs, jumlah pengguna, serta matriks uji isolasi belum disepakati. |
| Produksi | CMS dapat dioperasikan secara andal pada server produksi. | Hosting, SLA, backup/restore, dan ambang performa belum disepakati. |

**Baseline kode:**

**Observed:** Headless CMS multi-site dengan satu dashboard admin dan REST API publik untuk berbagai situs/klien. Konten yang tampak di model meliputi pages, posts, kategori, tag, media, menu, pengaturan, dan audit log. Aplikasi menggabungkan frontend React, server Express, dan Prisma/SQLite dalam satu repository.

## 2. Masalah yang Dipecahkan

**Confirmed:** ketiga masalah yang ditawarkan termasuk kebutuhan: pengelolaan satu website oleh nonteknis, pemusatan banyak situs, dan layanan bagi banyak klien.

**Belum terjawab:** proses kerja sebelum CMS, frekuensi publikasi, biaya/waktu yang terbuang, serta contoh kegagalan yang paling mahal. Jangan mengarang baseline bisnis atau klaim penghematan.

**Baseline rekonstruksi:**

**Inferred:** Pengelolaan konten untuk beberapa website/framework terpisah menimbulkan duplikasi dashboard dan integrasi; CMS ini berusaha memusatkan pengelolaan sambil menyediakan API framework-agnostic. Validasi masalah pasar dan kebutuhan pemangku kepentingan belum tersedia.

## 3. Sasaran

**Confirmed:** semua sasaran produk pada §1 masuk visi. Prioritas urutan pelaksanaan, batas rilis pertama, dan target angka masih harus digali; "semua masuk" tidak ditafsirkan sebagai semua fitur wajib tersedia sekaligus.

**Target tampilan dari percakapan sebelumnya:** latar putih, logo Kedata CMS, tampilan bersih mengikuti Kedata Vibeskills, dan drawer kiri yang terbuka lewat hover tepi layar atau klik logo/tombol tiga garis.

**Baseline:**

- **Observed:** Admin dapat mengelola konten untuk lebih dari satu site dari satu aplikasi.
- **Observed:** Klien mengambil konten terbit melalui REST dengan API key per site.
- **Inferred:** Mempermudah penggunaan ulang konten lintas framework.
- **Unknown:** Sasaran bisnis terukur, target performa layanan, skala pengguna, dan batas MVP.

## 4. Pengguna dan Hak Akses

**Confirmed:** pengguna langsung CMS adalah tim Kedata yang mengelola satu atau banyak situs milik banyak klien. Klien adalah penerima layanan, bukan pengguna login.

**Temuan teknis untuk domain 2:** schema saat ini belum mempunyai entitas workspace/organisasi dan membership klien. `requireAdmin` memvalidasi sesi, tetapi tidak mengecek nilai role atau keanggotaan klien. Karena itu, layanan multi-klien terisolasi belum boleh dianggap tersedia hanya karena ada fitur multi-situs. Sumber: `prisma/schema.prisma` dan `src/server/auth.ts`.

**Confirmed — domain 2:** hanya tim Kedata yang login. Admin pusat membuat dan mengatur seluruh akun. Pengelola, editor, dan penerbit adalah peran internal; pemilik klien tidak login dan tidak membuat/mengelola anggota tim CMS. Jawaban klarifikasi ini menggantikan pilihan sebelumnya tentang pemilik klien yang mengatur tim. Batas akses per situs dan kemampuan admin pusat masih perlu dirinci.

**Baseline kode:**

- **Observed:** Ada akun dengan role string, sesi tersimpan di database, dan middleware admin.
- **Inferred:** Admin/editor mengelola CMS; developer/pemilik situs mengonsumsi REST API.
- **Unknown:** Apakah ada role selain ADMIN, pemisahan izin editor, jumlah persona, dan model tenancy yang diharapkan. Jangan menyimpulkan UI role dari schema saja.

## 5. Cerita Pengguna dan Kriteria Penerimaan Rekonstruksi

Kriteria berikut adalah rangkuman perilaku yang sudah ada, bukan komitmen produk baru.

| ID | Kriteria yang teramati | Bukti |
|---|---|---|
| AC1 | Admin dapat login; masukan tidak valid ditolak, kredensial salah ditolak, dan kegagalan berulang mendapat pembatasan sementara. | `src/server/api/admin.ts`, `auth.ts`, `tests/validation.test.ts` |
| AC2 | Admin terautentikasi dapat membuat dan mengelola site serta mendapat API key saat dibuat/dirotasi. | `src/server/api/admin.ts`, `security.ts` |
| AC3 | Admin dapat CRUD pages/posts dan mengelola kategori, tag, menu, settings, dan media. | `src/server/api/admin.ts` |
| AC4 | HTML konten disanitasi sebelum disimpan; HTML berbahaya tidak ikut dirender dari fungsi sanitizer. | `security.ts`, `tests/security.test.ts` |
| AC5 | REST publik mengembalikan konten terbit per site; daftar mendukung pagination, filter/sort yang tersedia, dan selection field. | `src/server/api/v1.ts`, `tests/api-compatibility.test.ts` |
| AC6 | API key salah/tidak ada ditolak; permintaan publik dibatasi kuotanya; respons sukses mendukung ETag/cache. | `src/server/api/v1.ts`, tests |
| AC7 | Halaman/post yang belum terbit tidak tampil tanpa token preview; konten terjadwal dapat dipublikasikan ketika waktunya tercapai. | `src/server/api/v1.ts` |
| AC8 | Update pages/posts merekam snapshot versi; admin dapat melihat dan mencoba memulihkan versi. | `src/server/api/admin.ts` |
| AC9 | Perubahan administratif direkam di audit log; peristiwa konten memicu webhook keluar jika site mengonfigurasi URL. | `admin.ts`, `webhooks.ts` |
| AC10 | Feed RSS, sitemap, robots, OpenAPI dan dashboard tersedia dari server. | `feeds.ts`, `openapi.ts`, `server.ts` |

## 6. Cakupan yang Teramati

**Confirmed:** akun klien dan signup publik tidak diperlukan pada model operasional. Pengelolaan banyak klien berarti managed service internal Kedata, bukan bukti kebutuhan SaaS self-service.

**Pendalaman domain 3:** urutan rilis, integrasi website, dan billing sedang ditanyakan.

**Di dalam:** dashboard admin; autentikasi sesi; sites; pages; posts; kategori/tag; media; menus/settings; version history; audit logs; API REST read-only; RSS/sitemap/robots; webhook keluar; SDK dan contoh integrasi.

**Di luar/tidak terverifikasi:** GraphQL, multi-role authorization, cloud object storage, produksi multi-instance, billing, import/migrasi eksternal. README menyebut sebagian sebagai opsi/batasan, bukan implementasi yang diverifikasi.

## 7. Stack

**Observed:** React 19, TypeScript, Vite 8, Express 4, Prisma 6, SQLite, Zod, Node test runner via `tsx`. Root dan `kedata-cms/` memuat salinan aplikasi yang nyaris identik. README mengarahkan ke subdirektori, sementara perintah yang diuji berjalan dari root. Direktori kanonis belum disepakati.

## 8. Fitur

| Fitur | Status | Catatan |
|---|---|---|
| Login admin + sesi | Observed | Cookie HttpOnly/SameSite=Lax, durasi tujuh hari; throttling berbasis memori. |
| Multi-site + API key | Observed | Hash kunci disimpan; respons create/rotate menampilkan kunci sekali. |
| Pages/posts + sanitasi | Observed | Status disimpan sebagai string; Zod membatasi nilai di jalur admin. |
| Taksonomi | Observed | Kategori dan tag terkait per site menurut schema. |
| Media | Observed | Upload lokal; tipe MIME whitelist dan batas 5 MiB di Multer. |
| Menus/settings | Observed | Struktur JSON disimpan sebagai string. |
| Version history | Observed | Snapshot JSON; restore hanya memulihkan sebagian field. |
| Audit log | Observed | Tabel audit dan endpoint admin. |
| Public REST + feeds | Observed | API-key, cache/ETag, RSS dan sitemap. |
| UI Gemini/AI | Unknown | Template mencantumkan `GEMINI_API_KEY`, tetapi pembacaan/fitur aktif belum terbukti. |

## 9. Ikhtisar API

**Observed:** 9 route GET publik di `/api/v1`; 35 route admin di `/api/admin`; route feeds `/rss.xml`, `/api/v1/rss.xml`, `/sitemap.xml`, `/api/v1/sitemap.xml`, `/robots.txt`; `/docs`, `/openapi.json`, `/health`. Rincian input/response dan batasan ada di `API_CONTRACTS.md`.

## 10. Data

**Observed:** 13 Prisma models: User, Session, Site, SiteSetting, Category, Tag, Page, Post, PostTag, ContentVersion, Media, Menu, AuditLog. Rincian field, constraint, relasi dan perilaku delete ada di `DATA_CATALOG.md`.

## 11. Kualitas Layanan / NFR

**Observed:** ukuran upload maksimal 5 MiB; kuota API default 120 request/menit (konfigurasi dibatasi schema 10–1000); session tujuh hari; webhook timeout empat detik; pagination API dibatasi maksimal 100.

**Unknown:** SLA, latency/throughput sasaran, backup/restore, ketersediaan, target aksesibilitas, kebutuhan retention, dan kebijakan keamanan produksi.

## 12. Konfigurasi

Nama env yang terdaftar/terbaca, tujuan, dan drift dijabarkan di `ENVIRONMENT_VARIABLES.md`. Nilai rahasia sengaja tidak disalin ke dokumen ini.

## 13. UX / Identitas Visual

**Observed (README):** dashboard mendukung dark/light; warna brand disebut Slate Blue `#6C7A89` dan Muse `#DFE2DC`; UI berbahasa Indonesia pada sejumlah pesan API. **Pembaruan 2026-11-06:** `docs/DESIGN_BRIEF.md` kini tersedia sebagai Draft dan UI telah dirapikan menurut Kedata Vibeskills. Background putih, logo monogram K, serta drawer kiri hover/klik mengikuti permintaan pengguna. Verifikasi UI tercatat pada `UI_RESTYLE_REPORT.md`; bukan bukti kesiapan SaaS multi-klien.

## 14. Analitik

**Unknown:** metrik penggunaan, analytics/event pipeline, dan dashboard produk tidak ditentukan. Audit log bukan bukti analytics produk.

## 15. Peluncuran dan Operasi

**Observed:** README mendokumentasikan jalur lokal SQLite: pasang dependency, generate Prisma, `db push`, seed, lalu `npm run dev`. Produksi/deployment belum ditemukan. Lihat `IMPLEMENTATION_PLAN.md` untuk fakta dan gap.

## 16. Ketergantungan dan Risiko

**Observed:** SQLite dan upload media lokal; `/docs` mengambil Swagger UI dari CDN; webhook melakukan HTTP request ke URL site. Dua salinan proyek, dua database SQLite terlacak, `cookies.txt` terlacak (isinya belum diperiksa), dan contoh integrasi berisi nilai demo/fallback. Jangan gunakan nilai contoh untuk produksi.

## 17. Ukuran Keberhasilan

**Unknown:** tidak ada metrik atau target yang dapat diturunkan dengan aman dari kode. Perlu konfirmasi pemilik produk.

## 18. Edge Cases dan Risiko Perilaku

- **Observed:** login invalid, kredensial salah, pembatasan setelah lima gagal; token sesi kedaluwarsa; API key hilang/salah; rate limit; page/post tidak ditemukan atau belum terbit; slug duplikat; site terakhir tidak boleh dihapus; tipe/ukuran upload dibatasi.
- **Observed:** perutean beberapa operasi tidak memberi respons eksplisit untuk record yang hilang atau error DB; status/error aktual belum ditetapkan oleh kontrak. `siteId` tidak selalu divalidasi pada create kategori/tag/menu.
- **Observed:** preview token dibentuk dari ID site; API key juga boleh dikirim melalui query string; pengecekan fallback admin pada middleware API publik hanya menguji keberadaan cookie sebelum mencocokkan prefix/slug, bukan sesi admin terverifikasi.
- **Observed:** daftar/update site mengirim objek Prisma tanpa field selection; perlu cek agar hash API key/secret webhook tidak bocor ke klien admin.
- **Observed:** keterkaitan category/tag dengan site post tidak dipastikan oleh relasi database; JSON snapshot diparse langsung saat restore; nomor versi dihasilkan read-then-increment tanpa constraint unik.
- **Unknown:** sensitivitas isi `cookies.txt` dan kedua database terlacak; harus diverifikasi sebelum distribusi repository.

## Catatan wawancara dan pertanyaan terbuka

- **D1 — Confirmed:** satu website, multi-situs, dan CMS untuk banyak klien semuanya masuk visi.
- **D2 — Confirmed:** publikasi tanpa perubahan kode, isolasi konten, dan kesiapan operasional produksi semuanya menjadi arah keberhasilan; angka belum diputuskan.
- **D3 — Confirmed:** pengguna memilih pendalaman lengkap.
- **D4 — Confirmed:** layanan dikelola tim Kedata; tidak ada login klien atau signup publik pada model yang dipilih.
- **Q8 — Open:** batas penugasan dan akses per situs untuk anggota tim Kedata.
- **D5 — Confirmed:** role operasional internal mencakup pengelola, editor, penerbit, serta admin pusat; matriks aksi terperinci belum dikunci.
- **D6 — Confirmed:** semua akun dibuat dan diatur admin pusat.
- **Q10 — Open:** cara aktivasi, pengiriman undangan, reset password, dan pencabutan sesi.

Pertanyaan baseline yang masih relevan:

1. Direktori mana yang merupakan sumber kebenaran: root atau `kedata-cms/`?
2. Apakah semua fitur README masih MVP yang diinginkan? Mana yang prioritas?
3. Role/izin apa saja yang memang dibutuhkan?
4. Target deployment, backup, penyimpanan media, dan database produksi apa?
5. Apakah file cookie dan database sample berisi data sensitif/berizin untuk dibagikan?
6. Apakah contoh secret/demo boleh dibiarkan hanya sebagai placeholder, atau harus dihapus/dirotasi?
7. Apa metrik keberhasilan dan ambang performa/security yang disetujui?
