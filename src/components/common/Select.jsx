// src/components/common/Select.jsx
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import './Select.css';

/**
 * Replaces <select>, whose open list is browser chrome we can't theme.
 * The menu is portaled so overflow:hidden ancestors (the edit modal) don't clip it.
 */
const Select = ({
  value,
  onChange,
  options = [],
  ariaLabel,
  className = '',
  disabled = false,
  placeholder,
}) => {
  const uid = useId();
  const listId = `${uid}-list`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((o) => String(o.value) === String(value));
  const [highlight, setHighlight] = useState(() => Math.max(0, selectedIndex));

  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const display = selected ? selected.label : (placeholder || '');

  useEffect(() => {
    if (open) setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 4;
      const menuH = menu.offsetHeight;
      const width = Math.min(Math.max(rect.width, 160), window.innerWidth - 16);
      const openUp = rect.bottom + gap + menuH > window.innerHeight - 8
        && rect.top > window.innerHeight - rect.bottom;
      const top = openUp
        ? Math.max(8, rect.top - menuH - gap)
        : Math.min(rect.bottom + gap, window.innerHeight - menuH - 8);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width;
      if (left < 8) left = 8;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.width = `${width}px`;
      menu.style.visibility = 'visible';
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, { capture: true });
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const pick = (option) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (delta) => {
    if (!options.length) return;
    setHighlight((h) => {
      const next = (h + delta + options.length) % options.length;
      return next;
    });
  };

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault();
      const option = options[highlight];
      if (option) pick(option);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  const activeId = open && options[highlight] ? `${uid}-opt-${highlight}` : undefined;

  return (
    <div className={`ledger-select${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`ledger-select__trigger${selected ? '' : ' ledger-select__trigger--empty'}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
      >
        <span>{display}</span>
        <ChevronDown size={14} aria-hidden="true" className="ledger-select__icon" />
      </button>

      {open && createPortal(
        <ul
          ref={menuRef}
          id={listId}
          className="ledger-select__menu"
          role="listbox"
          aria-label={ariaLabel}
          style={{ visibility: 'hidden' }}
        >
          {options.map((option, i) => {
            const isSelected = String(option.value) === String(value);
            return (
              <li key={`${option.value}-${i}`}>
                <button
                  type="button"
                  id={`${uid}-opt-${i}`}
                  tabIndex={-1}
                  role="option"
                  aria-selected={isSelected}
                  data-highlighted={i === highlight ? 'true' : undefined}
                  className={[
                    'ledger-select__option',
                    isSelected ? 'ledger-select__option--on' : '',
                    i === highlight ? 'ledger-select__option--active' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
};

export default Select;
