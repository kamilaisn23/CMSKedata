# Hak akses per peran dan situs

Pembaruan tahap 4: kalender editorial dan pengalihan sesi aktif selesai; lihat [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md). Berikutnya backup/pemulihan.

Pembaruan tahap 3: persetujuan konten selesai; lihat [CONTENT_REVIEW.md](CONTENT_REVIEW.md). IN_REVIEW mengunci edit/hapus/restore bagi seluruh peran sampai diputuskan. Tahap berikutnya: kalender editorial, lalu backup.

Versi 1.0, 2026-11-09. Scope disetujui pengguna melalui permintaan mengerjakan rekomendasi secara berurutan. Matriks berikut adalah keputusan implementasi untuk fitur pertama; dokumen rekonstruksi lama tetap menjadi baseline historis.

| Peran | Situs | Konten | Pengaturan, menu, audit, API | Akun dan daftar situs |
|---|---|---|---|---|
| ADMIN (admin pusat) | Semua | Semua | Semua | Kelola |
| MANAGER (pengelola) | Ditugaskan | Edit, hapus, terbitkan, jadwalkan | Kelola pada situs ditugaskan | Tidak |
| PUBLISHER (penerbit) | Ditugaskan | Edit, hapus, terbitkan, jadwalkan | Tidak | Tidak |
| EDITOR | Ditugaskan | Baca semua; edit/hapus hanya draf | Tidak | Tidak |

Semua peran yang ditugaskan boleh mengelola kategori, tag, dan media situs tersebut. Media global hanya dapat diubah ADMIN. Peran tidak dikenal ditolak. ADMIN lama tetap memiliki akses penuh; akun selain ADMIN tanpa penugasan tidak mendapat situs.

## Kontrak dan data

- Tambahkan `SiteMembership(userId, siteId)` dengan primary key gabungan dan foreign key cascade. Migrasi SQL aditif di `prisma/migrations/202611090001_site_membership/migration.sql`; tidak mereset data atau seed. Pada database lama tanpa riwayat migration jalankan `node scripts/migrate-access.mjs` (Node 24+, backup SQLite konsisten dibuat otomatis), lalu `prisma generate`. Hentikan server lokal sebelum generate jika DLL engine terkunci pada Windows; hidupkan lagi setelahnya. Jangan gunakan `migrate deploy` pada database lama tanpa baseline migration. CREATE IF NOT EXISTS dapat diulang.
- `GET /api/admin/me` menambahkan `siteIds: string[]`. ADMIN tidak dibatasi array ini.
- `GET /api/admin/sites` hanya mengembalikan situs yang boleh diakses; tidak mengirim hash API key atau webhook secret.
- `GET /api/admin/users`: ADMIN saja, daftar `{id,name,email,role,siteIds}` tanpa hash password.
- `POST /api/admin/users`: ADMIN, body `{name,email,password,role,siteIds}`; password minimal 12 karakter. Balasan 201.
- `PUT /api/admin/users/:id`: ADMIN, body sama; password kosong berarti tidak berubah. Balasan 200. Admin yang sedang login tidak dapat menurunkan perannya sendiri. Perubahan akun membatalkan sesi target.
- Email duplikat 409; situs/role/body invalid 400; sesi tidak valid 401; aksi/situs terlarang 403; target hilang 404. Audit mencatat perubahan akses tanpa password.
- Mutasi berdasarkan ID mencari situs dari record, bukan mempercayai query. Kategori/tag relasi artikel harus berasal dari situs yang sama. Restore versi mengikuti izin konten saat ini. Upload diperiksa sebelum file ditulis (siteId di query).
- API explorer berbasis prefix wajib menggunakan sesi sah dan penugasan situs.

## UI dan penerimaan

Menu Tim & Akses hanya tersedia untuk ADMIN. Menu administrasi situs tersedia bagi ADMIN/MANAGER. Editor hanya mendapat status DRAFT dan aksi edit/hapus draf; penerbit mendapat PUBLISHED/SCHEDULED. Pergantian situs mereset editor menggunakan key React agar form situs sebelumnya tidak terbawa.

## Verifikasi

Gunakan database fixture sementara untuk pengujian HTTP: ADMIN tetap mendapat semua situs; EDITOR hanya situs tugas, tidak dapat publish/schedule/mengubah konten live; query palsu tidak melewati kepemilikan ID; versi/media/taxonomy/settings/cron/akun tidak dapat melewati izin; peran tidak dikenal ditolak; login prefix API harus memverifikasi sesi; data sensitif tidak tampil. Uji pengelolaan akun dan pencabutan sesi. Jalankan lint, build, dan suite yang relevan. Tidak menulis database pengguna saat tes.

## Urutan lanjutan

1. Hak akses per peran dan situs (dokumen ini).
2. Autosave/pemulihan draf.
3. Persetujuan konten.
4. Kalender editorial.
5. Backup/pemulihan database dan media.

## Hasil tahap 1 — 2026-11-09

Pembaruan urutan: tahap 2 selesai pada batch berikutnya; detail dan verifikasi di [EDITOR_DRAFTS.md](EDITOR_DRAFTS.md). Tahap 3–5 tetap belum dikerjakan.

Selesai: model penugasan, pembatasan API, pengelolaan akun, pembatasan UI/dashboard, serta perbaikan fallback API explorer. Migrasi lokal diterapkan dengan backup SQLite konsisten; Prisma Client digenerate dan backend direstart. Pemanggilan migrasi kedua tidak mengubah tabel. Tidak ada akun/konten pengguna yang ditambah oleh tes.

Validasi: 18 pengujian lulus, TypeScript dan build lulus, diff tanpa whitespace error. Browser menggunakan respons API fixture: daftar tim pada 1440/768/390px, formulir mode gelap pada 390px, menu editor dan status hanya DRAFT lulus tanpa runtime error. Overflow ponsel diperbaiki. Batas: pengujian browser tidak login atau mengubah akun asli. Warning build lama tentang `__dirname` dan ukuran bundle masih ada. Tahap 2–5 belum dikerjakan pada batch ini untuk menjaga pengerjaan bertahap.
