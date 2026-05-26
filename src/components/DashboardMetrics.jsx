import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { METRIC_CSS_CLASSES, getMetricLabel } from '../utils/contractMetrics';

const DashboardMetrics = ({ data, onMetricClick, activeFilter }) => {
  const { t } = useTranslation();
  const cardRefs = useRef([]);
  const hasFilter = Boolean(activeFilter);

  cardRefs.current = [];

  const setCardRef = (el, idx) => {
    if (el) cardRefs.current[idx] = el;
  };

  useEffect(() => {
    if (cardRefs.current.length) {
      import('gsap').then(({ default: gsap }) => {
        cardRefs.current.forEach((card, index) => {
          gsap.fromTo(
            card,
            {
              rotateY: 90,
              opacity: 0,
              transformOrigin: 'center',
              scale: 0.9,
            },
            {
              rotateY: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'back.out(1.7)',
              delay: index * 0.15,
              onComplete: () => {
                gsap.set(card, { clearProps: 'transform,opacity' });
              },
            }
          );
        });
      });
    }
  }, [data?.length]);

  if (!data || data.length === 0) return <p>{t('metrics.noMetricsAvailable')}</p>;

  return (
    <div className={`dashboard-metrics${hasFilter ? ' dashboard-metrics--filter-active' : ''}`}>
      {data.map(({ key, count }, idx) => {
        const isSelected = activeFilter === key;
        const cssClass = METRIC_CSS_CLASSES[key] || '';

        return (
          <div
            key={key}
            ref={(el) => setCardRef(el, idx)}
            className={[
              'metric-card',
              'btn-hover-preview',
              cssClass,
              isSelected ? 'metric-card--selected' : '',
              hasFilter && !isSelected ? 'metric-card--dimmed' : '',
            ].filter(Boolean).join(' ')}
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
            <p className="metric-card__count">{count}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;
