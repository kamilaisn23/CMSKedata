# Perapian tampilan CSM

## Lanjutan workspace ‚Äî 2026-11-06

Menggunakan skill resmi Kedata `kedata-design-frontend`, jalur app screens dan direction Achromatic ledger yang sama, tanpa redraw. Design brief kini dicatat sebagai Draft di `DESIGN_BRIEF.md`; keputusan yang digunakan: ukuran teks 14px, judul 24px, kontrol 40px (44px/16px pada mobile), lebar workspace 1280px, pengaturan 1180px, panel 8px dan kontrol 6px. Ini keputusan implementasi dari permintaan pengguna, belum pengesahan brief formal.

Halaman, Artikel, Media, Kategori/Tag, Menu, Pengaturan, Multi-situs, Audit Log, dan API Explorer memakai sistem gaya bersama `src/workspace.css`. Header tabel tidak lagi kapital/tebal berlebihan, tombol utama gelap, panel statis tanpa bayangan, filter mobile tersusun grid. Formulir pengaturan dibagi kolom judul bagian dan isian, lalu ditumpuk di HP. Label formulir statis dihubungkan ke kontrol; dropdown filter diberi nama aksesibel. Penghitung Halaman, Artikel, dan Media berasal dari daftar yang sedang difilter. Label prefix API key dikoreksi agar sesuai field yang ditampilkan. Dialog memakai lapisan di atas drawer dan batas tinggi viewport. Logo dan drawer hover/klik pilihan pengguna dipertahankan.

Validasi: TypeScript dan build lulus; `git diff --check` bersih. Browser pada build produksi lokal membuka sembilan halaman √ó tiga ukuran (1440/768/390): 27 pemeriksaan tanpa overflow halaman/main, seluruh dropdown yang terlihat memiliki label, editor artikel terbuka. Dialog tambah situs pada 390px muat di viewport dan tidak memiliki ID duplikat; tidak ada formulir yang disimpan atau konten yang dihapus dalam inspeksi ini.

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

## Landing publik type-led ‚Äî 2026-11-09

Sesuai permintaan pengguna agar landing tidak lagi berupa kotak-kotak, arah **dense-tiles** diganti dengan **type-only-statement** "Type and nothing else", seed **175115966**, palette dan tipografi tetap. Tidak ada grid tile, kartu, border, radius, atau shadow statis. Halaman disusun sebagai pernyataan tipografi terbuka: hero dua baris "Semua situs. / Satu dasbor." yang ditengahkan dengan tanda Kedata di atasnya, pencarian live katalog publik, enam kemampuan sebagai baris teks, plakat foto "Dari huruf ke data", fragmen antarmuka editor dan riwayat versi, alur kerja empat tahap, integrasi API, FAQ run-in dua kolom, CTA satu kata "Masuk", dan footer tanda tangan. Sesuai koreksi pengguna, ukuran huruf hero, CTA, dan footer diperkecil (hero maksimum 72px, CTA 240px, footer 120px) agar tidak mendominasi layar. Teks pendukung hero ikut ditengahkan agar poros halaman tunggal.

Interaksi dipertahankan tanpa data fiktif: filter pencarian (Tentang/API/Karier), menu mobile buka/tutup dengan Escape dan klik luar, scrollspy fitur/alur/integrasi/FAQ, reveal bertahap yang menghormati `prefers-reduced-motion`, tab JavaScript/PHP, tombol salin request, dan "Jalankan" yang mengetik contoh respons API. Rekaman letterpress adalah satu-satunya gerak gambar: baru diputar senyap sebagai loop saat plakat masuk viewport, dengan tombol "Jeda/Putar rekaman"; saat `prefers-reduced-motion` aktif video tidak diputar dan hanya poster yang terlihat. Empat fragmen `data-ui` (pencarian, contoh kode, editor, riwayat versi) melengkapi dua gambar nyata (foto huruf logam dan rekaman letterpress).

Gambar diambil dari koleksi terbuka dan tidak dipresentasikan sebagai milik Kedata: ‚ÄúMetal movable type‚Äù oleh Willi Heidelbach (CC BY 2.5) dan ‚ÄúPrinting in a letterpress‚Äù oleh Subhashish Panigrahi (CC BY-SA 4.0), keduanya via Wikimedia Commons. Kredit tercetak kecil di footer (`public/photos/credits.json`). Foto huruf logam juga menjadi satu-satunya gambar yang bergerak halus saat masuk (skala 1.05 ke 1) untuk memberi relief di antara bagian teks.

