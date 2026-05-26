import { EXPIRY_THRESHOLDS } from './constants';
import { getDaysUntilExpiry, humanizeContractStatus, normalizeContractStatus } from './formatters';

export const DASHBOARD_METRIC_KEYS = [
  'approved',
  'pending',
  'in_progress',
  'expiring',
  'draft',
  'rejected',
  'expired',
  'completed',
];

export const METRIC_CSS_CLASSES = {
  approved: 'metric-approved',
  pending: 'metric-pending',
  in_progress: 'metric-in-progress',
  expiring: 'metric-expiring',
  draft: 'metric-draft',
  rejected: 'metric-rejected',
  expired: 'metric-expired',
  completed: 'metric-completed',
};

export const METRIC_LABEL_KEYS = {
  approved: 'metrics.approved',
  pending: 'metrics.pending',
  in_progress: 'metrics.in_progress',
  expiring: 'metrics.expiring',
  draft: 'metrics.drafts',
  rejected: 'metrics.rejected',
  expired: 'metrics.expired',
  completed: 'metrics.completed',
};

export function getContractStatus(contract) {
  return normalizeContractStatus(contract?.status) || 'draft';
}

export function isContractExpiringSoon(contract) {
  const status = getContractStatus(contract);
  if (status === 'expiring') return true;
  if (status === 'expired' || status === 'completed') return false;

  const days = getDaysUntilExpiry(contract?.expiry_date);
  if (days === null || days <= 0) return false;

  const threshold = EXPIRY_THRESHOLDS[status] ?? EXPIRY_THRESHOLDS.default;
  return days <= threshold;
}

export function filterContractsByMetric(contracts, metricKey) {
  if (!Array.isArray(contracts) || !metricKey) return contracts ?? [];

  if (metricKey === 'expiring') {
    return contracts.filter(isContractExpiringSoon);
  }

  return contracts.filter((contract) => getContractStatus(contract) === metricKey);
}

export function countContractsByMetric(contracts, metricKey) {
  return filterContractsByMetric(contracts, metricKey).length;
}

export function buildDashboardMetrics(contracts) {
  return DASHBOARD_METRIC_KEYS.map((key) => ({
    key,
    count: countContractsByMetric(contracts, key),
  }));
}

export function getMetricLabel(t, metricKey) {
  const labelKey = METRIC_LABEL_KEYS[metricKey] || `metrics.${metricKey}`;
  const translated = t(labelKey);
  if (translated && translated !== labelKey) {
    return translated;
  }
  return humanizeContractStatus(metricKey);
}
