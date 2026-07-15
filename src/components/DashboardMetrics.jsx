import { useTranslation } from 'react-i18next';
import { METRIC_CSS_CLASSES, getMetricLabel } from '../utils/contractMetrics';
import { AnimatedGroup } from '../../components/motion-primitives/animated-group';
import { AnimatedNumber } from '../../components/motion-primitives/animated-number';
import { cn } from '../../lib/utils';

const DashboardMetrics = ({ data, onMetricClick, activeFilter }) => {
  const { t } = useTranslation();
  const hasFilter = Boolean(activeFilter);

  if (!data || data.length === 0) return <p>{t('metrics.noMetricsAvailable')}</p>;

  return (
    <AnimatedGroup
      className={cn(
        'dashboard-metrics',
        hasFilter && 'dashboard-metrics--filter-active',
      )}
      preset="blur-slide"
    >
      {data.map(({ key, count }) => {
        const isSelected = activeFilter === key;
        const cssClass = METRIC_CSS_CLASSES[key] || '';

        return (
          <div
            key={key}
            className={cn(
              'metric-card',
              'btn-hover-preview',
              cssClass,
              isSelected && 'metric-card--selected',
              hasFilter && !isSelected && 'metric-card--dimmed',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMetricClick?.(key);
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onMetricClick?.(key);
              }
            }}
          >
            <h4 className="metric-card__label">{getMetricLabel(t, key)}</h4>
            <p className="metric-card__count">
              <AnimatedNumber
                value={Number(count) || 0}
                springOptions={{ bounce: 0, duration: 1200 }}
              />
            </p>
          </div>
        );
      })}
    </AnimatedGroup>
  );
};

export default DashboardMetrics;
