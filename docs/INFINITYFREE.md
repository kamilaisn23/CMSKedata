# Versi alternatif InfinityFree

Versi 1.0 — 10 November 2026. Sumber keputusan: pengguna meminta backup folder dan paket untuk InfinityFree setelah menyetujui alternatif PHP + MySQL. Izin ini mencakup persiapan lokal; belum mencakup publikasi atau akses akun hosting.

## Kebutuhan dan keputusan

Varian terpisah di `hosting/infinityfree/`: React yang sama, PHP 8.2+ dengan PDO MySQL, database MySQL InnoDB/utf8mb4. Root Node.js/Prisma dan database aslinya tidak diganti. Tidak menambah kuota jumlah konten, situs, atau akun. Batas keamanan upload dan pagination yang ada tetap diperlukan; resource hosting tetap berlaku.

## Dampak artefak

Ini merupakan perubahan besar platform untuk varian alternatif, bukan penggantian arsitektur utama. Addendum ini menjadi spesifikasi implementasi varian: PRD (kesetaraan fitur), design brief (React dipakai ulang), implementation plan (PHP/MySQL dan paket FTP), API contracts (path/payload yang sama), data catalog (model Prisma dipetakan ke MySQL), environment (config PHP privat), test plan (uji HTTP PHP dan MySQL), deployment (langkah di bawah). Baseline versi Node tetap berlaku untuk aplikasi utama.

## Kriteria penerimaan

- Backup source saat ini dan snapshot SQLite konsisten tersedia lokal, termasuk perubahan belum masuk Git. Dependency/cache dapat dipasang ulang dan tidak termasuk backup.
- ZIP upload hanya berisi aplikasi hasil build dan PHP; tidak berisi `.env`, Git, database SQLite, SQL data pengguna, log, cookies, atau backup pribadi.
- Login/sesi, peran dan isolasi situs, CRUD, taxonomy, media, menu, pengaturan, versi, review, kalender, audit dan API publik diuji memakai database terisolasi.
- SQL migrasi data lama disediakan terpisah untuk phpMyAdmin, tanpa sesi login. Tidak menjalankan migrasi/seed terhadap database asli.
- Tidak mengklaim kompatibilitas paket backup SQLite dengan backup MySQL. Pemulihan MySQL melalui phpMyAdmin + salinan uploads.
- Tidak mengklaim API eksternal/SSR/SDK server dapat menembus browser security InfinityFree. Hosting ini menargetkan penggunaan dashboard browser; headless API lintas server membutuhkan host lain.

## Konfigurasi

Salin `htdocs/cms-private/config.example.php` menjadi `config.php`. Isi `db_host`, `db_name`, `db_user`, `db_password` sesuai panel **MySQL Databases** (bukan otomatis localhost). `app_url` = `https://csmkedata.gt.tc`. `setup_token` berisi minimal 32 karakter acak untuk instalasi kosong; kosongkan setelah selesai. `secure_cookies` wajib true untuk HTTPS produksi. Konfigurasi contoh tidak berisi kredensial nyata.

## Upload dan migrasi

1. Aktifkan HTTPS domain melalui panel InfinityFree. Cadangkan isi htdocs dan database hosting jika sudah ada.
2. Buat database baru di MySQL Databases. Buka phpMyAdmin database tersebut.
3. Import `schema.sql` dari paket, lalu SQL data lama yang disimpan terpisah dalam `.backups/infinityfree-migration/`. Jangan mengimpor ke database berisi data produksi. SQL data lama bersifat rahasia; jangan upload ke htdocs.
4. Ekstrak ZIP di komputer. Upload **isi folder htdocs**, termasuk `.htaccess`, ke document root domain dari File Manager/FTP. Jangan upload ZIP backup Node atau folder proyek penuh. Gunakan FTP jika File Manager membatasi ukuran.
5. Lengkapi config.php. Jika mengimpor data lama, login memakai akun CMS yang sudah ada. Jika instalasi baru, buka `/setup` dan buat admin pertama menggunakan setup_token; setup terkunci saat ada User. Hapus setup_token setelah selesai.
6. Periksa `/health`, login, situs, simpan draf, upload gambar, review dan logout. Pastikan `/cms-private/config.php`, `/cms-private/schema.sql`, dan folder privat membalas 403/404. Jika proteksi privat gagal, hentikan publikasi dan perbaiki .htaccess.
7. Simpan backup MySQL lewat phpMyAdmin Export dan salinan folder uploads sebelum setiap update. Rollback: pulihkan htdocs dan SQL dari waktu backup yang sama. Database lokal Node tidak berubah.

## Batas platform

Browser security InfinityFree dapat mengembalikan HTML challenge untuk curl, SDK server, SSR, webhook masuk, dan permintaan lintas origin. Konversi PHP tidak menghapus batas hosting ini. File PHP/HTML/JS dibatasi sekitar 1 MB dan file lainnya sekitar 10 MB oleh host; build varian memecah bundle JS. Backup MySQL memakai phpMyAdmin agar file database rahasia tidak perlu ditaruh di public. Jadwal publikasi diproses saat request; tidak menjanjikan cron latar belakang. Webhook keluar bergantung izin koneksi hosting, bukan jaminan pengiriman.

Referensi: https://forum.infinityfree.com/t/browser-security-system-features-and-limitations/49353 dan https://forum.infinityfree.com/t/file-size-and-upload-limits/49308.

## Verifikasi

Hasil pengujian aktual dicatat dalam `hosting/infinityfree/VERIFICATION.md`. Paket lokal bukan bukti deployment berhasil di akun InfinityFree; pemeriksaan hosting tetap diperlukan setelah upload.
