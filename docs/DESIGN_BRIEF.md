# Kedata CMS — design brief

Varian InfinityFree v1.0 (2026-11-10): gunakan React yang sama. Layar backup varian menjelaskan unduh ZIP MySQL + media dan pemulihan melalui phpMyAdmin/FTP; tidak menawarkan pemulihan SQLite yang tidak kompatibel. Lihat [INFINITYFREE.md](INFINITYFREE.md).

Tahap 4 v0.5: layar Kalender Editorial dengan ringkasan tipografi, kisi bulan, agenda tanggal, filter situs, dan antrean draf/review. Di ponsel tampilkan jumlah publikasi per tanggal dan agenda di bawah kisi. Warna slate Kedata, tema terang/gelap. Halaman root/login tidak menampilkan form login jika sesi aktif; langsung dashboard. Detail [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md).

Tahap 3 v0.4: filter Menunggu review pada artikel/halaman, tombol Ajukan review/Tinjau/Riwayat, dialog native berisi preview tersimpan dan riwayat. Penerbit mendapat aksi Setujui & terbitkan atau Kembalikan ke draf dengan catatan wajib; editor pending hanya membaca. Tema dan tata letak yang ada dipertahankan.

Tahap 3 v0.4: filter Menunggu review pada artikel/halaman, tombol Ajukan review/Tinjau/Riwayat, dialog native berisi preview tersimpan dan riwayat. Penerbit mendapat aksi Setujui & terbitkan atau Kembalikan ke draf dengan catatan wajib; editor pending hanya membaca. Tema dan tata letak yang ada dipertahankan.

Pembaruan editor v0.3 (2026-11-09): tampilkan status cadangan lokal, waktu simpan, pilihan Pulihkan/Buang, peringatan versi server berubah, dan kegagalan storage. Gunakan komponen pemberitahuan ringkas di atas editor, tema terang/gelap, tombol minimal 44px; lihat [EDITOR_DRAFTS.md](EDITOR_DRAFTS.md).

Pembaruan akses v0.2 (2026-11-09): layar Tim & Akses menggunakan tabel anggota, formulir peran, dan checkbox penugasan situs; menu serta status editor mengikuti [ACCESS_CONTROL.md](ACCESS_CONTROL.md). Pertahankan token dan mode terang/gelap yang ada.

Status: Draft, disusun dari permintaan pengguna dan panduan Kedata Vibeskills. Bukan persetujuan untuk deploy.

## Tujuan dan identitas

Workspace pengelolaan konten multi-situs yang tenang, terang, dan mudah dipakai. Pertahankan stack React/Tailwind serta data dan kontrak API yang tersedia. Logo monogram K dan warna slate Kedata dipertahankan; background putih mengikuti permintaan pengguna.

## Arah visual

Kedata `kedata-design-frontend`, jalur app screens, direction **Achromatic ledger** (seed 144360897). Warna terutama pada status, bukan setiap permukaan. Tidak menambah grafik atau data buatan. Font sistem yang sudah ada dipertahankan. Judul 24px/600, isi dan formulir 14px, meta 12–13px. Gutter desktop 32px, tablet 24px, ponsel 16px. Panel 8px, kontrol 6px, garis pemisah ringan, tanpa bayangan panel statis.

## Navigasi yang diminta pengguna

Sidebar tersembunyi pada awalnya dan meluncur dari kiri dengan hover tepi layar, tombol tiga garis, atau klik logo. Konten tetap memakai lebar penuh. Navigasi memiliki kelompok konten dan workspace. Mobile menggunakan klik, bukan hover. Escape, area luar, atau keluar pointer menutup drawer. Perilaku ini mengungguli shell default direction.

## Layar dan pekerjaan

Dashboard merangkum isi situs; Halaman dan Artikel untuk menemukan dan menyunting publikasi; Media untuk memilih aset asli; Kategori/Tag dan Menu untuk struktur konten; Pengaturan untuk identitas publik/kontak; Multi-situs untuk workspace; Audit Log untuk meninjau perubahan; API Explorer untuk mencoba integrasi.

## Komponen dan responsivitas

Satu judul dan aksi utama tiap halaman, filter berlabel, tabel tanpa header berwarna atau label kapital berlebihan, formulir dengan label terlihat dan tinggi kontrol konsisten. Pengaturan memakai kolom judul bagian di samping panel formulir pada desktop, ditumpuk di ponsel. Tabel lebar bergulir di dalam panel, bukan seluruh halaman. Pertahankan empty/loading/error state dan konfirmasi tindakan destruktif. Mode terang tetap default; mode gelap tersedia melalui kontrol pengguna.

## Verifikasi

TypeScript, build, uji navigasi browser pada ukuran 1440/768/390, dan screenshot pada layar utama. Pemeriksaan simpan/hapus hanya memakai database tes; inspeksi visual tidak mengubah konten pengguna. Catat batas pengujian dan penyimpangan nyata dalam UI_RESTYLE_REPORT.md.
