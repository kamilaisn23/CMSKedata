# Perapian tampilan CSM

## Lanjutan workspace — 2026-11-06

Menggunakan skill resmi Kedata `kedata-design-frontend`, jalur app screens dan direction Achromatic ledger yang sama, tanpa redraw. Design brief kini dicatat sebagai Draft di `DESIGN_BRIEF.md`; keputusan yang digunakan: ukuran teks 14px, judul 24px, kontrol 40px (44px/16px pada mobile), lebar workspace 1280px, pengaturan 1180px, panel 8px dan kontrol 6px. Ini keputusan implementasi dari permintaan pengguna, belum pengesahan brief formal.

Halaman, Artikel, Media, Kategori/Tag, Menu, Pengaturan, Multi-situs, Audit Log, dan API Explorer memakai sistem gaya bersama `src/workspace.css`. Header tabel tidak lagi kapital/tebal berlebihan, tombol utama gelap, panel statis tanpa bayangan, filter mobile tersusun grid. Formulir pengaturan dibagi kolom judul bagian dan isian, lalu ditumpuk di HP. Label formulir statis dihubungkan ke kontrol; dropdown filter diberi nama aksesibel. Penghitung Halaman, Artikel, dan Media berasal dari daftar yang sedang difilter. Label prefix API key dikoreksi agar sesuai field yang ditampilkan. Dialog memakai lapisan di atas drawer dan batas tinggi viewport. Logo dan drawer hover/klik pilihan pengguna dipertahankan.

Validasi: TypeScript dan build lulus; `git diff --check` bersih. Browser pada build produksi lokal membuka sembilan halaman × tiga ukuran (1440/768/390): 27 pemeriksaan tanpa overflow halaman/main, seluruh dropdown yang terlihat memiliki label, editor artikel terbuka. Dialog tambah situs pada 390px muat di viewport dan tidak memiliki ID duplikat; tidak ada formulir yang disimpan atau konten yang dihapus dalam inspeksi ini.

Inspector Kedata pada Media, Pengaturan, dan Artikel: seluruhnya 0 FAIL. Pengaturan 0 WARN. Artikel dan Media masing-masing 1 WARN `hero-void` pada desktop karena masing-masing hanya memiliki satu data lokal; diterima karena daftar dan aset harus menunjukkan isi sebenarnya, bukan ditambah data/filler atau diperbesar secara palsu. Source lint: 0 FAIL, 49 WARN yang mencakup monospace untuk identifier/API/key/slug/URL/angka, shadow pada dialog yang mengambang, serta em dash sebagai nilai yang tidak tersedia. Konteks tersebut dibolehkan panduan app screens. Peringatan build bawaan tentang `__dirname` dan bundle besar tetap ada.

Kritik screenshot: ruang kerja lebih konsisten dan terbaca; sidebar tersembunyi memberi ruang daftar; thumbnail berasal dari aset media situs yang sudah ada. Pengaturan paling terbantu oleh pemisahan bagian dan label. Data yang sedikit menyisakan ruang kosong disengaja. Tabel HP tetap dapat digeser di dalam panel untuk menjangkau seluruh kolom, sebuah kompromi dibanding konversi penuh menjadi kartu. Ini restyle; belum menguji setiap operasi CRUD simpan/hapus, semua variasi error, atau screenshot mode gelap tiap halaman. Pemeriksaan fold desktop/tablet/mobile dilakukan untuk tiga layar utama dan screenshot tambahan untuk kategori, menu, multi-situs, audit, API, editor dan modal. Tidak ada foto, angka, atau testimonial buatan yang ditambahkan.

Tanggal: 2026-11-06. Dasar: permintaan tampilan bersih dengan background putih.

## Panduan dan keputusan

Menggunakan Kedata Vibeskills `kedata-design-frontend` dan `references/app-screens.md` dari https://github.com/Kedata-Indonesia/vibeskills. Direction: **Achromatic ledger**, seed **144360897**, tanpa redraw; palette dan type yang sudah ada dipertahankan. Design brief belum tersedia. Perubahan ini merupakan restyle aplikasi yang sudah ada, bukan perubahan arsitektur produk.

Pertanyaan utama dashboard: konten apa yang tersedia pada situs aktif dan ke mana admin perlu melanjutkan pekerjaan? Identitas produk tetap terlihat melalui nama Kedata CMS, scope situs aktif, serta strip domain situs. Elemen khasnya adalah ringkasan halaman, artikel, dan media yang terhubung ke pengelolaan konten aktual. Tidak ada angka, grafik, atau pertumbuhan buatan.

