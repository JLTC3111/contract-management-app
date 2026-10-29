import { useId } from 'react';
import { ArrowUpRight, Check, ChevronDown, FileText, Globe, Users } from 'lucide-react';

const ICONS = { website: Globe, hr: Users, contracts: FileText };

export default function EcosystemCard({ app, copy, open, narrow, expanded, onToggle, onNavigate }) {
  const id = useId();
  const Icon = ICONS[app.id];
  const visible = !narrow || expanded;
  const meta = <span className="icue-ecosystem__meta">
    <span className="card-nav__app-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.65} /></span>
    <span id={`${id}-category`} className="icue-ecosystem__category">{app.category}</span>
    {narrow && <ChevronDown className="icue-ecosystem__chevron" size={16} strokeWidth={1.7} aria-hidden="true" />}
  </span>;

  return <>
    {narrow ? <h3 className="icue-ecosystem__accordion-heading">
      <button
        type="button"
        className="icue-ecosystem__toggle"
        aria-expanded={expanded}
        aria-controls={`${id}-details`}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-category ${id}-description`}
        tabIndex={open ? undefined : -1}
        onClick={onToggle}
      >
        {meta}
        <span id={`${id}-title`} className="card-nav__label">{app.label}</span>
        <span id={`${id}-description`} className="card-nav__description">{app.description}</span>
        {app.current && !expanded && <span className="card-nav__current icue-ecosystem__summary-current">{copy.current}</span>}
      </button>
    </h3> : <div className="icue-ecosystem__head">
      {meta}
      <h3 id={`${id}-title`} className="card-nav__label">{app.label}</h3>
      <p className="card-nav__description">{app.description}</p>
    </div>}

    <div id={`${id}-details`} className="icue-ecosystem__body" hidden={!visible}>
      <div className="icue-ecosystem__features">
        <h4 id={`${id}-features`}>{copy.features}</h4>
        <ul aria-labelledby={`${id}-features`}>
          {app.features.map(feature => <li key={feature}>
            <Check size={13} strokeWidth={1.8} aria-hidden="true" />
            <span>{feature}</span>
          </li>)}
        </ul>
      </div>
      <footer className="icue-ecosystem__footer">
        {app.current ? <span className="card-nav__current">{copy.current}</span> : <a
          className="card-nav__link icue-ecosystem__action"
          href={app.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${app.action} — ${copy.newTab}`}
          tabIndex={open && visible ? undefined : -1}
          onClick={onNavigate}
        >
          <span>{app.action}</span>
          <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>}
        <span className="icue-ecosystem__domain">{new URL(app.href).hostname}</span>
      </footer>
    </div>
  </>;
}
