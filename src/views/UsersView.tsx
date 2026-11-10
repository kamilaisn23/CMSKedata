import React, { useEffect, useState } from 'react';
import { Site } from '../components/Navbar';
import { useToast } from '../components/Toast';
import { ROLES, type Role } from '../lib/access';
import './users.css';

interface TeamUser { id: string; name: string; email: string; role: Role; siteIds: string[] }
const labels: Record<Role, string> = { ADMIN: 'Admin pusat', MANAGER: 'Pengelola', EDITOR: 'Editor', PUBLISHER: 'Penerbit' };
const emptyForm = { name: '', email: '', password: '', role: 'EDITOR' as Role, siteIds: [] as string[] };

export function UsersView({ sites, currentUserId }: { sites: Site[]; currentUserId: string }) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/users');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'Gagal memuat tim');
      setUsers(json.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat tim'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(editing ? `/api/admin/users/${editing}` : '/api/admin/users', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'Gagal menyimpan akun');
      showToast('Akun dan hak akses tersimpan', 'success');
      if (editing === currentUserId) { window.location.replace('/login'); return; }
      setEditing(undefined); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan akun'); }
    finally { setSaving(false); }
  }
  return <section className="kd-team">
    <header className="kd-team-heading"><div><h1>Tim & Akses</h1><p>Atur siapa yang mengelola konten dan situs yang dapat mereka akses.</p></div>
      {editing === undefined && <button type="button" onClick={() => { setForm(emptyForm); setEditing(null); setError(''); }}>Tambah anggota</button>}
    </header>
    {error && <p role="alert" className="kd-team-error">{error} <button type="button" onClick={() => void load()}>Coba lagi</button></p>}
    {editing !== undefined ? <form className="kd-team-form" onSubmit={save}>
      <h2>{editing ? 'Sunting anggota' : 'Anggota baru'}</h2>
      <label>Nama<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Email<input required type="email" autoComplete="off" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label>{editing ? 'Password baru (opsional)' : 'Password'}<input type="password" autoComplete="new-password" required={!editing} minLength={12} maxLength={72} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
      <label>Peran<select value={form.role} disabled={editing === currentUserId} onChange={e => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map(role => <option key={role} value={role}>{labels[role]}</option>)}</select></label>
      <p className="kd-team-help">Editor menyunting draf. Penerbit dapat menerbitkan dan menjadwalkan. Pengelola juga mengatur situs. Admin pusat mengakses seluruh situs dan akun.</p>
      {form.role === 'ADMIN' ? <p>Admin pusat memiliki akses ke seluruh situs.</p> : <fieldset><legend>Situs yang ditugaskan</legend>{sites.length ? sites.map(site => <label className="kd-team-check" key={site.id}><input type="checkbox" checked={form.siteIds.includes(site.id)} onChange={e => setForm({ ...form, siteIds: e.target.checked ? [...form.siteIds, site.id] : form.siteIds.filter(id => id !== site.id) })} />{site.name}</label>) : <p>Belum ada situs.</p>}<p className="kd-team-help">Tanpa penugasan, anggota tidak dapat mengakses konten situs.</p></fieldset>}
      {editing && <p className="kd-team-help">Sesi anggota akan diakhiri setelah perubahan disimpan.{editing === currentUserId && ' Anda perlu login kembali.'}</p>}
      <div className="kd-team-actions"><button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan akses'}</button><button type="button" disabled={saving} onClick={() => { setEditing(undefined); setError(''); }}>Batal</button></div>
    </form> : loading ? <p role="status">Memuat anggota…</p> : <div className="kd-team-table"><table><thead><tr><th>Anggota</th><th>Peran</th><th>Akses situs</th><th><span className="sr-only">Tindakan</span></th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><span>{user.email}</span></td><td>{labels[user.role] || user.role}</td><td>{user.role === 'ADMIN' ? 'Semua situs' : user.siteIds.map(id => sites.find(site => site.id === id)?.name || id).join(', ') || 'Belum ditugaskan'}</td><td><button type="button" aria-label={`Sunting akses ${user.name}`} onClick={() => { setEditing(user.id); setForm({ name: user.name, email: user.email, role: user.role, siteIds: user.siteIds, password: '' }); setError(''); }}>Sunting</button></td></tr>)}</tbody></table>{!users.length && !error && <p>Belum ada anggota.</p>}</div>}
  </section>;
}
