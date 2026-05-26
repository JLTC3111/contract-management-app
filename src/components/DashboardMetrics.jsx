import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { METRIC_CSS_CLASSES, getMetricLabel } from '../utils/contractMetrics';

const DashboardMetrics = ({ data, onMetricClick, activeFilter }) => {
  const { t } = useTranslation();
  const cardRefs = useRef([]);

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
            }
          );
        });
      });
    }
  }, [data?.length]);

  if (!data || data.length === 0) return <p>{t('metrics.noMetricsAvailable')}</p>;

  return (
    <div className="dashboard-metrics">
      {data.map(({ key, count }, idx) => {
        const isActive = activeFilter === key;
        const cssClass = METRIC_CSS_CLASSES[key] || '';

        return (
          <div
            key={key}
            ref={(el) => setCardRef(el, idx)}
            className={`metric-card btn-hover-preview ${cssClass} ${isActive ? 'metric-active' : ''}`.trim()}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onMetricClick?.(key);
            }}
          >
            <h4 style={{ color: 'var(--text)', fontSize: 'clamp(0.5rem, 2.5vw, 1rem)' }}>
              {getMetricLabel(t, key)}
            </h4>
            <p style={{ color: 'var(--text)', fontSize: 'clamp(0.5rem, 2.5vw, 1rem)' }}>{count}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;
