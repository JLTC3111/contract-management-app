import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
          // Try to fetch the manual file
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
            setContent(text);
            setLoading(false);
          } else {
            // If fetch fails, use embedded manual content as fallback
            console.log('Using embedded manual content as fallback');
            const embeddedManual = `**Contract Manager App Manual**

Welcome to the Contract Manager App for ICUE(VN)! This guide will walk you through the key features and how to use them effectively.

---

### 🏠 Home & Dashboard

* **Home**: Redirects to ICUE.VN homepage.
* **Dashboard**: The main area where you can view summary stats, recent contract updates, and quick actions.

---

### ✅ Approvals

* **Approve Tab**: Displays contracts awaiting approval.
* **Actions Available**:

  * **Request Approval**: Editors/Admins can request approval for a contract with a custom message.
  * **Approve Contract**: Admins/Approvers can review and approve contracts.
  * **Comment on Contracts**: Add feedback or discussion notes to a contract.

---

### 🔄 Update Status

* **Trigger Status Cron**: Runs a background job to auto-update contract statuses based on set rules (e.g., deadlines or conditions).
* Accessible via the sidebar button "Update Status"

---

### 👤 Profile Menu

Click the **Profile** button in the sidebar to reveal:

* **Change Password**: Initiates the password reset flow.
* **Read Manual**: Opens this user manual.
* **Send Feedback**: Opens a form (or mailto) to share ideas or report bugs.

---

### 🔍 Sidebar Navigation

* **Collapsible Sidebar**: Toggle between collapsed and expanded states.
* **Mobile Mode**: On screens smaller than 1024px, the sidebar appears at the bottom in a row layout.

---

### ✨ Roles & Permissions

| Role     | Permissions                                                           |
| -------- | --------------------------------------------------------------------- |
| Admin    | Full access: create, edit, delete, approve, and comment on contracts. |
| Editor   | Can create, edit, and delete contracts, but not approve them.         |
| Approver | Can view and approve contracts but cannot edit.                       |
| Viewer   | Read-only access to all contract data.                                |

---

### 📄 Commenting & Collaboration

* Add inline comments on contract details.
* All comments are timestamped and visible to others with access.

---

### ⚠️ Known Limitations

* Approval request button is disabled if the contract is already pending.
* Comments and approvals are restricted via Supabase Row Level Security (RLS).

---

### 🚀 Tips & Shortcuts

* Use the sidebar in collapsed mode to save screen space.
* Use the status cron update to avoid manual tracking.
* Use the manual and feedback options to improve your experience.

---

Happy Contracting! 📍

---

For questions or help, contact the PeaceCord team or open the Help section in the app.`;
            
            setContent(embeddedManual);
            setNotFound(true);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error loading manual:', err);
          setError(true);
          setContent(`# ${t('manual.error.title', 'Manual Error')}

${t('manual.error.message', 'Sorry, there was an error loading the manual. Please try again later.')}

**Error Details:** ${err.message}

${t('manual.error.fallback', 'You can try:')}
- Refreshing the page
- Checking your internet connection
- Contacting support if the problem persists`);
          setLoading(false);
        }
      };
      loadManual();
    }, [t]);
  
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
        <button
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
          <div style={{ 
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };
  
export default ManualViewer;
  
  