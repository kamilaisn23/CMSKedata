# Test plan — hak akses per peran dan situs

Tambahan varian InfinityFree v1.0 (2026-11-10): `node tests/infinityfree.test.mjs` menjalankan PHP dan MySQL khusus di `.cache`, dengan database sementara; tidak membaca .env/database asli. Cakupan: instalasi terkunci, login/cookie/logout, scope situs/peran, CRUD, validasi HTML/URL/relasi, review konflik, versi, pagination/cache API, media MIME, kalender, SQL backup tanpa sesi, feeds dan proteksi folder privat. Builder memeriksa ukuran file serta ketiadaan secret/database dalam ZIP upload. Validasi aktual dan batas hosting dicatat dalam `hosting/infinityfree/VERIFICATION.md`.

Tambahan v1.3: kalender dan alur sesi pada [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md). Uji unit batas WIB/grid/tahun kabisat; HTTP scope semua situs, invalid month, antrean 12 tanpa membatasi count, status/field keluaran; browser root/login dengan sesi aktif/tidak aktif, kalender filter/agenda/pindah bulan/kelola situs, desktop/ponsel/gelap, loading/error/empty.

Tambahan v1.2: [CONTENT_REVIEW.md](CONTENT_REVIEW.md). Uji HTTP dalam access.test.ts mencakup siklus kedua tipe konten, penolakan editor memutuskan, catatan wajib, kunci edit/hapus/restore, versi stale/keputusan ganda, pemisahan situs, tak terlihat publik, dan penggantian tag atomik. Browser fixture memeriksa dialog editor/penerbit, catatan, submit/return/approve, serta responsivitas.

Tambahan v1.2: [CONTENT_REVIEW.md](CONTENT_REVIEW.md). Uji HTTP dalam access.test.ts mencakup siklus kedua tipe konten, penolakan editor memutuskan, catatan wajib, kunci edit/hapus/restore, versi stale/keputusan ganda, pemisahan situs, tak terlihat publik, dan penggantian tag atomik. Browser fixture memeriksa dialog editor/penerbit, catatan, submit/return/approve, serta responsivitas.

Tambahan v1.1 (2026-11-09): tahap autosave di [EDITOR_DRAFTS.md](EDITOR_DRAFTS.md). Uji storage dan race melalui `tests/editor-drafts.test.ts`; cek browser halaman/artikel, reload, flush saat menu/situs berganti, kegagalan simpan server, pemulihan isi TipTap/metadata, tema terang/gelap, dan viewport ponsel. API browser memakai fixture; tidak menulis akun/konten asli.

Versi 1.0, 2026-11-09. Rencana ini mencakup fitur akses yang diizinkan pengguna; bukan rencana QA seluruh produk. Kontrak: [ACCESS_CONTROL.md](ACCESS_CONTROL.md). Stack tetap React/Express/Prisma/SQLite; runner Node test + tsx yang sudah digunakan proyek.

| Kriteria | Kasus HTTP di tests/access.test.ts |
|---|---|
| Admin semua situs; anggota hanya penugasan | Sites/me, tanpa penugasan, sesi invalid, role tidak dikenal; respons tanpa secret |
| Editor hanya menyunting draf | Simpan draf sukses; publish/schedule, edit/hapus/restore live ditolak; penerbit publish sukses |
| Isolasi record | ID situs lain dengan query situs sendiri ditolak; versi/kategori/tag lintas situs ditolak |
| Administrasi | Akun/settings/menu/audit terbatas; pengelola settings situs sendiri sukses; cron global admin saja |
| Media | Global/antar situs ditolak; upload ditolak sebelum file ditulis; query terverifikasi mengungguli body |
| API explorer | Prefix membutuhkan sesi asli, peran pengelola/admin, dan penugasan |
| Akun | Email duplikat, situs invalid, password pendek, demosi diri ditolak; sesi dicabut setelah perubahan; audit tanpa password |

Fixture: DB baru di `.cache/access-test-*` dari schema Prisma, tanpa seed/copy data pengguna. Upload juga di scratch. Set DATABASE_URL sebelum import Prisma. Tidak mengubah DB aplikasi. Jalankan `node --import tsx --test tests/access.test.ts`, lint/build, dan suite lama. Periksa UI Tim & Akses pada desktop/mobile, terang/gelap serta menu editor. Exit: semua kasus keamanan lulus, tidak ada error kompilasi, batas visual dilaporkan.
