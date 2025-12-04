import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, Home, Shield, RefreshCw, User, Search, 
  Settings, MessageSquare, AlertTriangle, Rocket, MapPin,
  BookOpen, Loader2, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';

// Icon mapping for markdown headings
const HEADING_ICONS = {
  Home,
  Shield,
  RefreshCw,
  User,
  Search,
  Settings,
  MessageSquare,
  AlertTriangle,
  Rocket,
  MapPin
};

const ManualViewer = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const loadManual = async () => {
      setLoading(true);
      setError(false);
      setNotFound(false);
      
      try {
        console.log('Trying to fetch: /docs/manual.md');
        const res = await fetch('/docs/manual.md');
        console.log(`Response status: ${res.status}, ok: ${res.ok}`);
        
        if (res.ok) {
          const text = await res.text();
          console.log(`Received content length: ${text.length}`);
          
          if (text.includes('<!doctype html>') || text.includes('<html')) {
            console.error('Received HTML instead of markdown');
            throw new Error('Received HTML instead of markdown');
          }
          
          const parseTemplate = (template) => {
            return template.replace(/\{\{t\('([^']+)'\)\}\}/g, (match, key) => {
              return t(key);
            });
          };
          
          const processedContent = parseTemplate(text);
          setContent(processedContent);
          setLoading(false);
        } else {
          console.log('Using embedded manual content as fallback');
          
          const embeddedManual = `# ${t('manual.title', 'Contract Manager App Manual')}

${t('manual.intro', 'Welcome to the Contract Manager App for ICUE(VN)! This guide will walk you through the key features and how to use them effectively.')}

---

### [Home] ${t('manual.homeDashboard.title', 'Home & Dashboard')}

- **${t('sidebar.home', 'Home')}**: ${t('manual.homeDashboard.home', 'Redirects to ICUE.VN homepage.')}
- **${t('sidebar.dashboard', 'Dashboard')}**: ${t('manual.homeDashboard.dashboard', 'The main area where you can view summary stats, recent contract updates, and quick actions.')}

---

### [Shield] ${t('manual.approvals.title', 'Approvals')}

- **${t('sidebar.approvals', 'Approvals')}**: ${t('manual.approvals.approveTab', 'Displays contracts awaiting approval.')}
- **${t('send_approval_request', 'Request Approval')}**: ${t('manual.approvals.actions.requestApproval', 'Editors/Admins can request approval for a contract with a custom message.')}
- **${t('approval_board_approve', 'Approve Contract')}**: ${t('manual.approvals.actions.approveContract', 'Admins/Approvers can review and approve contracts.')}
- **${t('comments', 'Comment on Contracts')}**: ${t('manual.approvals.actions.comment', 'Add feedback or discussion notes to a contract.')}

---

### [RefreshCw] ${t('manual.statusUpdate.title', 'Update Status')}

- **${t('sidebar.updateStatus', 'Update Status')}**: ${t('manual.statusUpdate.trigger', 'Runs a background job to auto-update contract statuses based on set rules (e.g., deadlines or conditions).')}
- ${t('manual.statusUpdate.accessibleVia', 'Accessible via the sidebar button "Update Status"')}

---

### [User] ${t('manual.profile.title', 'Profile Menu')}

- **${t('sidebar.changePassword', 'Change Password')}**: ${t('manual.profile.changePassword', 'Initiates the password reset flow.')}
- **${t('sidebar.manual', 'Read Manual')}**: ${t('manual.profile.readManual', 'Opens this user manual.')}
- **${t('sidebar.sendFeedback', 'Send Feedback')}**: ${t('manual.profile.sendFeedback', 'Opens a form (or mailto) to share ideas or report bugs.')}

---

### [Search] ${t('manual.sidebar.title', 'Sidebar Navigation')}

- **${t('manual.sidebar.collapsible', 'Collapsible Sidebar')}**: Toggle between collapsed and expanded states.
- **${t('manual.sidebar.mobile', 'Mobile Mode')}**: On screens smaller than 1024px, the sidebar appears at the bottom in a row layout.

---

### [Settings] ${t('manual.roles.title', 'Roles & Permissions')}

| ${t('sidebar.role', 'Role')} | ${t('common.permissions', 'Permissions')} |
| -------- | --------------------------------------------------------------------- |
| ${t('sidebar.role_label.admin', 'Admin')} | ${t('sidebar.role_description.admin', 'Full access: create, edit, delete, approve, and comment on contracts.')} |
| ${t('sidebar.role_label.editor', 'Editor')} | ${t('sidebar.role_description.editor', 'Can create, edit, and delete contracts, but not approve them.')} |
| ${t('sidebar.role_label.approver', 'Approver')} | ${t('sidebar.role_description.approver', 'Can view and approve contracts but cannot edit.')} |
| ${t('sidebar.role_label.viewer', 'Viewer')} | ${t('sidebar.role_description.viewer', 'Read-only access to all contract data.')} |

---

### [MessageSquare] ${t('manual.comments.title', 'Commenting & Collaboration')}

- ${t('manual.comments.inline', 'Add inline comments on contract details.')}
- ${t('manual.comments.timestamps', 'All comments are timestamped and visible to others with access.')}

---

### [AlertTriangle] ${t('manual.limitations.title', 'Known Limitations')}

- ${t('manual.limitations.approvalDisabled', 'Approval request button is disabled if the contract is already pending.')}
- ${t('manual.limitations.rls', 'Comments and approvals are restricted via Supabase Row Level Security (RLS).')}

---

### [Rocket] ${t('manual.tips.title', 'Tips & Shortcuts')}

- ${t('manual.tips.sidebarTip', 'Use the sidebar in collapsed mode to save screen space.')}
- ${t('manual.tips.cronTip', 'Use the status cron update to avoid manual tracking.')}
- ${t('manual.tips.manualTip', 'Use the manual and feedback options to improve your experience.')}

---

${t('manual.footer.thanks', 'Happy Contracting!')} [MapPin]

---

${t('manual.footer.contact', 'For questions or help, contact dev@icue.vn')}`;
          
          setContent(embeddedManual);
          setNotFound(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading manual:', err);
        setError(true);
        setContent(`# ${t('manual.error.title', 'Manual Error')}

${t('manual.error.message', 'Sorry, there was an error loading the manual. Please try again later.')}

**${t('common.error', 'Error')} Details:** ${err.message}

${t('manual.error.fallback', 'You can try:')}
- ${t('manual.error.refresh', 'Refreshing the page')}
- ${t('manual.error.connection', 'Checking your internet connection')}
- ${t('manual.error.support', 'Contacting support if the problem persists')}`);
        setLoading(false);
      }
    };
    loadManual();
  }, [t, i18n.language]);

  // Custom component renderers for ReactMarkdown
  const markdownComponents = {
    h3: ({ node, children, ...props }) => {
      const childArray = React.Children.toArray(children);
      if (childArray.length === 0) return <h3 {...props}>{children}</h3>;

      const firstChild = childArray[0];
      
      if (typeof firstChild === 'string') {
        const match = firstChild.match(/^\s*\[([a-zA-Z]+)\]\s*/);
        if (match) {
          const iconName = match[1];
          const Icon = HEADING_ICONS[iconName];
          if (Icon) {
            const remainingText = firstChild.replace(match[0], '');
            return (
              <h3 {...props} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon size={24} />
                <span>
                  {remainingText}
                  {childArray.slice(1)}
                </span>
              </h3>
            );
          }
        }
      }
      return <h3 {...props}>{children}</h3>;
    },
    p: ({ node, children, ...props }) => {
      const childArray = React.Children.toArray(children);
      const textContent = childArray
        .map(child => (typeof child === 'string' ? child : ''))
        .join('');
      
      if (textContent.includes('[MapPin]')) {
        const newChildren = childArray.map(child => {
          if (typeof child === 'string') {
            return child.replace('[MapPin]', '').trim();
          }
          return child;
        });
        
        return (
          <p {...props} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {newChildren}
            <MapPin size={16} />
          </p>
        );
      }
      return <p {...props}>{children}</p>;
    }
  };

  return (
    <div className="manual-markdown">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          width: '95%',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        <button
          className="btn-hover-effect"
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#e5e7eb',
            color: '#111827',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          <ArrowLeft size={20} /> {t('buttons.back')}
        </button>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={24} /> {t('headers.userManual')}
        </h1>
        
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Loader2 size={20} className="animate-spin" /> {t('manual.loading', 'Loading manual...')}
          </div>
        )}
        
        {notFound && !loading && (
          <div style={{ 
            color: '#f59e42', 
            marginBottom: '1rem', 
            fontStyle: 'italic',
            padding: '0.5rem',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            border: '1px solid #f59e42',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={16} /> {t('manual.missingTranslation', { defaultValue: 'No manual available in your language. Showing English or default.' })}
          </div>
        )}
        
        {error && !loading && (
          <div style={{ 
            color: '#ef4444', 
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#fef2f2',
            borderRadius: '4px',
            border: '1px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} /> {t('manual.error.loading', 'Error loading manual. Please try again.')}
          </div>
        )}
        
        {!loading && (
          <div
            style={{
              backgroundColor: 'var(--manual-bg, var(--card-bg))',
              color: 'var(--manual-text, var(--text))',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              transition: 'background 0.2s, color 0.2s',
              width: '100%',
            }}
          >
            <style>{`
              :root {
                --manual-bg: #f9fafb;
                --manual-text: #1e293b;
              }
              body.dark {
                --manual-bg: #181e29;
                --manual-text: #fff;
              }
              .manual-markdown h1, .manual-markdown h2, .manual-markdown h3, .manual-markdown h4, .manual-markdown h5, .manual-markdown h6 {
                color: var(--manual-text);
              }
              .manual-markdown code, .manual-markdown pre {
                background: var(--card-bg);
                color: var(--manual-text);
              }
              .manual-markdown table {
                background: var(--manual-bg);
                color: var(--manual-text);
                border-collapse: collapse;
                width: 100%;
              }
              .manual-markdown th, .manual-markdown td {
                border: 1px solid var(--card-border);
                padding: 0.5em 1em;
              }
              .manual-markdown ul,
              .manual-markdown ol {
                list-style: disc;
                padding-left: 1.5em;
                margin-left: 0;
              }
              .manual-markdown li {
                margin-bottom: 0.25em;
              }
              .manual-markdown li strong,
              .manual-markdown li b {
                font-weight: 600;
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin {
                animation: spin 1s linear infinite;
              }
            `}</style>
            <div className="manual-markdown-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualViewer;