Catatan perbaikan dari inspector: kontras CTA menjadi putih di `#29343d`; bidang CTA diisi kolom keterangan di kanan agar tidak lopsided; CTA dan footer dipisah warna (deep lalu paper); ukuran kata CTA disetel `clamp(64px,16vw,240px)`; paragraf FAQ dibatasi `62ch`; hero memakai tanda Kedata, ukuran `clamp(36px,5.2vw,72px)`, dan leading 0.94; shadow panel menu mobile dihapus dan diganti langkah warna; ukuran paragraf plakat disamakan dengan token yang sudah ada agar jumlah ukuran tetap sembilan.

Verifikasi: `npm run lint` dan `npm run build` lulus (CSS 89.98 kB, JS 810.89 kB; warning ukuran bundle dan `__dirname` Vite saja). Inspector Kedata pada preview produksi port 4180, lebar 1440/768/390: **0 FAIL, 0 WARN**, termasuk `no-real-pictures` dan `no-footage` yang kini terpenuhi. Metrik: 7.5 layar, 587 kata, 3 elemen gambar (2 gambar nyata: foto dan video), 21 headings, ukuran 13/14/15/16/34/40/72/120/230 px, video berjalan dengan poster, tanpa error konsol atau overflow horizontal. Kritik visual berbasis metrik dan kode; model tidak dapat meninjau screenshot pada sesi ini. Mode gelap mengikuti token `.dark`.

## Penyegaran landing interaktif ó 9 November 2026

Scope: permintaan pengguna memperbaiki tampilan http://localhost:3000 agar bersih dan interaktif. Root aplikasi tetap kanonis untuk perubahan ini; perubahan pengguna yang sudah ada dipertahankan.

Arah sebelumnya Type and nothing else (seed 175115966) diteruskan dengan palet dan font Kedata. Hero kini dua kolom: proposisi CMS di kiri, demo workspace di kanan. Identitas putih/slate dan monogram tetap; fragmen produk memakai data-ui sehingga garis dan sudut panel mengikuti konvensi antarmuka. Penyimpangan dari komposisi lama diperlukan agar produk dapat dicoba langsung. Tidak ada dependency baru.

Perubahan: demo berpindah antara dua situs dan memilih artikel dengan pratinjau langsung; pencarian awal kosong menampilkan katalog contoh; kolom pencarian memakai ukuran teks formulir; FAQ menjadi details/summary yang bisa dipakai lewat keyboard; ukuran CTA/footer diperkecil; ritme section dipadatkan; kontras teks diperkuat; mobile menumpuk hero dan membatasi lebar baris artikel. Demo memakai contoh publik lokal, bukan konten editorial privat. Label demo ditampilkan di panel. Semua jumlah demo dihitung dari daftar artikel.

Verifikasi: npm.cmd run lint lulus; npm.cmd run build lulus; npm.cmd test 10/10 lulus. Build masih memberi warning ukuran bundle dan __dirname pada konfigurasi Vite yang sudah ada. Browser test pada preview produksi 4181 lulus untuk pergantian situs, pemilihan artikel, FAQ, pencarian, menu mobile buka/tutup, tidak ada overflow dokumen, dan tidak ada exception konsol. Inspector desktop/tablet/mobile 1440/768/390 memberikan 0 FAIL; tersisa warning variasi ukuran font tablet yang mencakup teks antarmuka dan skala judul responsif. Lint desain 0 FAIL dengan dua warning garis pada fragmen data-ui, dipertahankan untuk membedakan kontrol dan workspace.

ROUND 2
Seen in one second: Kedata CMS menggabungkan banyak situs di satu workspace dan dapat dicoba dari beranda.
Idea (one sentence): Buktikan janji satu dasbor dengan berpindah situs dan membaca pratinjau konten di hero.
Live thing: pemilih situs, daftar artikel dan pratinjau; pencarian katalog; FAQ.
Layout words by section: hero=split product / search=filled workspace / capabilities=editorial rows / imagery=publishing plate / product=editor-history split / flow=four columns / API=split code / FAQ=disclosure list / CTA=compact close.
Scores: design 6.5 ∑ usability 8 ∑ creativity 7 ∑ content 8 ? overall 7.1
Caps applied: design maksimum 6.5 karena dua aset foto/rekaman, bukan empat. Ini penilaian internal berbasis screenshot, bukan uji pengguna.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Mobile demo rows memotong status (after-refresh/mobile-fold.jpg): min-width:0 dan width:100% pada tombol baris.
2. Variasi skala teks terlalu besar (after-refresh/desktop-page-02.jpg): heading/footer/CTA disatukan, paragraf 16px dan teks plakat 24px.
3. Catatan hero ponsel terlalu kecil (after-refresh/mobile-fold.jpg): ukuran dinaikkan menjadi 13px.

