import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, ChevronDown, FileText, Globe, Grid2X2, Users, X } from 'lucide-react';
import { getAppNavigation } from './appLinks.js';
import './AppSwitcher.css';

const ICONS = { website: Globe, hr: Users, contracts: FileText };

export default function AppSwitcher({ currentApp, locale = 'en', appearance = 'light', variant = 'plain', compact = false }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, mobile: false });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const id = useId();
  const copy = getAppNavigation(locale);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 24);
      const height = panelRef.current?.getBoundingClientRect().height || 290;
      const below = rect.bottom + 8;
      const top = below + height <= window.innerHeight - 12
        ? below : Math.max(12, rect.top - height - 8);
      setPosition({
        top,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        mobile: window.innerWidth <= 640,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, locale]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => { setOpen(false); triggerRef.current?.focus(); };
    const outside = event => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setOpen(false);
        if (position.mobile) triggerRef.current?.focus();
      }
    };
    const keydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      if (event.key === 'Tab' && position.mobile) {
        const nodes = panelRef.current?.querySelectorAll('a[href], button:not([disabled])');
        const first = nodes?.[0];
        const last = nodes?.[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keydown, true);
    };
  }, [open, position.mobile]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('a[href]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !position.mobile) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, position.mobile]);

  function closeAndFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={`icue-apps icue-apps--${variant}${compact ? ' icue-apps--compact' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="icue-apps__trigger"
        aria-label={copy.trigger}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); }
        }}
      >
        <Grid2X2 size={18} aria-hidden="true" />
        <span className="icue-apps__trigger-label">{copy.trigger}</span>
        <ChevronDown className="icue-apps__chevron" size={13} aria-hidden="true" />
      </button>
      {open && createPortal(
        <>
          {position.mobile && <div className="icue-apps__backdrop" aria-hidden="true" />}
          <section
            ref={panelRef}
            id={id}
            role="dialog"
            aria-modal={position.mobile || undefined}
            aria-label={copy.heading}
            data-appearance={appearance}
            className={`icue-apps__panel${variant === 'band' || variant === 'square' ? ' icue-apps__panel--square' : ''}${position.mobile ? ' icue-apps__panel--mobile' : ''}`}
            style={position.mobile ? undefined : { top: position.top, left: position.left }}
            onBlur={event => {
              if (!position.mobile && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== triggerRef.current) setOpen(false);
            }}
          >
            <div className="icue-apps__heading">
              <span>{copy.heading}</span>
              <button type="button" className="icue-apps__close" aria-label={copy.close} onClick={closeAndFocus}><X size={18} aria-hidden="true" /></button>
            </div>
            <nav aria-label={copy.trigger}>
              {copy.apps.map(app => {
                const Icon = ICONS[app.id];
                const current = app.id === currentApp;
                const Tag = current ? 'div' : 'a';
                return (
                  <Tag
                    key={app.id}
                    className={`icue-apps__destination${current ? ' icue-apps__destination--current' : ''}`}
                    aria-current={current ? 'page' : undefined}
                    {...(current ? {} : { href: app.href, target: '_blank', rel: 'noopener noreferrer', onClick: closeAndFocus })}
                  >
                    <Icon className="icue-apps__icon" size={20} aria-hidden="true" />
                    <span className="icue-apps__copy"><span className="icue-apps__name">{app.label}</span><span className="icue-apps__description">{app.description}</span></span>
                    {current ? <span className="icue-apps__current"><Check size={14} aria-hidden="true" /><span>{copy.current}</span></span> : <><ArrowUpRight size={16} className="icue-apps__external" aria-hidden="true" /><span className="icue-apps__sr-only">{copy.newTab}</span></>}
                  </Tag>
                );
              })}
            </nav>
          </section>
        </>, document.body,
      )}
    </div>
  );
}
