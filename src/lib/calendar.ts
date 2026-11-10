const jakartaFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
export function jakartaDateKey(date: Date | string) {
  const parts = jakartaFormatter.formatToParts(new Date(date));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
export function calendarBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1900 || Number(month.slice(0, 4)) > 9998) throw new Error('Bulan tidak valid');
  return { start: new Date(`${month}-01T00:00:00+07:00`), end: new Date(`${shiftMonth(month, 1)}-01T00:00:00+07:00`) };
}
export function monthDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first); date.setUTCDate(1 - offset + index);
    return date.toISOString().slice(0, 10);
  });
}
export interface CalendarEntry {
  id: string; kind: 'PAGE' | 'POST'; siteId: string; siteName: string; title: string;
  status: string; at: string | null; updatedAt: string;
}
export interface CalendarData {
  events: CalendarEntry[]; queue: CalendarEntry[];
  counts: { scheduled: number; published: number; draft: number; review: number };
}