Aset yang sudah ada tetap dipakai, kredit berada di footer dan public/photos/credits.json: Metal movable type, Willi Heidelbach, CC BY 2.5, https://commons.wikimedia.org/wiki/File:Metal_movable_type.jpg; Printing in a letterpress, Subhashish Panigrahi, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Printing_in_a_letterpress.webm. Tidak ada gambar baru atau ilustrasi pengganti foto. Demo dan respons API adalah contoh yang diberi label, bukan data produksi. Dashboard/CRUD tidak menjadi scope perubahan ini; mode gelap dipertahankan melalui token tetapi belum diuji visual ulang.

## Revisi bagian penerbitan ó 9 November 2026

Permintaan lanjutan pengguna untuk mengubah bagian Dari huruf ke data dan Di dalam workspace ditangani dengan satu bagian Dari ide ke publikasi. Foto huruf logam, video letterpress, teks filosofis, dan fragmen editor/riwayat statis dihapus dari landing. Aset file tetap disimpan agar tidak menghapus materi pengguna. Kode playback video dan CSS bagian lama yang sudah tidak dipakai dibersihkan; kredit gambar di footer dihapus karena aset tidak lagi ditampilkan.

Penggantinya adalah demo lokal Tulis/Tinjau/Terbit: judul dan isi dapat diedit; tahap tinjau menampilkan teks React yang aman; simulasi terbit menampilkan pesan bahwa tidak ada konten dipublikasikan; kembali menulis mempertahankan draf selama halaman terbuka. Tidak ada request simpan atau perubahan database. Label demo tetap terlihat. Arah putih/slate sebelumnya dipertahankan tanpa menambahkan aset atau dependency.

Verifikasi: TypeScript dan build lulus. Browser memverifikasi perubahan judul muncul di pratinjau, simulasi terbit, kembali ke draf tanpa kehilangan teks, tidak ada elemen video, tidak ada overflow pada 1440/768/390, dan nol exception konsol. Screenshot bagian baru pada ketiga ukuran ditinjau. Inspector dev 0 FAIL, 2 WARN (dev-server dan variasi ukuran font tablet). Pemeriksaan no-real-pictures/no-footage dikecualikan secara eksplisit karena foto/rekaman justru merupakan bagian yang diminta untuk diganti; fungsi produk menjadi visual utamanya. Build mempertahankan warning bundle dan konfigurasi Vite yang sudah ada. Mode gelap belum diperiksa ulang.

## Revisi CTA dan footer ó 9 November 2026

Sesuai screenshot pengguna, tautan penutup satu bidang bertuliskan Masuk dan wordmark footer berukuran besar diganti. Penutup sekarang memakai panel sage Kedata: judul Cerita Anda berikutnya, mulai dari sini, deskripsi singkat, tombol Buka workspace menuju /login, dan tautan integrasi menuju /docs. Footer memakai monogram serta nama produk ukuran 20px, tagline, empat tautan, copyright, dan navigasi Kembali ke atas. Mobile menumpuk panel dan menata tautan footer dua kolom. Warna panel tetap saat hover; hanya kontrolnya yang memberi umpan balik.

TypeScript/build lulus. Browser pada build produksi 4181 memverifikasi tujuan tautan, tidak ada overflow horizontal pada 1440/768/390, dan nol exception konsol. Ketiga screenshot bagian penutup ditinjau: judul dua baris, tombol proporsional, identitas footer ringkas. Tidak ada gambar, dependency, atau perubahan API. Mode gelap memakai token yang tersedia dan belum diperiksa visual ulang. Warning build ukuran bundle dan konfigurasi Vite tetap.

## Penyegaran dokumentasi API ó 9 November 2026

/docs mempertahankan Swagger UI lokal dan OpenAPI yang sama, dengan shell dokumentasi putih/slate: header Kedata, sidebar pengantar/request/autentikasi/referensi pada desktop, navigasi horizontal internal pada tablet/ponsel, contoh cURL, catatan x-api-key, dan tautan OpenAPI JSON. CSS berada di public/kedata-docs.css dan disajikan juga melalui route eksplisit /docs/assets/kedata-docs.css. Warna endpoint GET dibuat sage, panel datar tanpa shadow, parameter dan tombol memiliki tinggi yang konsisten. Filter Swagger diaktifkan; model disembunyikan pada kondisi awal agar daftar endpoint lebih mudah dibaca. Key otorisasi tidak dipersistenkan.

