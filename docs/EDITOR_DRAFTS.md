# Autosave dan pemulihan editor

Versi 1.0, 2026-11-09. Tahap 2 yang diizinkan pengguna lewat permintaan “lanjut”. Berlaku untuk halaman dan artikel; tahap persetujuan, kalender, serta backup server tetap pekerjaan berikutnya.

Salinan pemulihan disimpan lokal setelah 700 ms tanpa perubahan, serta saat editor ditutup, tab disembunyikan, atau halaman ditinggalkan. Identitas penyimpanan mencakup ID akun, ID situs, jenis konten, dan ID record (atau satu slot konten baru). Semua isian editor dicadangkan, termasuk isi TipTap, SEO, kategori/tag, dan jadwal. Isian belum lengkap tetap dapat dicadangkan. Server tetap sumber konten resmi: autosave tidak memanggil API, tidak menerbitkan atau mengubah konten live, dan tidak mengganti kontrak API/data backend.

Saat editor dibuka ulang, tawarkan Pulihkan atau Buang salinan; jangan menimpa salinan lama sebelum pilihan dibuat. Beri peringatan jika versi server berubah sejak salinan dibuat. Pemulihan mengikuti izin publikasi saat ini. Simpan ke server yang berhasil membersihkan salinan hanya jika tidak ada perubahan baru selama request berjalan; kegagalan menyimpan tidak membuang salinan. Perubahan di tab lain tidak boleh ditimpa diam-diam. Penyimpanan gagal/penuh ditampilkan, dan navigasi browser diperingatkan bila cadangan gagal dibuat.

Format localStorage: prefix `kd:editor-draft:v1:` + JSON tuple `[userId, siteId, PAGE|POST, entityId|null]`; nilai `{version:1,savedAt,baseUpdatedAt,data}` tervalidasi Zod. Salinan lebih dari 7 hari diabaikan/dibersihkan ketika dibuka. Tidak menyimpan password/token. Tanpa dependensi atau migrasi baru. Data berada di browser/perangkat yang sama; penghapusan data browser menghapus salinan. Fitur ini bukan sinkronisasi antarperangkat atau offline loading aplikasi.

UI: status “Tersimpan di perangkat ini” beserta waktu, prompt pemulihan, dan error yang dapat dibaca pembaca layar; warna mengikuti tema saat ini. Pengujian storage memakai Map fixture; browser memakai API fixture agar tidak menulis konten asli. Kasus: isolasi akun/situs/record, pemulihan seluruh isian setelah reload/offline, flush saat berpindah menu/situs, salinan rusak/kedaluwarsa, storage gagal, konflik antartab, pembersihan setelah simpan sukses, kegagalan API, dan perubahan baru ketika simpan berlangsung.

## Hasil verifikasi tahap 2

Selesai: helper penyimpanan/sesi editor bersama, hook autosave, pemberitahuan pemulihan, dan integrasi seluruh isian artikel/halaman. Form tidak menerima interaksi selama pilihan pemulihan belum diputuskan atau request Simpan berjalan. Tidak menambah dependensi, endpoint, maupun migrasi.

26 tes lulus (8 kasus baru), TypeScript dan build lulus; diff tanpa whitespace error. Browser fixture memverifikasi reload dan pemulihan judul/TipTap/SEO artikel, penyimpanan tanpa request API autosave, gagal Simpan, race penyimpanan, peringatan versi server berubah, cleanup sukses, pemulihan halaman, flush segera saat situs berganti, isolasi situs, buang salinan, dan error kuota. Tampilan 1440/390px terang/gelap diperiksa. Data asli tidak diubah. Artefak screenshot dan script browser ada di `.cache/drafts-ui` dan `.cache/verify-drafts-ui.mjs` (diabaikan Git).

Batas: hanya browser/perangkat yang sama; aplikasi belum memiliki offline loading. Storage yang dinonaktifkan/penuh tidak dapat menjamin cadangan, sehingga editor menampilkan kegagalan dan memperingatkan saat meninggalkan halaman browser. Warning build lama tentang `__dirname` dan ukuran bundle tetap ada.
