/**
 * Date maths for the custom calendar. Kept out of the component so it can be
 * tested directly, and so the component file exports nothing but a component
 * (which is what React Fast Refresh needs).
 */

/** 'YYYY-MM-DD' -> local Date. Never via new Date(str), which parses as UTC. */
export const parseISO = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Local Date -> 'YYYY-MM-DD', with no timezone round-trip. */
export const toISO = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const sameDay = (a, b) =>
  Boolean(a) && Boolean(b) &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** First day of the week for a locale: 0 = Sunday, 1 = Monday. */
export const firstWeekday = (locale) => {
  try {
    const l = new Intl.Locale(locale);
    const info = l.getWeekInfo?.() ?? l.weekInfo;
    if (info?.firstDay) return info.firstDay % 7; // the spec uses 7 for Sunday
  } catch {
    /* older engines: fall through to the heuristic */
  }
  return String(locale || '').startsWith('en') ? 0 : 1;
};

/** Weeks a month can span: always padded to 6 so the grid never changes height. */
export const WEEK_ROWS = 6;

/**
 * Lays a month out into whole weeks, padding both ends with nulls.
 * Always 6 rows - a month spans 4 to 6 depending on where it starts, and letting
 * that vary would make the calendar (and the modal around it) jump on every
 * month change.
 */
export const buildMonthGrid = (view, weekStart) => {
  const year = view.getFullYear();
  const month = view.getMonth();
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length < WEEK_ROWS * 7) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};