TypeScript/build lulus, 10/10 tes lulus termasuk ketersediaan stylesheet baru dan fallback Swagger. Browser localhost:3000/docs memverifikasi 9 endpoint, buka panel, Authorize buka/tutup, filter posts menghasilkan 2 endpoint, dan Try it out mengaktifkan formulir Execute tanpa mengirim request. Screenshot 1440/768/390 serta endpoint terbuka pada desktop/ponsel ditinjau; tidak ada overflow horizontal atau exception konsol. Server lokal dimuat ulang agar perubahan backend HTML terlihat. Contoh cURL memakai placeholder key dan localhost dengan petunjuk mengganti domain saat integrasi; tidak ada credential nyata di contoh. Build tetap memberi warning ukuran bundle React dan __dirname Vite yang sudah ada. Tidak menambahkan dependency dan tidak mengubah kontrak API.

## Hero terpusat dan latar bergerak ó 9 November 2026

Sesuai permintaan terbaru, judul Semua situs. Satu dasbor., deskripsi, tombol, dan catatan fitur kembali dipusatkan. Demo workspace dipindahkan ke bawah hero dengan lebar maksimum 960px; anchor #demo dan semua interaksinya tetap. Latar berupa dua bidang SVG sage yang bergeser/berputar perlahan (20/26 detik) memakai transform CSS tanpa dependency, gambar eksternal, canvas, atau loop JavaScript. Elemen dekoratif aria-hidden dan pointer-events:none. Tombol Jeda/Lanjutkan mengendalikan animation-play-state. Reduced motion menghentikan animasi dan menyembunyikan kontrol yang tidak diperlukan. Bentuk latar dekoratif adalah penyimpangan sengaja dari larangan ornamen skill karena pengguna secara eksplisit meminta background bergerak.

TypeScript dan build lulus. Browser build produksi 4181 membuktikan transform berubah, tombol jeda menghentikan animasi, reduced motion menonaktifkan animasi, teks berada di tengah pada 1440/768/390, tidak ada overflow, pergantian situs demo tetap berfungsi, dan tidak ada exception konsol. Ketiga screenshot diperiksa. Token gelap tersedia tetapi belum diperiksa visual ulang. Tidak ada perubahan backend, database, atau dependency. Warning build bundle dan konfigurasi Vite tetap.

## Pemilih situs dengan pencarian dan scroll ó 9 November 2026

Dropdown select native Navbar diganti komponen SiteSwitcher. Trigger menampilkan nama situs; panel memisahkan nama dan domain agar terbaca utuh, menandai situs aktif, menyediakan pencarian, empty state, serta jumlah hasil. Daftar dibatasi 300px/45dvh dengan scrollbar tipis dan overscroll containment agar roda gulir tidak menggulir halaman saat mencapai ujung daftar. Mobile memakai panel selebar viewport dengan gutter 16px. Interaksi keyboard: input autofocus, ArrowUp/Down/Home/End menavigasi pilihan sekaligus menggulirnya ke area terlihat; Escape menutup dan mengembalikan fokus; klik di luar dan Tab meninggalkan panel menutupnya. Memilih situs tetap memakai callback onSelectSite yang sama; tidak ada perubahan API/data.

TypeScript dan build lulus. Fixture sementara dengan 20 situs contoh membuktikan overflow daftar, pencarian domain, perubahan pilihan, End menggulir ke pilihan terakhir, Escape memulihkan fokus, klik luar menutup, panel muat pada 1440/390, dan tanpa exception konsol. Screenshot desktop/mobile diperiksa. Fixture publik dihapus setelah pengujian. Integrasi terhadap sesi login pengguna dan mode gelap belum diuji ulang; token tema gelap tetap dipakai. Warning build Vite dan bundle yang sudah ada tetap.

## Pengganti FAQ memakai Kedata design frontend ó 9 November 2026

