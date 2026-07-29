// src/components/dashboard/DatePicker.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthGrid, firstWeekday, parseISO, sameDay, toISO } from '../../utils/calendar';

/**
 * Replaces <input type="date">, whose picker is browser chrome we can't theme.
 * The calendar expands inline rather than floating, because the modal it lives
 * in scrolls and would clip a popover.
 */
const DatePicker = ({ value, onChange, ariaLabel }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const selected = parseISO(value);
  const today = new Date();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = selected || today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const weekStart = firstWeekday(locale);

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    // 2024-01-07 is a Sunday, so +i walks the week from Sunday.
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(2024, 0, 7 + ((weekStart + i) % 7));
      return { short: fmt.format(day), long: long.format(day) };
    });
  }, [locale, weekStart]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(view),
    [locale, view]
  );

  const weeks = useMemo(() => buildMonthGrid(view, weekStart), [view, weekStart]);

  const shiftMonth = (delta) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  const pick = (date) => {
    onChange(toISO(date));
    setOpen(false);
  };

  const display = selected
    ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(selected)
    : t('dashboard.selectDate', 'Select a date');

  return (
    <div className="ledger-datepicker" ref={rootRef}>
      <button
        type="button"
        className={`ledger-datepicker__trigger${selected ? '' : ' ledger-datepicker__trigger--empty'}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ariaLabel || t('dashboard.selectDate', 'Select a date')}
      >
        <span>{display}</span>
        <CalendarDays size={14} aria-hidden="true" className="ledger-datepicker__icon" />
      </button>

      {open && (
        <div className="ledger-cal">
          <div className="ledger-cal__head">
            <button
              type="button"
              className="ledger-cal__nav"
              onClick={() => shiftMonth(-1)}
              aria-label={t('dashboard.prevMonth', 'Previous month')}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="ledger-cal__month">{monthLabel}</span>
            <button
              type="button"
              className="ledger-cal__nav"
              onClick={() => shiftMonth(1)}
              aria-label={t('dashboard.nextMonth', 'Next month')}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <table className="ledger-cal__grid">
            <thead>
              <tr>
                {weekdays.map((d) => (
                  <th key={d.long} scope="col" abbr={d.long}>{d.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => (
                    <td key={di}>
                      {day && (
                        <button
                          type="button"
                          className={[
                            'ledger-cal__day',
                            sameDay(day, selected) ? 'ledger-cal__day--selected' : '',
                            sameDay(day, today) ? 'ledger-cal__day--today' : '',
                          ].filter(Boolean).join(' ')}
                          aria-pressed={sameDay(day, selected)}
                          onClick={() => pick(day)}
                        >
                          {day.getDate()}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ledger-cal__foot">
            <button type="button" className="ledger-cal__action" onClick={() => pick(new Date())}>
              {t('dashboard.today', 'Today')}
            </button>
            <button
              type="button"
              className="ledger-cal__action"
              onClick={() => { onChange(''); setOpen(false); }}
            >
              {t('dashboard.clearDate', 'Clear')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
