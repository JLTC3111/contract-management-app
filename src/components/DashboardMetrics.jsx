import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';

const metricClassMap = {
  'Active': 'metric-approved',
  'Pending': 'metric-pending',
  'Expiring': 'metric-expiring',
  'Drafts': 'metric-draft',
  'Rejected': 'metric-rejected',
  'Expired': 'metric-expired',
};

const DashboardMetrics = ({ data, onMetricClick, activeFilter }) => {
  const { t } = useTranslation();
  const cardRefs = useRef([]);
  // Reset refs before rendering
  cardRefs.current = [];
  // Stable ref assignment
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
  }, [data && data.length]);

  if (!data || data.length === 0) return <p>{t('no_metrics_available')}</p>;

  const handleMetricClick = (label) => {
    if (onMetricClick) {
      onMetricClick(label);
    }
  };
  console.log('Metrics data:', data);
  return (
    <div className="dashboard-metrics">
      {data.map(({ label, count }, idx) => {
        const isActive = activeFilter === label;
        return (
          <div
            key={label}
            ref={el => setCardRef(el, idx)}
            className={`metric-card ${metricClassMap[label] || ''}`.trim()}
            style={{
              cursor: 'pointer',
            }}
            onClick={() => handleMetricClick(label)}
          >
            <h4 style={{ color: 'var(--text)', fontSize: 'clamp(0.5rem, 2.5vw, 1rem)' }}>{t(`metrics.${label.toLowerCase()}`)}</h4>
            <p style={{ color: 'var(--text)', fontSize: 'clamp(0.5rem, 2.5vw, 1rem)' }}>{count}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;