Sesuai permintaan pengguna, bagian Pertanyaan umum dihapus dan diganti komposisi split Satu workspace. Cara kerja Anda. Tiga pilihan peran (Tim konten, Pengelola situs, Pengembang) mengganti judul, deskripsi, tiga pekerjaan nyata dalam produk, dan aksi tujuan. Tidak ada kartu fitur berikon, data statistik buatan, atau FAQ panjang. Pilihan memakai tombol native dengan aria-pressed dan panel aria-live; seluruh isi dipilih dari kemampuan CMS yang sudah ada. Navigasi dan scrollspy Tanya jawab diganti Untuk tim menuju #untuk-tim. Palet, tipografi sistem, dan gaya panel Kedata yang sudah dipakai tetap. Brief repo masih Draft; komposisi peran ini adalah keputusan berdasarkan permintaan pengguna, bukan mockup yang sudah disetujui.

TypeScript/build lulus. Browser build produksi 4181 memverifikasi FAQ lama hilang, ketiga pilihan mengganti konten dan tujuan (#demo,/login,/docs), hanya satu pilihan aktif, nol overflow horizontal pada 1440/768/390, dan nol exception konsol. Screenshot akhir ketiga viewport diperiksa. Tidak ada API, database, aset, atau dependency baru. Mode gelap belum diperiksa visual ulang. Warning build bundle/config Vite tetap.

## Hero dramatis forest/sage ó 9 November 2026

Permintaan terbaru mempertahankan persis judul Semua situs. Satu dasbor. dengan model, warna dan latar lebih dramatis. Hero memakai forest #142b26, teks putih kehijauan ukuran desktop maksimum 116px, tombol sage #d9e8c9, dua bidang SVG, empat belas kontur topografi, dan dua orbit di tepi. Semua dekorasi berada di belakang konten dan aria-hidden. Gerak CSS lambat; pointer mouse memberi kedalaman ringan melalui dua custom properties, tanpa render React tiap pointermove. Pointer touch diabaikan. Kontrol jeda menghentikan seluruh animasi, reduced motion menonaktifkan gerak dan parallax. Ornamen dipakai sesuai permintaan eksplisit pengguna untuk latar lebih kaya; palet tetap keluarga Kedata. Tidak ada gambar eksternal atau dependency baru.

TypeScript/build lulus. Browser build produksi 4181 memverifikasi latar bergerak, kontrol jeda, reduced motion, judul terpusat dan tanpa overflow pada 1440/768/390, demo tetap berfungsi, serta nol exception konsol. Screenshot ketiga ukuran ditinjau: judul tetap dua baris dan kontras jelas; kontur lebih samar pada ponsel. Warning bundle dan konfigurasi Vite tetap. Tidak mengubah backend/data.

## Koreksi palet hero mengikuti logo ó 9 November 2026

Warna diambil langsung dari public/kedata-mark.svg: #445867, #6C7A89, #A6B8B0. Hero forest diganti turunan slate gelap #263743, kedua bidang memakai warna logo #445867/#6c7a89, kontur/orbit sage #a6b8b0, tombol #dfe2dc. Judul dan animasi tidak berubah. Build lulus; browser 1440/768/390 tetap lulus motion/pause/reduced-motion/layout/demo tanpa exception atau overflow. Screenshot desktop/mobile ditinjau. Warning build lama tetap.

## Sambungan hero dan konten ó 9 November 2026

Batas persegi hero diganti kurva SVG yang mengikuti warna background bagian bawah. Demo naik 64px (36px di ponsel) ke area transisi, dengan latar hero-bawah dan pencarian disamakan ke token paper agar tidak ada pita putih terpisah. Jeda animasi dipindah ke kanan atas agar tidak tertutup demo. Padding hero menjaga teks/tombol di atas kurva. Build lulus; browser 1440/768/390 memverifikasi layout, animasi/jeda/reduced motion dan demo tanpa overflow/exception. Screenshot desktop dan ponsel ditinjau. Tidak ada dependency/aset eksternal baru.

## Kondisi akhir sebelum push ó 9 November 2026

Keputusan terbaru pengguna: hero mengikuti warna logo slate, batas bawah berupa kurva menyatu ke demo, animasi berjalan berulang terus, dan tombol jeda tidak ditampilkan. Reduced motion tetap menghentikan animasi. Pemeriksaan akhir: TypeScript, build, dan 10/10 tes lulus. Commit hanya mencakup source aplikasi, stylesheet/aset dokumentasi yang dipakai, manifest/lockfile dependency, tes dokumentasi, gitignore artefak lokal, dan laporan ini. Database lokal, berkas credential, fixture sementara, foto yang tidak lagi digunakan, dan instalasi skill lokal tidak disertakan.
