// src/components/dashboard/StageTag.jsx
import { useTranslation } from 'react-i18next';
import { getStageColor, getStageLabel } from '../../utils/stages';
import { getCategoryLabel, getCategoryShortLabel } from '../../utils/constants';

export const StageTag = ({ stage }) => {
  const { t } = useTranslation();
  return (
    <span
      className="ledger-tag ledger-tag--stage"
      style={{ '--tag-color': getStageColor(stage) }}
    >
      {getStageLabel(t, stage)}
    </span>
  );
};

export const CategoryTag = ({ category }) => {
  const { t } = useTranslation();
  return (
    <span className="ledger-tag ledger-tag--category" title={getCategoryLabel(t, category)}>
      {getCategoryShortLabel(t, category)}
    </span>
  );
};

export default StageTag;
