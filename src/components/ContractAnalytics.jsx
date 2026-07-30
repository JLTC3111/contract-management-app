// src/components/ContractAnalytics.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getI18nOrFallback } from '../utils/formatters';
import { STAGES, getContractStage, getStageLabel } from '../utils/stages';
import { getCategoryShortLabel } from '../utils/constants';
import { StageTag } from './dashboard/StageTag';
import './dashboard/dashboard.css';

const PERIOD_DAYS = {
  '1month': 30,
  '3months': 90,
  '6months': 180,
  '1year': 365,
  all: Infinity,
};

const PAGE_SIZE = 10;

/**
 * The pie's shades, in order: one step per stage, walked from the accent into the
 * neutrals and back to the palest accent.
 */
const PIE_RAMP = [
  'var(--color-accent-700)',
  'var(--color-accent-500)',
  'var(--color-accent-300)',
  'var(--color-neutral-700)',
  'var(--color-neutral-500)',
  'var(--color-neutral-300)',
  'var(--color-accent-100)',
];

const shortDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

/**
 * Analytics & history. Everything here is derived from the stage model, and the
 * one chart is drawn in CSS - see .ledger-analytics__pie.
 */
const ContractAnalytics = ({ contracts = [], loading = false, onRefresh }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('6months');
  const [stageFilter, setStageFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!Array.isArray(contracts)) return [];
    const days = PERIOD_DAYS[period];
    const cutoff = days === Infinity
      ? null
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return contracts.filter((c) => {
      if (!c) return false;
      if (cutoff && (!c.updated_at || new Date(c.updated_at) < cutoff)) return false;
      if (stageFilter !== 'all' && getContractStage(c) !== stageFilter) return false;
      return true;
    });
  }, [contracts, period, stageFilter]);

  const stats = useMemo(() => {
    const byStage = (stage) => filtered.filter((c) => getContractStage(c) === stage).length;
    return {
      total: filtered.length,
      inReview: byStage('in_review'),
      executed: byStage('executed'),
      expiring: byStage('expiring_soon'),
    };
  }, [filtered]);

  /** One slice per stage that actually has contracts, in lifecycle order. */
  const distribution = useMemo(() => {
    if (filtered.length === 0) return [];
    return STAGES
      .map((stage, i) => ({
        value: stage.value,
        label: getStageLabel(t, stage.value),
        color: PIE_RAMP[i % PIE_RAMP.length],
        count: filtered.filter((c) => getContractStage(c) === stage.value).length,
      }))
      .filter((slice) => slice.count > 0)
      .map((slice) => ({ ...slice, share: (slice.count / filtered.length) * 100 }));
  }, [filtered, t]);

  /** `a 0deg 40deg, b 40deg 130deg, ...` - the arcs, in one custom property. */
  const pieStops = useMemo(() => {
    let at = 0;
    return distribution
      .map((slice, i) => {
        const from = at;
        // The last slice closes on 360deg exactly, whatever the rounding did.
        at = i === distribution.length - 1 ? 360 : from + (slice.share / 100) * 360;
        return `${slice.color} ${from}deg ${at}deg`;
      })
      .join(', ');
  }, [distribution]);

  const rows = useMemo(
    () => [...filtered].sort((a, b) => {
      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bt - at;
    }),
    [filtered]
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const onFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const exportCsv = () => {
    const headers = [
      t('analytics.contract', 'Contract'),
      t('dashboard.col.category', 'Category'),
      t('dashboard.col.stage', 'Stage'),
      t('dashboard.col.owner', 'Owner'),
      t('analytics.updated', 'Updated'),
      t('analytics.expiry', 'Expiry'),
    ];
    const body = rows.map((c) => [
      c.title || '',
      c.category || '',
      getStageLabel(t, getContractStage(c)),
      c.author || '',
      shortDate(c.updated_at),
      shortDate(c.expiry_date),
    ]);
    const csv = [headers, ...body]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="ledger-analytics__empty">{t('common.loading', 'Loading...')}</p>;
  }

  const cells = [
    { key: 'total', label: t('analytics.totalContracts', 'Total contracts'), value: stats.total },
    { key: 'in_review', label: getStageLabel(t, 'in_review'), value: stats.inReview },
    { key: 'executed', label: getStageLabel(t, 'executed'), value: stats.executed },
    {
      key: 'expiring',
      label: t('analytics.expiringSoon', 'Expiring soon'),
      value: stats.expiring,
      accent: true,
    },
  ];

  return (
    <>
      <div className="ledger-analytics__toolbar">
        <select
          className="input"
          value={period}
          onChange={onFilterChange(setPeriod)}
          aria-label={t('analytics.period', 'Period')}
        >
          <option value="1month">{t('analytics.lastMonth', 'Last Month')}</option>
          <option value="3months">{t('analytics.last3Months', 'Last 3 Months')}</option>
          <option value="6months">{t('analytics.last6Months', 'Last 6 Months')}</option>
          <option value="1year">{t('analytics.lastYear', 'Last Year')}</option>
          <option value="all">{t('analytics.allTime', 'All Time')}</option>
        </select>

        <select
          className="input"
          value={stageFilter}
          onChange={onFilterChange(setStageFilter)}
          aria-label={t('dashboard.stage', 'Stage')}
        >
          <option value="all">{t('dashboard.allStages', 'All stages')}</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{getStageLabel(t, s.value)}</option>
          ))}
        </select>

        <div className="ledger-analytics__toolbar-end">
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            <Download size={15} aria-hidden="true" />
            {t('analytics.exportCSV', 'Export to CSV')}
          </button>
          {onRefresh && (
            <button
              type="button"
              className="btn-icon"
              onClick={onRefresh}
              aria-label={t('buttons.refresh', 'Refresh')}
              title={t('buttons.refresh', 'Refresh')}
            >
              <RefreshCw size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="ledger-analytics__stats">
        {cells.map((cell) => (
          <div key={cell.key} className="ledger-analytics__stat">
            <span className="ledger-analytics__stat-label">{cell.label}</span>
            <span
              className={`ledger-analytics__stat-value${
                cell.accent ? ' ledger-analytics__stat-value--accent' : ''
              }`}
            >
              {cell.value}
            </span>
          </div>
        ))}
      </div>

      <section className="ledger-analytics__panel">
        <div className="ledger-analytics__panel-head">
          <h2 className="ledger-analytics__panel-title">
            {t('analytics.stageDistribution', 'Stage distribution')}
          </h2>
        </div>

        {distribution.length === 0 ? (
          <p className="ledger-analytics__empty">{t('analytics.noData', 'No data available')}</p>
        ) : (
          <div className="ledger-analytics__dist">
            <div
              className="ledger-analytics__pie"
              style={{ '--pie-stops': pieStops }}
              role="img"
              aria-label={distribution
                .map((s) => `${s.label}: ${s.share.toFixed(1)}%`)
                .join(', ')}
            />
            <ul className="ledger-analytics__legend">
              {distribution.map((slice) => (
                <li key={slice.value} className="ledger-analytics__legend-item">
                  <span
                    className="ledger-analytics__swatch"
                    style={{ '--swatch': slice.color }}
                    aria-hidden="true"
                  />
                  <span className="ledger-analytics__legend-name">{slice.label}</span>
                  <span className="ledger-analytics__legend-pct">{slice.share.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="ledger-analytics__panel">
        <div className="ledger-analytics__panel-head">
          <h2 className="ledger-analytics__panel-title">
            {t('analytics.recentHistory', 'Recent history')}
          </h2>
          <span className="ledger-analytics__count">
            {t('analytics.showing', 'Showing')} {paged.length} {t('analytics.of', 'of')} {rows.length}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="ledger-analytics__empty">{t('analytics.noData', 'No data available')}</p>
        ) : (
          <>
            <div className="ledger-analytics__table-wrap">
              <table className="table ledger-analytics__table">
                <thead>
                  <tr>
                    <th>{t('analytics.contract', 'Contract')}</th>
                    <th className="col-category">{t('dashboard.col.category', 'Category')}</th>
                    <th>{t('analytics.status', 'Status')}</th>
                    <th className="col-updated">{t('analytics.updated', 'Updated')}</th>
                    <th className="col-expiry">{t('analytics.expiry', 'Expiry')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/contracts/${c.id}`)}
                      title={t('analytics.clickToViewDetails', 'Click to view contract details')}
                    >
                      <td>
                        <span className="ledger-analytics__name">
                          {getI18nOrFallback(t, c, 'title_i18n', 'title') || '—'}
                        </span>
                        {/* Each chip shows only at the width where its column drops
                            out, so nothing is ever duplicated or lost. */}
                        <span className="ledger-table__meta">
                          <span className="meta-category">
                            {c.category
                              ? <span className="tag tag-outline">{getCategoryShortLabel(t, c.category)}</span>
                              : '—'}
                          </span>
                          {/* Two dates in one line, so each keeps its label. */}
                          <span className="meta-updated">
                            {t('analytics.updated', 'Updated')}: {shortDate(c.updated_at)}
                          </span>
                          <span className="meta-expiry">
                            {t('analytics.expiry', 'Expiry')}: {shortDate(c.expiry_date)}
                          </span>
                        </span>
                      </td>
                      <td className="col-category">
                        {c.category
                          ? <span className="tag tag-outline">{getCategoryShortLabel(t, c.category)}</span>
                          : '—'}
                      </td>
                      <td><StageTag stage={getContractStage(c)} /></td>
                      <td className="col-updated ledger-analytics__date">{shortDate(c.updated_at)}</td>
                      <td className="col-expiry ledger-analytics__date">{shortDate(c.expiry_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="ledger-analytics__pager">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  {t('buttons.previous', 'Previous')}
                </button>
                <span className="ledger-analytics__pager-count">
                  {currentPage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= pageCount - 1}
                >
                  {t('buttons.next', 'Next')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default ContractAnalytics;
