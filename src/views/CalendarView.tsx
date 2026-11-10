import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Site } from '../components/Navbar';
import { calendarBounds, jakartaDateKey, monthDays, shiftMonth, type CalendarData, type CalendarEntry } from '../lib/calendar';
import './calendar.css';

const label = (status: string) => ({ SCHEDULED: 'Terjadwal', PUBLISHED: 'Terbit', IN_REVIEW: 'Menunggu review', DRAFT: 'Draf' })[status] || status;
const fullDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export function CalendarView({ sites, onManage }: { sites: Site[]; onManage: (entry: CalendarEntry) => void }) {
  const today = jakartaDateKey(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [siteId, setSiteId] = useState('');
  const [selectedDay, setSelectedDay] = useState(today);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    const query = new URLSearchParams({ month }); if (siteId) query.set('siteId', siteId);
    fetch(`/api/admin/calendar?${query}`, { signal: controller.signal }).then(async response => {
      const json = await response.json(); if (!response.ok) throw new Error(json.error?.message || 'Gagal memuat kalender');
      if (!controller.signal.aborted) setData(json.data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, siteId, retry]);
  function changeMonth(next: string) { try { calendarBounds(next); } catch { return; } setMonth(next); setSelectedDay(next === today.slice(0, 7) ? today : `${next}-01`); }
  const events = data?.events || [];
  const eventsByDay = new Map<string, CalendarEntry[]>();
  for (const event of events) {
    const day = jakartaDateKey(event.at!);
    const items = eventsByDay.get(day) || []; items.push(event); eventsByDay.set(day, items);
  }
  const agenda = eventsByDay.get(selectedDay) || [];
  const days = monthDays(month);
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const manage = (entry: CalendarEntry) => <button type="button" className="kd-calendar-manage" onClick={() => onManage(entry)}>Kelola {entry.kind === 'PAGE' ? 'halaman' : 'artikel'} <span className="sr-only">{entry.siteName}</span></button>;
  return <section className="kd-calendar">
    <header className="kd-calendar-header"><div><h1>Kalender Editorial</h1><p>Jadwal publikasi seluruh situs dalam satu ruang kerja.</p></div>
      <label>Situs<select aria-label="Filter situs kalender" value={siteId} onChange={event => setSiteId(event.target.value)}><option value="">Semua situs yang dapat diakses</option>{sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>
    </header>
    <div className="kd-calendar-summary" aria-label="Ringkasan editorial">
      {[['Terjadwal bulan ini', data?.counts.scheduled], ['Terbit bulan ini', data?.counts.published], ['Draf belum dijadwalkan', data?.counts.draft], ['Menunggu review', data?.counts.review]].map(([text, count]) => <div key={text}><span>{text}</span><strong>{loading || error ? '—' : count ?? 0}</strong></div>)}
    </div>
    <div className="kd-calendar-toolbar"><div className="kd-calendar-month"><button type="button" aria-label="Bulan sebelumnya" disabled={month === '1900-01'} onClick={() => changeMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button><h2>{monthLabel}</h2><button type="button" aria-label="Bulan berikutnya" disabled={month === '9998-12'} onClick={() => changeMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button></div>
      <div className="kd-calendar-controls"><button type="button" onClick={() => { changeMonth(today.slice(0, 7)); setSelectedDay(today); }}>Hari ini</button><label className="sr-only" htmlFor="editorial-month">Pilih bulan</label><input id="editorial-month" type="month" value={month} min="1900-01" max="9998-12" onChange={event => changeMonth(event.target.value)} /><span>Waktu Jakarta (WIB)</span></div>
    </div>
    {loading && <p role="status">Memuat kalender…</p>}
    {error && <p className="kd-calendar-error" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></p>}
    <div className="kd-calendar-layout" aria-busy={loading}>
      <div className="kd-calendar-month-view"><div className="kd-calendar-weekdays" aria-hidden="true">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="kd-calendar-grid" role="group" aria-label={`Kalender ${monthLabel}`}>
          {days.map(day => {
            const items = eventsByDay.get(day) || [];
            return <button key={day} type="button" className={`kd-calendar-day${day === today ? ' is-today' : ''}`} disabled={!day.startsWith(month)} aria-pressed={selectedDay === day} aria-label={`${fullDate(day)}, ${items.length} publikasi`} onClick={() => setSelectedDay(day)}>
              <span className="kd-calendar-day-number">{Number(day.slice(-2))}</span>
              <span className="kd-calendar-day-events">{items.slice(0, 2).map(item => <span key={`${item.kind}-${item.id}`} className={`kd-calendar-chip is-${item.status.toLowerCase()}`} title={`${item.siteName}: ${item.title}`}>{item.title}</span>)}{items.length > 2 && <small>+{items.length - 2} lainnya</small>}</span>
              {!!items.length && <span className="kd-calendar-day-count">{items.length} publikasi</span>}
            </button>;
          })}
        </div>
        {!loading && !error && !events.length && <p className="kd-calendar-empty">Belum ada publikasi terjadwal atau terbit pada bulan ini.</p>}
        <p className="kd-calendar-legend"><span>Terjadwal</span><span>Terbit</span><small>Pilih tanggal untuk melihat agenda.</small></p>
      </div>
      <aside className="kd-calendar-agenda" aria-label="Agenda tanggal terpilih"><h2>{fullDate(selectedDay)}</h2>
        {!loading && !error && !agenda.length && <p>Tidak ada publikasi pada tanggal ini.</p>}
        <ul>{agenda.map(entry => <li key={`${entry.kind}-${entry.id}`}><div className="kd-calendar-entry-meta"><time dateTime={entry.at!}>{new Date(entry.at!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</time><span>{label(entry.status)}</span></div><h3>{entry.title}</h3><p>{entry.siteName} · {entry.kind === 'PAGE' ? 'Halaman' : 'Artikel'}</p>{manage(entry)}</li>)}</ul>
      </aside>
    </div>
    <section className="kd-calendar-queue"><div><h2>Belum dijadwalkan</h2><p>Draf dan konten menunggu review. Menampilkan hingga 12 perubahan terbaru pada situs yang dipilih.</p></div>
      {!loading && !error && !data?.queue.length && <p className="kd-calendar-empty">Tidak ada konten dalam antrean.</p>}
      <ul>{data?.queue.map(entry => <li key={`${entry.kind}-${entry.id}`}><div><h3>{entry.title}</h3><p>{entry.siteName} · {entry.kind === 'PAGE' ? 'Halaman' : 'Artikel'} · {label(entry.status)}</p></div>{manage(entry)}</li>)}</ul>
    </section>
  </section>;
}
