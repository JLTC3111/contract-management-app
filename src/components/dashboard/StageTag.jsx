// src/components/dashboard/StageTag.jsx
import { useTranslation } from 'react-i18next';
import { getStageLabel, stageTagClass } from '../../utils/stages';
import { getCategoryLabel, getCategoryShortLabel } from '../../utils/constants';

/** Status indicator, not a control: three treatments, no hover or active state. */
export const StageTag = ({ stage }) => {
  const { t } = useTranslation();
  return (
    <span className={`tag ${stageTagClass(stage)}`}>
      {getStageLabel(t, stage)}
    </span>
  );
};

/**
 * Contract type. Every category renders identically - NDA, MSA and Vendor are
 * told apart by their label, never by colour - so this is always an outline tag.
 */
export const CategoryTag = ({ category }) => {
  const { t } = useTranslation();
  return (
    <span className="tag tag-outline" title={getCategoryLabel(t, category)}>
      {getCategoryShortLabel(t, category)}
    </span>
  );
};

export default StageTag;
