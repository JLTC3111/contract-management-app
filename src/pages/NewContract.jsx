import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractsApi } from '../api/contracts';
import FileUploader from '../components/FileUploader';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUser } from '../hooks/useUser';

const fieldStyle = {
  fontSize: 'clamp(0.95rem, 2vw, 1rem)',
  padding: 'clamp(0.5rem, 2vw, 0.75rem)',
  borderRadius: '8px',
  border: '1.5px solid var(--card-border)',
  background: 'var(--card-bg)',
  color: 'var(--text)',
  outline: 'none',
  flex: 1,
  minWidth: 'clamp(120px, 30vw, 200px)',
  boxSizing: 'border-box',
  minHeight: '44px',
};

const NewContract = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [version, setVersion] = useState('v1.0');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [category, setCategory] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [contract, setContract] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const headerRef = useRef(null);
  const formRef = useRef(null);
  const buttonRefs = useRef([]);

  useEffect(() => {
    import('gsap').then(({ default: gsap }) => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
        );
      }
      if (formRef.current) {
        gsap.fromTo(
          formRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.15 }
        );
      }
      if (buttonRefs.current) {
        gsap.fromTo(
          buttonRefs.current,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.08, delay: 0.3 }
        );
      }
    });
  }, []);

  if (user && (user.role === 'viewer' || user.role === 'approver')) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>{t('accessDenied', 'Access Denied')}</h2>
        <p>{t('no_permission_create_contract')}</p>
      </div>
    );
  }

  const goToContractDetail = (id) => {
    navigate(`/contracts/${id}`);
  };

  const handleCreateContract = async () => {
    if (!title) return alert(t('title_required', 'Title is required'));

    try {
      const data = await contractsApi.create({
        title: title.trim(),
        status,
        version,
        author: user?.email || user?.user_metadata?.email || 'Demo User',
        description: description.trim() || null,
        client_name: clientName.trim() || null,
        client_email: clientEmail.trim() || null,
        contract_value: contractValue === '' ? null : Number(contractValue),
        category: category.trim() || null,
        expiry_date: expiryDate || null,
      });

      setContract(data);
    } catch (error) {
      console.error('Contract creation error:', error);

      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        alert(t('duplicate_prompt', 'A contract with this title already exists'));
      } else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        alert(t('permission_denied', 'You do not have permission to create contracts. Please contact your administrator.'));
      } else {
        alert(t('duplicate_error_short', 'Error saving contract') + ': ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleUploadComplete = async (uploads) => {
    if (!uploads || uploads.length === 0 || !contract) return;
    setUploading(true);
    const uploadedFile = uploads[0];
    try {
      await contractsApi.update(contract.id, {
        file_url: uploadedFile.url,
        file_name: uploadedFile.name,
        file_type: uploadedFile.type,
      });
      goToContractDetail(contract.id);
    } catch (error) {
      alert(t('upload_file_error'));
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{width: '91%', border: '1px solid var(--card-border)', padding: 'clamp(1rem, 4vw, 1.5rem)', boxShadow: darkMode ? '0 2px 4px rgba(255, 255, 255, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.25)'}}>
      {!contract && (
        <div style={{ marginBottom: 'clamp(0.5rem, 3vw, 1rem)' }}>
          <button
            ref={el => buttonRefs.current[0] = el}
            className="btn-hover-effect"
            onClick={() => navigate(-1)}
            style={{
              padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: darkMode ? '#374151' : '#ddd',
              color: darkMode ? '#f3f4f6' : 'inherit',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 'clamp(0.95rem, 2vw, 1rem)',
            }}
          >
            <ArrowLeft style={{ color: darkMode ? '#fff' : '#000' }} size={22} /> {t('newcontract.back')}
          </button>
        </div>
      )}
      <h2 ref={headerRef} style={{fontSize: 'clamp(1.2rem, 5vw, 2rem)', marginBottom: 'clamp(1rem, 4vw, 2rem)' }}>{t('newContract')}</h2>
      {!contract ? (
        <form
          ref={formRef}
          onSubmit={e => { e.preventDefault(); handleCreateContract(); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: 'clamp(1rem, 4vw, 1.5rem)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(0.5rem, 2vw, 1rem)' }}>
            <input
              type="text"
              placeholder={t('contractTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={fieldStyle}
            />
            <input
              type="text"
              placeholder={t('version')}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              style={{ ...fieldStyle, minWidth: 'clamp(100px, 20vw, 160px)' }}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...fieldStyle, minWidth: 'clamp(100px, 20vw, 160px)' }}
            >
              <option value="draft">{t('contractTable.status.draft')}</option>
              <option value="pending">{t('contractTable.status.pending')}</option>
              <option value="in_progress">{t('contractTable.status.in_progress')}</option>
              <option value="approved">{t('contractTable.status.approved')}</option>
              <option value="rejected">{t('contractTable.status.rejected')}</option>
              <option value="expiring">{t('contractTable.status.expiring')}</option>
              <option value="expired">{t('contractTable.status.expired')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(0.5rem, 2vw, 1rem)' }}>
            <input
              type="text"
              placeholder={t('contractTable.client', 'Client')}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={fieldStyle}
            />
            <input
              type="email"
              placeholder={t('contractTable.clientEmail', 'Client Email')}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              style={fieldStyle}
            />
            <input
              type="text"
              placeholder={t('contractTable.category', 'Category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...fieldStyle, minWidth: 'clamp(100px, 20vw, 160px)' }}
            />
            <input
              type="number"
              min="0"
              placeholder={t('contractTable.contractValue', 'Contract Value')}
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              style={{ ...fieldStyle, minWidth: 'clamp(100px, 20vw, 160px)' }}
            />
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              aria-label={t('contractTable.expiry', 'Expiry Date')}
              style={{ ...fieldStyle, minWidth: 'clamp(140px, 25vw, 180px)' }}
            />
          </div>

          <textarea
            placeholder={t('contractTable.descriptionPlaceholder', 'Add a short summary of this contract…')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              ...fieldStyle,
              minHeight: '5rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              width: '100%',
            }}
          />

          <button
            ref={el => buttonRefs.current[1] = el}
            className="btn-hover-effect"
            type="submit"
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              padding: 'clamp(0.5rem, 2vw, 0.75rem)',
              borderRadius: '8px',
              border: '1.5px solid var(--card-border)',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              minWidth: 'clamp(100px, 20vw, 160px)',
              boxSizing: 'border-box',
              minHeight: '44px',
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {t('createContract')}
          </button>
        </form>
      ) : (
        <>
          <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{t('contractCreated')}</p>
          {contract?.id && (
            <FileUploader
              contract={contract}
              currentPath={`uploads/${contract.id}`}
              onUploadComplete={handleUploadComplete}
            />
          )}
          {uploading && <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{t('updatingContract')}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'clamp(0.5rem, 2vw, 1rem)', marginBottom: 'clamp(1rem, 4vw, 1.5rem)' }}>
            <button
              className="btn-hover-effect"
              onClick={() => navigate(-1)}
              style={{
                padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: darkMode ? '#374151' : '#ddd',
                color: darkMode ? '#f3f4f6' : 'inherit',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              }}
            >
              <ArrowLeft size={18} /> {t('newcontract.back')}
            </button>
            <button
              className="btn-hover-effect"
              onClick={() => goToContractDetail(contract.id)}
              style={{
                padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              }}
            >
              {t('newcontract.viewDetails', 'View Details')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NewContract;
