import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';

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
          // Try to fetch the manual template file
          console.log('Trying to fetch: /docs/manual.md');
          const res = await fetch('/docs/manual.md');
          console.log(`Response status: ${res.status}, ok: ${res.ok}`);
          
          if (res.ok) {
            const text = await res.text();
            console.log(`Received content length: ${text.length}`);
            console.log(`Content preview: ${text.substring(0, 100)}`);
            
            // Check if we got HTML instead of markdown
            if (text.includes('<!doctype html>') || text.includes('<html')) {
              console.error('Received HTML instead of markdown');
              throw new Error('Received HTML instead of markdown');
            }
            
            // Parse the template and replace {{t('key')}} placeholders with translations
            const parseTemplate = (template) => {
              return template.replace(/\{\{t\('([^']+)'\)\}\}/g, (match, key) => {
                return t(key);
              });
            };
            
            const processedContent = parseTemplate(text);
            setContent(processedContent);
            setLoading(false);
          } else {
            // If fetch fails, use embedded manual content as fallback
            console.log('Using embedded manual content as fallback');
            const embeddedManual = `# ${t('manual.title', 'Contract Manager App Manual')}


${t('manual.intro', 'Welcome to the Contract Manager App for ICUE(VN)! This guide will walk you through the key features and how to use them effectively.')}

---

${t('manual.homeDashboard.title', '🛖 Home & Dashboard')}

${t('sidebar.home', 'Home')}**: ${t('manual.homeDashboard.home', 'Redirects to ICUE.VN homepage.')}
${t('sidebar.dashboard', 'Dashboard')}**: ${t('manual.homeDashboard.dashboard', 'The main area where you can view summary stats, recent contract updates, and quick actions.')}


### ${t('manual.approvals.title', '🛡️ Approvals')}
  ${t('sidebar.approvals', 'Approvals')}: ${t('manual.approvals.approveTab', 'Displays contracts awaiting approval.')}
  ${t('common.actions', 'Actions')}:
  ${t('send_approval_request', 'Request Approval')}: ${t('manual.approvals.actions.requestApproval', 'Editors/Admins can request approval for a contract with a custom message.')}
  ${t('approval_board_approve', 'Approve Contract')}: ${t('manual.approvals.actions.approveContract', 'Admins/Approvers can review and approve contracts.')} 
  ${t('comments', 'Comment on Contracts')}: ${t('manual.approvals.actions.comment', 'Add feedback or discussion notes to a contract.')}
### ${t('manual.statusUpdate.title', '🔄 Update Status')}

- **${t('sidebar.updateStatus', 'Update Status')}**: ${t('manual.statusUpdate.trigger', 'Runs a background job to auto-update contract statuses based on set rules (e.g., deadlines or conditions).')}
- ${t('manual.statusUpdate.accessibleVia', 'Accessible via the sidebar button "Update Status"')}

---

### ${t('manual.profile.title', '👤 Profile Menu')}

${t('sidebar.profile', 'Profile')} ${t('common.actions', 'Actions')}:

- **${t('sidebar.changePassword', 'Change Password')}**: ${t('manual.profile.changePassword', 'Initiates the password reset flow.')}
- **${t('sidebar.manual', 'Read Manual')}**: ${t('manual.profile.readManual', 'Opens this user manual.')}
- **${t('sidebar.sendFeedback', 'Send Feedback')}**: ${t('manual.profile.sendFeedback', 'Opens a form (or mailto) to share ideas or report bugs.')}

---

### ${t('manual.sidebar.title', '🔍 Sidebar Navigation')}

- **${t('manual.sidebar.collapsible', 'Collapsible Sidebar: Toggle between collapsed and expanded states.')}**
- **${t('manual.sidebar.mobile', 'Mobile Mode: On screens smaller than 1024px, the sidebar appears at the bottom in a row layout.')}**

---

### ${t('manual.roles.title', '🛠️ Roles & Permissions')}

| ${t('sidebar.role', 'Role')} | ${t('common.permissions', 'Permissions')} |
| -------- | --------------------------------------------------------------------- |
| ${t('sidebar.role_label.admin', 'Admin')} | ${t('sidebar.role_description.admin', 'Full access: create, edit, delete, approve, and comment on contracts.')} |
| ${t('sidebar.role_label.editor', 'Editor')} | ${t('sidebar.role_description.editor', 'Can create, edit, and delete contracts, but not approve them.')} |
| ${t('sidebar.role_label.approver', 'Approver')} | ${t('sidebar.role_description.approver', 'Can view and approve contracts but cannot edit.')} |
| ${t('sidebar.role_label.viewer', 'Viewer')} | ${t('sidebar.role_description.viewer', 'Read-only access to all contract data.')} |

---

### ${t('manual.comments.title', '📄 Commenting & Collaboration')}

- ${t('manual.comments.inline', 'Add inline comments on contract details.')}
- ${t('manual.comments.timestamps', 'All comments are timestamped and visible to others with access.')}

---

### ${t('manual.limitations.title', '⚠️ Known Limitations')}

- ${t('manual.limitations.approvalDisabled', 'Approval request button is disabled if the contract is already pending.')}
- ${t('manual.limitations.rls', 'Comments and approvals are restricted via Supabase Row Level Security (RLS).')}

---

### ${t('manual.tips.title', '🚀 Tips & Shortcuts')}

- ${t('manual.tips.sidebarTip', 'Use the sidebar in collapsed mode to save screen space.')}
- ${t('manual.tips.cronTip', 'Use the status cron update to avoid manual tracking.')}
- ${t('manual.tips.manualTip', 'Use the manual and feedback options to improve your experience.')}

---

${t('manual.footer.thanks', 'Happy Contracting! 📍')}

---

${t('manual.footer.contact', 'For questions or help, contact dev@icue.vn')}`;
            
            console.log('Manual markdown string:', embeddedManual);
            setContent(embeddedManual);
            setNotFound(true);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error loading manual:', err);
          setError(true);
          setContent(`# ${t('manual.error.title', 'Manual Error')}

${t('manual.error.message', 'Sorry, there was an error loading the manual. Please try again later.')}

${t('common.error', 'Error')} Details:** ${err.message}

${t('manual.error.fallback', 'You can try:')}
- ${t('manual.error.refresh', 'Refreshing the page')}
- ${t('manual.error.connection', 'Checking your internet connection')}
- ${t('manual.error.support', 'Contacting support if the problem persists')}`);
          setLoading(false);
        }
      };
      loadManual();
    }, [t, i18n.language]);
  
    return (
      <div className="manual-markdown"> 
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', maxWidth: '1600px', margin: 'auto' }}>
        <button className='btn-hover-effect'
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
  
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📘 {t('headers.userManual')}</h1>
        
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            📖 {t('manual.loading', 'Loading manual...')}
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
            border: '1px solid #f59e42'
          }}>
            ⚠️ {t('manual.missingTranslation', { defaultValue: 'No manual available in your language. Showing English or default.' })}
          </div>
        )}
        
        {error && !loading && (
          <div style={{ 
            color: '#ef4444', 
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#fef2f2',
            borderRadius: '4px',
            border: '1px solid #ef4444'
          }}>
            ❌ {t('manual.error.loading', 'Error loading manual. Please try again.')}
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
                list-style: none;
                padding-left: -2.2em; /* Reduce this value to move bullets closer to the text */
                margin-left: 0;      /* Remove extra margin if present */
              }

              .manual-markdown li {
                padding-left: -2.2em; /* Optional: fine-tune space between bullet and text */
                margin-left: 0;      /* Remove extra margin if present */
              }
              .manual-markdown li strong,
              .manual-markdown li b {
                font-weight: normal !important;
              }
            `}</style>
            <div className="manual-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      </div>
    );
  };
  
export default ManualViewer;
  
  