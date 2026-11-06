---
name: csm-maintainer
description: Perbaiki, kembangkan, dan verifikasi Kedata CMS pada repository najwaadani/CSM dengan pendekatan Kedata Vibeskills. Gunakan untuk bug dashboard React, API Express, Prisma, SDK CMS, dan sinkronisasi Git pada proyek CSM.
---

# CSM Maintainer

Gunakan bahasa Indonesia untuk komunikasi kecuali pengguna meminta bahasa lain. Selesaikan perbaikan yang diminta sampai tervalidasi; jelaskan batas verifikasi yang belum dapat dilakukan.

## Konteks dan referensi

- Repository: https://github.com/najwaadani/CSM
- Pendekatan alur kerja: https://vibecoding.kedata.cloud/ dan https://github.com/Kedata-Indonesia/vibeskills. Skill ini adaptasi khusus proyek, bukan salinan atau instalasi seluruh registry tersebut.
- Temukan checkout dari working directory dan remote Git; lokasi awal Windows adalah `C:\Users\cagam\CSM`. Jangan mengandalkan path ini pada komputer lain.
- Stack awal: React 19, TypeScript, Vite, Tailwind, Express, Prisma 6/SQLite, TipTap, Zod; periksa manifest terbaru sebelum bekerja.
- Root dan `kedata-cms/` memiliki salinan aplikasi. Mulai dari root bila pengguna bekerja di root; telusuri script, konfigurasi deploy, dan perbedaan kedua tree sebelum mengubah lokasi lain. Jangan otomatis menggandakan patch atau menghapus salinan.

## Pilih pekerjaan yang diperlukan

Periksa instruksi repository, `git status`, branch dan remote terlebih dahulu. Pertahankan perubahan pengguna. Bila diminta pull, gunakan `git pull --ff-only`; jika konflik atau branch divergen, jelaskan kondisi dan jangan reset/stash otomatis.

Baca `docs/RECONSTRUCTION_REPORT.md` jika tersedia, lalu hanya dokumen yang relevan: `PRD.md`, `API_CONTRACTS.md`, `DATA_CATALOG.md`, `ENVIRONMENT_VARIABLES.md`, atau `IMPLEMENTATION_PLAN.md`. Dokumen rekonstruksi adalah baseline observasi; periksa source terbaru untuk membuktikan klaim. Jangan menganggap semua dugaan bug sudah terkonfirmasi atau meminta pengesahan seluruh dokumen untuk memperbaiki bug yang telah diizinkan pengguna.

Untuk bug, reproduksi gejala, tentukan perilaku yang benar, telusuri akar penyebab, lalu buat patch terfokus. Untuk fitur lintas domain, ringkas kebutuhan, kontrak API/data, dan kriteria penerimaan sebelum implementasi. Terapkan bagian alur Vibeskills yang bermanfaat; perbaikan kecil tidak perlu seluruh rangkaian dokumen. Bila skill upstream sudah tersedia, baca hanya skill yang sesuai tugas; jangan mengklaim telah memakainya tanpa membaca instruksinya.

## Peta kode

- `server.ts`: Express entry point, Vite middleware/static serving, router dan health.
- `src/views/`, `src/components/`, `src/App.tsx`, `src/index.css`: dashboard React dan editor.
- `src/server/api/admin.ts`: autentikasi admin dan operasi pengelolaan konten.
- `src/server/api/v1.ts`: API publik; `src/server/openapi.ts` dan `feeds.ts`: dokumentasi/feed.
- `src/server/auth.ts`, `security.ts`, `webhooks.ts`: session, validation, API key, sanitasi dan webhook.
- `prisma/schema.prisma`, `prisma/seed.ts`: model dan seed.
- `packages/client/`, `examples/`: SDK serta klien integrasi.
- `tests/`: Node test runner dengan tsx; lihat script package.json terbaru.

## Invarian saat memperbaiki

Pertahankan isolasi `siteId` pada query, relasi, taxonomy, media, dan pemulihan versi. API publik harus membatasi konten draft/jadwal sesuai kontrak preview yang terautentikasi. Jangan mengirim password hash, session token, API-key hash, atau webhook secret dalam respons yang tidak membutuhkannya. Uji perubahan auth, sanitasi HTML, upload, dan signature berdasarkan perilaku nyata.

Jangan menimpa database terlacak, menjalankan seed terhadap data pengguna, atau menerapkan perubahan schema destruktif sebagai langkah setup biasa. Pakai database sementara/salinan fixture untuk pengujian yang menulis. Jangan menampilkan isi `.env`, cookie, credential, atau database ke laporan. Verifikasi dukungan provider dan migrasi sebelum mengganti SQLite.

Pertahankan kontrak SDK dan OpenAPI bersama perubahan endpoint. UI mengikuti pola komponen yang ada; warna awal brand `#6C7A89` dan `#DFE2DC`, dengan dukungan dark mode yang perlu dipertahankan.

## Verifikasi dan penyerahan

Pakai package manager/lockfile yang benar menurut konfigurasi terkini. Jika clean install gagal, reproduksi penyebabnya sebelum memperbaiki lockfile; jangan mengatasi masalah dengan menghapusnya tanpa alasan.

Untuk perubahan aplikasi, jalankan pemeriksaan yang relevan dari direktori aplikasi yang dipilih: `npm test`, `npm run lint` (TypeScript), dan `npm run build`. Tambahkan uji regresi untuk bug perilaku atau keamanan yang material. Perubahan UI perlu diperiksa tampilannya jika browser tersedia; perubahan API perlu contoh request/response dan kasus kegagalan terkait. Untuk perubahan skill/dokumen saja, validasi artefaknya tanpa menjalankan seluruh suite aplikasi.

Laporkan ringkas file yang diubah, perilaku setelah perbaikan, hasil pemeriksaan, dan kendala aktual. Commit, push, deployment, dan pembukaan PR mengikuti permintaan pengguna; pembuatan skill ini sendiri tidak memberi izin publikasi. Bila diminta membuka folder, gunakan path checkout yang telah diverifikasi; bedakan membuka File Explorer dari mengganti workspace aplikasi chat.
