// src/components/dashboard/AttachmentPicker.jsx
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';
import { validateAttachment } from '../../utils/uploads';
import { FILE_CONSTRAINTS } from '../../utils/constants';

/**
 * Stages files for upload. The actual upload happens after the contract is
 * saved, since a file needs a contract id to live under.
 */
const AttachmentPicker = ({ files, onChange }) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [rejected, setRejected] = useState([]);

  const add = (e) => {
    const picked = Array.from(e.target.files || []);
    const good = [];
    const bad = [];

    picked.forEach((file) => {
      const problem = validateAttachment(file);
      if (problem === 'tooLarge') {
        bad.push(t('dashboard.fileTooLarge', '{{name}} is over {{max}}', {
          name: file.name, max: FILE_CONSTRAINTS.maxSizeLabel,
        }));
      } else if (problem) {
        bad.push(t('dashboard.fileBadType', '{{name}} is not a supported file type', { name: file.name }));
      } else {
        good.push(file);
      }
    });

    setRejected(bad);
    // Same file picked twice shouldn't queue twice.
    const seen = new Set(files.map((f) => `${f.name}:${f.size}`));
    onChange([...files, ...good.filter((f) => !seen.has(`${f.name}:${f.size}`))]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (index) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="ledger-attach">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="ledger-attach__input"
        accept={FILE_CONSTRAINTS.allowedExtensions.join(',')}
        onChange={add}
      />
      <button
        type="button"
        className="ledger-btn ledger-btn--ghost ledger-btn--block"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={14} /> {t('dashboard.attachFiles', 'Attach files')}
      </button>

      {files.length > 0 && (
        <ul className="ledger-attach__list">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="ledger-attach__item">
              <span className="ledger-attach__name">{file.name}</span>
              <span className="ledger-attach__size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="ledger-attach__remove"
                onClick={() => remove(i)}
                aria-label={t('dashboard.removeFile', 'Remove {{name}}', { name: file.name })}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejected.map((message) => (
        <p key={message} className="ledger-attach__error">{message}</p>
      ))}
    </div>
  );
};

export default AttachmentPicker;
