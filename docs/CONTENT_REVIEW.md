# Persetujuan konten — tahap 3

Versi 1.0, 2026-11-09. Diizinkan pengguna dengan “cepetttt” melanjutkan tahap 3. Alur: DRAFT → IN_REVIEW → PUBLISHED, atau IN_REVIEW → DRAFT dengan catatan pengembalian. Editor mengajukan; ADMIN/MANAGER/PUBLISHER meninjau pada situs yang boleh diakses. Konten pending dikunci dari edit, hapus, dan restore sampai diputuskan. Publikasi langsung oleh penerbit tetap tersedia sesuai hak akses sebelumnya; persetujuan ini alur editorial, bukan kewajiban empat mata untuk setiap publikasi.

Tidak mengubah schema: status Prisma berupa String; catatan/aktor/waktu disimpan di AuditLog dan snapshot di ContentVersion. Konten IN_REVIEW tidak tampil pada API/feed publik. Autosave lokal tidak mengajukan atau menyetujui konten.

Kontrak: GET `/api/admin/{pages|posts}/:id/review` memberi 10 aktivitas review terbaru `{action,actor,createdAt,details:{note}}`. POST path sama menerima `{action:submit|approve|return,updatedAt:ISO,note?:string(max2000)}`; return wajib note. 200 sukses; 400 validasi; 401 sesi; 403 peran/situs; 404 hilang; 409 status/versi berubah. Perubahan, snapshot, dan audit dalam satu transaksi; approve memicu webhook publikasi. Endpoint update/delete/restore biasa juga memeriksa status/versi saat mutasi agar tidak melewati kunci review melalui request bersamaan.

UI menggunakan dialog preview konten tersimpan, catatan, waktu dan aktor. Editor dapat mengajukan/melihat riwayat; penerbit dapat menyetujui atau mengembalikan. Filter Menunggu review pada halaman/artikel. Test: kedua jenis konten, peran, situs, pengembalian wajib catatan, kunci edit/delete/restore, konflik versi, publikasi dan audit; browser fixture untuk dialog/aksi. Tidak menulis konten pengguna saat tes.

## Hasil

Selesai: 29 tes lulus, lint/build lulus; browser fixture lolos submit, penguncian, larangan keputusan editor, return wajib catatan, riwayat, approve, dan dialog halaman pada desktop/ponsel serta mode gelap. Overflow textarea diperbaiki. Backend lokal dimuat ulang; tidak ada migrasi, seed, atau perubahan konten asli dari tes. Screenshot di `.cache/review-ui`. Warning build lama tentang config Vite dan ukuran bundle tetap ada. Tahap berikutnya kalender editorial; backup belum dikerjakan.