Latar putih, navigasi netral, garis pemisah ringan, radius panel 8px, tombol utama gelap, dan tipografi sistem dipakai secara konsisten. Ringkasan dibuat sebagai satu strip terbagi. Aktivitas sekunder tidak memakai bingkai kartu tambahan. Top bar dan switcher dipertahankan untuk menjaga alur aplikasi yang sudah ada; navigasi mobile berupa baris label yang dapat digeser, sebagai adaptasi restyle dari arahan shell Kedata. Tidak memakai gambar atau konten contoh tambahan.

## Verifikasi

- TypeScript: lulus.
- Build Vite: lulus; masih ada peringatan bawaan tentang `__dirname` di konfigurasi dan ukuran bundle, di luar perubahan visual.
- Tes regresi: 9 lulus, 0 gagal, memakai salinan database khusus tes.
- Kedata source lint pada DashboardView, LoginView, Sidebar: 0 FAIL, 0 WARN.
- Kedata browser inspector pada dashboard build produksi (preview lokal, API menuju server development): 1440px, 768px, 390px; 0 FAIL, 0 WARN. Screenshot tiap ukuran diperiksa.
- Pemeriksaan awal login menemukan kontras rendah dan bayangan berlebihan; keduanya diperbaiki. Dashboard akhir juga memperbaiki teks tepi sidebar dan label navbar yang terlalu kecil.

## Kritik visual akhir

Judul, scope situs, dan aksi pengelolaan artikel terbaca lebih dahulu. Ringkasan memakai data API asli dan angka nol tetap ditampilkan. Margin panel sejajar; aktivitas tanpa bingkai menghindari dua kartu dengan tinggi yang tidak seimbang. Warna status hanya dipakai pada status publikasi. Pada tablet panel ditumpuk; pada ponsel angka menjadi daftar dan navigasi tetap bisa dijangkau lewat scroll horizontal. Tabel artikel memiliki scroll internal jika diperlukan.

Batas: pemeriksaan visual terperinci berfokus pada dashboard serta perbaikan formulir login; seluruh halaman CRUD belum menjalani pemeriksaan screenshot individual. Screenshot full-page bawaan inspector tidak menggulir kontainer `main` aplikasi, sehingga screenshot fold adalah bukti utama komposisi awal. Belum ada pengujian pengguna untuk alur navigasi mobile. Mode gelap dan komponen CRUD lain tetap mengikuti gaya proyek yang sudah ada.

## Revisi sidebar
Sidebar desktop dipertahankan dengan kelompok Konten situs dan Workspace. Di tablet/ponsel, navigasi menjadi menu buka/tutup, menggantikan scroll horizontal. Pemilihan tujuan menutup menu; Escape menutup dan mengembalikan fokus ke tombol menu. Verifikasi browser build produksi: menu awal tertutup, dapat dibuka, pemilihan Artikel menutupnya, dan sidebar terlihat di desktop. TypeScript dan build lulus. Screenshot mobile dan desktop diperiksa.

## Revisi tombol sidebar global
Sesuai koreksi pengguna, tombol sidebar kini berada di kiri navbar dan berfungsi di desktop maupun ponsel. Desktop dapat menyembunyikan sidebar sepenuhnya sehingga area konten melebar, lalu membukanya kembali. Mobile mulai tertutup dan menutup setelah tujuan dipilih. Browser check pada build produksi: enam kondisi lulus (desktop menutup, konten melebar, membuka kembali, mobile awal tertutup, mobile membuka, pilihan menutup). TypeScript dan build lulus. Screenshot kedua kondisi desktop dan menu mobile diperiksa.

## Revisi drawer dari tepi kiri
Sesuai penjelasan pengguna, sidebar kini drawer overlay yang mulai tertutup dan meluncur penuh dari kiri saat kursor mendekati tepi kiri. Tombol tiga garis dan logo K juga membuka/menutupnya. Keluar dari area sidebar atau menekan latar menutupnya; Escape tetap didukung. Konten tidak bergeser. Browser memverifikasi enam kondisi (awal tertutup, hover membuka, lebar konten tetap, mouseleave menutup, logo membuka, dan logo mobile berfungsi tanpa overflow). TypeScript/build lulus, screenshot desktop dan mobile diperiksa.
