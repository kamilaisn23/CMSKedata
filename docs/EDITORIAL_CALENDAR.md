# Kalender editorial dan sesi aktif — tahap 4

Versi 1.0, 2026-11-09. Diizinkan pengguna melanjutkan tahap 4 dan meminta pengguna yang sudah login langsung masuk.

Kalender bulanan menampilkan artikel terjadwal dan artikel/halaman terbit dari seluruh situs yang boleh diakses. Filter situs, bulan sebelumnya/berikutnya, Hari ini, agenda tanggal terpilih, dan daftar draf/review yang belum dijadwalkan. Kalender memakai zona Asia/Jakarta; tanggal publikasi dan jadwal tidak diganti oleh kalender. Tombol kelola membuka daftar konten pada situs terkait. Tidak menambah library atau migrasi.

GET `/api/admin/calendar?month=YYYY-MM&siteId=opsional` memerlukan sesi/peran sah. Tanpa siteId: semua situs ADMIN atau situs penugasan anggota. siteId di luar izin: 403. Bulan invalid: 400. Respons `{data:{events,queue,counts},error:null}`; events: `{id,kind:PAGE|POST,siteId,siteName,title,status,at,updatedAt}`. `at` adalah scheduledAt untuk SCHEDULED atau publishedAt untuk PUBLISHED; batas bulan Jakarta inklusif awal, eksklusif akhir. Queue: maksimum 12 DRAFT/IN_REVIEW terbaru, `at:null`. Counts scheduled/published untuk bulan terpilih, draft/review untuk seluruh antrean pada scope situs. Tidak mengirim isi konten atau secret situs.

Alur masuk: `/` dan `/login` mengecek sesi terlebih dahulu. Sesi aktif langsung dialihkan ke `/dashboard` tanpa menampilkan formulir login/landing. Pengunjung tanpa sesi tetap mendapat landing pada `/`, login pada `/login`; halaman privat tetap membutuhkan sesi. Tidak mengandalkan flag localStorage untuk autentikasi.

Verifikasi: fixture HTTP membuktikan scope multi-situs, batas UTC/Jakarta, validasi bulan, antrean/count dan minimisasi data. Unit grid bulanan/navigasi. Browser fixture memeriksa kalender desktop/ponsel/gelap, filter/agenda/navigasi konten, dan akses root/login dengan/tanpa sesi. Tidak mengubah konten asli. Tahap berikutnya backup/pemulihan.

## Hasil tahap 4

Selesai: 32 tes lulus, lint/build lulus. Browser fixture lulus root/login dengan sesi aktif tanpa form login, landing anonim, redirect halaman privat tanpa sesi; kalender 1440/768/390px dan mode gelap, filter situs, agenda, navigasi bulan/Hari ini, error/retry, antrean kosong, serta kelola konten berpindah situs. Screenshot di `.cache/calendar-ui`; data pratinjau adalah fixture. Kalender dirapatkan agar kisi bulanan lebih mudah dilihat. Backend direstart dan health healthy; `/admin-openapi.json` sudah memuat kalender. Tidak ada migrasi atau perubahan konten asli dari tes. Warning build lama tentang config Vite dan ukuran bundle tetap ada. Kalender belum menyediakan penjadwalan lewat drag-and-drop; jadwal diedit melalui editor yang ada. Tahap 5 backup belum dikerjakan.
