// src/components/dashboard/BulkBar.jsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronsRight, X } from 'lucide-react';

/**
 * Only rendered while rows are checkbox-selected.
 */
const BulkBar = ({ count, onAdvance, onClear, busy }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      className="ledger-bulkbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      <span className="ledger-bulkbar__count">
        {t('dashboard.selected', '{{count}} selected', { count })}
      </span>
      <button type="button" className="ledger-btn ledger-btn--ghost" onClick={onAdvance} disabled={busy}>
        <ChevronsRight size={14} /> {t('dashboard.advanceStage', 'Advance stage')}
      </button>
      <button type="button" className="ledger-btn ledger-btn--ghost" onClick={onClear}>
        <X size={14} /> {t('dashboard.clearSelection', 'Clear selection')}
      </button>
    </motion.div>
  );
};

export default BulkBar;
