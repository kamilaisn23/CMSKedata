import React from 'react';
import './backups.css';

export function BackupsView() {
  return <section className="kd-backups">
    <header><div><h1>Backup & Pemulihan</h1><p>Cadangkan database MySQL dan media workspace ke komputer pribadi.</p></div></header>
    <section className="kd-backup-section">
      <h2>Unduh backup</h2>
      <p>Paket berisi SQL database dan media, tanpa sesi login. Simpan di tempat pribadi karena berisi data dan hash akun.</p>
      <a href="/api/admin/backups/export" download>Unduh backup MySQL dan media (.zip)</a>
      <p>Untuk workspace besar atau jika hosting menghentikan proses: gunakan phpMyAdmin → Export, lalu unduh folder uploads melalui FTP.</p>
    </section>
    <section className="kd-backup-section">
      <h2>Pulihkan melalui panel hosting</h2>
      <ol><li>Cadangkan data hosting yang sedang aktif.</li><li>Buat database MySQL kosong dan import schema.sql, lalu data.sql melalui phpMyAdmin.</li><li>Pulihkan folder uploads lewat FTP, sesuaikan konfigurasi database, lalu login kembali.</li></ol>
      <p>Backup SQLite dari versi Node.js membutuhkan konversi sebelum diimpor ke MySQL. Jangan upload SQL atau ZIP backup ke folder publik htdocs.</p>
    </section>
  </section>;
}
