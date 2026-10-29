import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CardNav from '../ui/CardNav.jsx';
import EcosystemCard from './EcosystemCard.jsx';
import { getEcosystemNavigation } from './ecosystemCopy.js';
import { withNavigationPreferences } from '../../lib/navigationPreferences.js';
import './AppSwitcher.css';

const PANEL_WIDTH = 860;
const MOBILE_WIDTH = 760;

export default function AppSwitcher({ currentApp, locale = 'en', appearance = 'light', variant = 'plain', compact = false }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedApp, setExpandedApp] = useState(currentApp);
  const [position, setPosition] = useState({ top: 0, left: 0, mobile: false });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const id = useId();
  const copy = getEcosystemNavigation(locale);
  const expand = () => { setExpandedApp(currentApp); setMounted(true); setOpen(true); };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 24);
      // Measure expanded content before the spring starts, so a menu near the
      // bottom edge does not jump from below its trigger to above it mid-open.
      const content = panelRef.current?.querySelector('.card-nav__content');
      const bar = panelRef.current?.querySelector('.card-nav__bar');
      const height = Math.min(window.innerHeight - 24, (content?.scrollHeight || content?.getBoundingClientRect().height || 400) + (bar?.getBoundingClientRect().height || 88));
      const below = rect.bottom + 8;
      const top = below + height <= window.innerHeight - 12
        ? below : Math.max(12, rect.top - height - 8);
      const next = {
        top,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        mobile: window.innerWidth <= MOBILE_WIDTH,
      };
      setPosition(previous => previous.top === next.top && previous.left === next.left && previous.mobile === next.mobile ? previous : next);
    };
    place();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    if (panelRef.current) observer?.observe(panelRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer?.disconnect();
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
        const nodes = [...(panelRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])]
          .filter(node => node.tabIndex >= 0 && !node.closest('[hidden]'));
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
    if (open) panelRef.current?.querySelector(position.mobile ? '.icue-ecosystem__toggle' : 'a[href]')?.focus({ preventScroll: true });
  }, [open, position.mobile]);

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
        onClick={() => { if (open) setOpen(false); else expand(); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); expand(); }
        }}
      >
        <svg className="icue-apps__toggle" width="18" height="22" viewBox="0 0 20 24" fill="currentColor" aria-hidden="true" focusable="false">
          <circle cx="10" cy="5" r="1.8" />
          <circle cx="10" cy="12" r="1.8" />
          <circle cx="10" cy="19" r="1.8" />
        </svg>
        <span className="icue-apps__trigger-label">{copy.trigger}</span>
      </button>
      {mounted && createPortal(
        <>
          {open && position.mobile && <div className="icue-apps__backdrop" aria-hidden="true" />}
          <section
            ref={panelRef}
            id={id}
            role="dialog"
            aria-modal={open && position.mobile || undefined}
            aria-hidden={!open}
            inert={!open}
            aria-label={copy.heading}
            data-appearance={appearance}
            className={`icue-apps__panel icue-apps__panel--cards${position.mobile ? ' icue-apps__panel--mobile' : ''}`}
            style={position.mobile ? undefined : { top: position.top, left: position.left }}
            onBlur={event => {
              if (!position.mobile && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== triggerRef.current) setOpen(false);
            }}
            onKeyDown={event => {
              if (!event.target.matches('.icue-ecosystem__toggle') || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              const toggles = [...event.currentTarget.querySelectorAll('.icue-ecosystem__toggle')];
              const index = toggles.indexOf(event.target);
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? toggles.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + toggles.length) % toggles.length;
              event.preventDefault();
              toggles[next]?.focus();
            }}
          >
            <CardNav
              open={open}
              onOpenChange={next => { if (next) expand(); else closeAndFocus(); }}
              onRest={expanded => { if (!expanded) setMounted(false); }}
              theme={appearance}
              surface="solid"
              heading={copy.heading}
              subtitle={copy.subtitle}
              ariaLabel={copy.trigger}
              menuLabel={false}
              menuText={copy.trigger}
              closeText={copy.close}
              intro={false}
              animateOnMount
              interactionManaged
              maxWidth={PANEL_WIDTH}
              narrow={position.mobile}
              cardHeight={0}
              style={{ '--cn-bar': position.mobile ? '112px' : '88px', '--cn-inset': '12px', '--cn-gap': '12px' }}
              bounce={0}
              stagger={0}
              speed={1.6}
              items={copy.apps.map(app => ({ ...app, href: withNavigationPreferences(app.href, { locale, theme: appearance }), current: app.id === currentApp }))}
              renderCard={(app, { open, narrow }) => <EcosystemCard
                app={app}
                copy={copy}
                open={open}
                narrow={narrow}
                expanded={app.id === expandedApp}
                onToggle={() => setExpandedApp(previous => previous === app.id ? null : app.id)}
                onNavigate={closeAndFocus}
              />}
            />
          </section>
        </>, document.body,
      )}
    </div>
  );
}
