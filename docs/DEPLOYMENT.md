# Deployment Kedata CMS — varian InfinityFree v1.0

Tanggal 10 November 2026. Platform PHP 8.2+ dan MySQL dipilih pengguna untuk varian alternatif; aplikasi Node utama tetap tersedia. Tidak ada CI/publikasi otomatis.

## Build lokal

Jalankan `node scripts/build-infinityfree.mjs` dari root, setelah dependency proyek tersedia. Builder menggunakan snapshot SQLite read-only untuk mengekspor data ke `.backups/infinityfree-migration/import-current-data.sql` (privat), menyusun schema MySQL dari model Prisma, membuild React dengan potongan JS di bawah batas hosting, dan membuat `artifacts/infinityfree/CSM-InfinityFree-upload.zip`.

Paket upload berisi `htdocs/`, `schema.sql` kosong, dan `PANDUAN-UPLOAD.md`. SQL konten/akun berada di luar paket, di .backups; SQL tersebut hanya diimpor lewat phpMyAdmin, bukan disimpan di webroot. Rahasia MySQL diisi pengelola pada config.php setelah upload.

## Pemeriksaan dan rollout

Jalankan syntax check PHP, `node tests/infinityfree.test.mjs`, lint/build utama, dan periksa ZIP. Lihat [INFINITYFREE.md](INFINITYFREE.md) untuk instruksi lengkap upload, HTTPS, migrasi, smoke test, dan rollback. Pastikan isi `.htaccess` ikut terunggah dan folder privat tidak dapat diakses publik sebelum login.

Hanya upload **isi htdocs**, bukan source repo atau ZIP backup Node. Siapkan database hosting kosong, import schema.sql lalu SQL data privat. Data hosting yang sudah ada harus dicadangkan dahulu. Jangan menjalankan installer kosong setelah mengimpor akun lama. Akses akun InfinityFree dan deployment nyata belum dilakukan dalam pekerjaan persiapan lokal ini.

## Backup, rollback, dan observability

Unduh backup ZIP MySQL+media melalui dashboard, atau gunakan phpMyAdmin Export + FTP uploads untuk dataset besar. Pemulihan memakai database kosong dan penyesuaian config, sehingga database aktif bisa dipertahankan untuk rollback. Jangan mengunggah file backup ke htdocs. Audit berada di AuditLog, error PHP mencatat kelas/lokasi tanpa pesan koneksi atau credential. `/health` memeriksa koneksi MySQL tanpa mengungkap detail.

Browser security, resource, waktu eksekusi, dan kuota file InfinityFree tetap berlaku. API eksternal/SSR serta webhook bukan jaminan kemampuan hosting ini. Publikasi terjadwal diproses oleh request publik/cron manual, bukan worker latar belakang.
