/**
 * Contract stage model.
 *
 * `contracts.stage` holds one of the 7 values below. The legacy `contracts.status`
 * column is left untouched and kept in sync on every write, so ContractTable,
 * ContractAnalytics, the approvals flow and the status cron all keep working.
 *
 * Expiry is owned by the status cron, not by people: once it marks a contract
 * expiring/expired that wins over whatever stage the row carries.
 */

export const STAGES = [
  { value: 'draft', label: 'Draft', labelKey: 'stages.draft', color: '#6b7280', status: 'draft' },
  { value: 'in_review', label: 'In Review', labelKey: 'stages.in_review', color: '#f59e0b', status: 'pending' },
  { value: 'negotiation', label: 'Negotiation', labelKey: 'stages.negotiation', color: '#3b82f6', status: 'in_progress' },
  { value: 'awaiting_signature', label: 'Awaiting Signature', labelKey: 'stages.awaiting_signature', color: '#8b5cf6', status: 'approved' },
  { value: 'executed', label: 'Executed', labelKey: 'stages.executed', color: '#10b981', status: 'completed' },
  { value: 'expiring_soon', label: 'Expiring Soon', labelKey: 'stages.expiring_soon', color: '#f97316', status: 'expiring' },
  { value: 'expired', label: 'Expired', labelKey: 'stages.expired', color: '#dc2626', status: 'expired' },
];

export const STAGE_VALUES = STAGES.map((s) => s.value);

/** Stages a contract can be moved through by hand. The last two are time-driven. */
export const ADVANCEABLE_STAGES = ['draft', 'in_review', 'negotiation', 'awaiting_signature', 'executed'];

/** What the "Approval requests" toggle narrows the list down to. */
export const APPROVAL_STAGES = ['in_review', 'negotiation', 'awaiting_signature'];

/**
 * Stages an approval request can still be filed from. Everything up to (but not
 * including) Executed: a contract can need sign-off at any point on the way, and
 * gating on Draft alone left every contract past its first move unsendable.
 */
export const APPROVAL_REQUESTABLE_STAGES = ['draft', 'in_review', 'negotiation', 'awaiting_signature'];

const STAGE_BY_VALUE = Object.fromEntries(STAGES.map((s) => [s.value, s]));

/**
 * Legacy status -> stage. `rejected` has no stage of its own; those contracts sit
 * in In Review (their status column still says rejected, nothing is lost).
 */
const STATUS_TO_STAGE = {
  draft: 'draft',
  pending: 'in_review',
  rejected: 'in_review',
  in_progress: 'negotiation',
  approved: 'awaiting_signature',
  completed: 'executed',
  expiring: 'expiring_soon',
  expired: 'expired',
};

export const getStage = (value) => STAGE_BY_VALUE[value] || null;

/** Translated stage label, falling back to the English one. */
export const getStageLabel = (t, value) => {
  const stage = STAGE_BY_VALUE[value];
  if (!stage) return '—';
  return t ? t(stage.labelKey, stage.label) : stage.label;
};

export const getStageColor = (value) => STAGE_BY_VALUE[value]?.color ?? '#6b7280';

/**
 * Which tag treatment a stage gets. All red, no stage-specific colour: the ones
 * still in flight are outlined, the two settled ones sit on a light fill, and the
 * two that need attention sit on a darker one.
 */
const STAGE_TAG_CLASS = {
  expiring_soon: 'tag-wash-strong',
  expired: 'tag-wash-strong',
  awaiting_signature: 'tag-wash',
  executed: 'tag-wash',
};

export const stageTagClass = (stage) => STAGE_TAG_CLASS[stage] || 'tag-outline';

export const statusToStage = (status) => STATUS_TO_STAGE[status] || 'draft';

export const stageToStatus = (stage) => STAGE_BY_VALUE[stage]?.status ?? 'draft';

/**
 * The stage to display for a contract. Works before the migration has been run
 * (falls back to the status mapping) and after (uses the column).
 */
export function getContractStage(contract) {
  if (!contract) return 'draft';
  // Cron-owned terminal states outrank a stale stage column.
  if (contract.status === 'expired') return 'expired';
  if (contract.status === 'expiring') return 'expiring_soon';
  if (contract.stage && STAGE_BY_VALUE[contract.stage]) return contract.stage;
  return statusToStage(contract.status);
}

/** The next stage a contract can be advanced to, or null at the end of the line. */
export function getNextStage(stage) {
  const i = ADVANCEABLE_STAGES.indexOf(stage);
  if (i === -1 || i === ADVANCEABLE_STAGES.length - 1) return null;
  return ADVANCEABLE_STAGES[i + 1];
}

/** The update payload for moving a contract to a stage, keeping status in sync. */
export function stageUpdatePayload(stage) {
  return { stage, status: stageToStatus(stage) };
}
