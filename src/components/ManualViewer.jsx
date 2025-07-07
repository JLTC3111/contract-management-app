import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ManualViewer = () => {
    const [content, setContent] = useState('');
    const [notFound, setNotFound] = useState(false);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
  
    useEffect(() => {
      const lang = i18n.language;
      const tryLang = async () => {
        setNotFound(false);
        // Try to fetch the language-specific manual
        let res = await fetch(`/docs/manual.${lang}.md`);
        if (res.ok) {
          setContent(await res.text());
          return;
        }
        // Fallback to English or default
        res = await fetch('/docs/manual.md');
        if (res.ok) {
          setContent(await res.text());
          setNotFound(true);
        } else {
          setContent('Manual not found.');
        }
      };
      tryLang();
    }, [i18n.language]);
  
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
        {notFound && (
          <div style={{ color: '#f59e42', marginBottom: '1rem', fontStyle: 'italic' }}>
            {t('manual.missingTranslation', { defaultValue: 'No manual available in your language. Showing English or default.' })}
          </div>
        )}
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };
  
export default ManualViewer;
  
  