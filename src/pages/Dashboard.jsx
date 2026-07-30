// src/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { approvalsApi, contractsApi } from '../api/contracts';
import { useUser } from '../hooks/useUser';
import { normalizeContractStatus } from '../utils/formatters';
import { partialSearchMatch } from '../utils/searchUtils';
import { isContractExpiringSoon } from '../utils/contractMetrics';
import { deleteAttachments, uploadAttachments } from '../utils/uploads';
import {
  APPROVAL_STAGES,
  getContractStage,
  getNextStage,
  stageUpdatePayload,
} from '../utils/stages';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StatStrip from '../components/dashboard/StatStrip';
import FilterRow from '../components/dashboard/FilterRow';
import BulkBar from '../components/dashboard/BulkBar';
import ContractsTable from '../components/dashboard/ContractsTable';
import KanbanBoard from '../components/dashboard/KanbanBoard';
import DetailDrawer from '../components/dashboard/DetailDrawer';
import EditContractModal from '../components/dashboard/EditContractModal';
import '../components/dashboard/dashboard.css';

/** Filters survive reloads and navigation, not just tab switches. */
const FILTERS_KEY = 'ledger.filters';

const loadFilters = () => {
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY)) || {};
  } catch {
    return {};
  }
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useUser() ?? {};
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const saved = useMemo(loadFilters, []);

  // Header
  const [query, setQuery] = useState(saved.query ?? '');
  const [bellOpen, setBellOpen] = useState(false);

  // Filter row
  const [fileQuery, setFileQuery] = useState(saved.fileQuery ?? '');
  const [category, setCategory] = useState(saved.category ?? 'All');
  const [stageFilter, setStageFilter] = useState(saved.stageFilter ?? 'all');
  const [view, setView] = useState(saved.view ?? 'table');

  // Selection / overlays
  const [selected, setSelected] = useState(() => new Set());
  const [drawerId, setDrawerId] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({
      query, fileQuery, category, stageFilter, view,
    }));
  }, [query, fileQuery, category, stageFilter, view]);

  const load = useCallback(async () => {
    try {
      const data = await contractsApi.getAll({ orderBy: 'updated_at', ascending: false });
      if (!Array.isArray(data)) return;
      setContracts(data.map((c) => ({
        ...c,
        status: normalizeContractStatus(c.status) || c.status || 'draft',
      })));
    } catch (err) {
      console.error('Error fetching contracts:', err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const expiring = useMemo(() => contracts.filter(isContractExpiringSoon), [contracts]);

  const pendingApproval = useMemo(
    () => contracts.filter((c) => APPROVAL_STAGES.includes(getContractStage(c))),
    [contracts]
  );

  const totals = useMemo(() => ({
    total: contracts.length,
    activeValue: contracts
      .filter((c) => !['expired', 'completed'].includes(c.status))
      .reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0),
    expiring: expiring.length,
    pending: pendingApproval.length,
  }), [contracts, expiring, pendingApproval]);

  const visible = useMemo(() => contracts.filter((c) => {
    if (query && !partialSearchMatch(c.title, query) && !partialSearchMatch(c.client_name, query)) {
      return false;
    }
    // The filter-row search matches on name only, per spec.
    if (fileQuery && !partialSearchMatch(c.title, fileQuery)) return false;
    if (category !== 'All' && c.category !== category) return false;
    if (stageFilter !== 'all' && getContractStage(c) !== stageFilter) return false;
    return true;
  }), [contracts, query, fileQuery, category, stageFilter]);

  const drawerContract = useMemo(
    () => contracts.find((c) => c.id === drawerId) || null,
    [contracts, drawerId]
  );

  const toggleRow = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected((prev) => (
    visible.every((c) => prev.has(c.id)) ? new Set() : new Set(visible.map((c) => c.id))
  ));

  /** Moves each contract one stage along, writing stage + status together. */
  const advance = async (targets) => {
    const movable = targets
      .map((c) => ({ contract: c, next: getNextStage(getContractStage(c)) }))
      .filter((x) => x.next);
    if (movable.length === 0) return;

    setBusy(true);
    try {
      await Promise.all(
        movable.map(({ contract, next }) =>
          contractsApi.update(contract.id, stageUpdatePayload(next))
        )
      );
      await load();
    } catch (err) {
      console.error('Advance stage failed:', err);
      window.alert(t('dashboard.advanceFailed', 'Could not advance stage: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };


  const handleSave = async (target, updates, attachments = [], removedFiles = []) => {
    setBusy(true);
    try {
      const { stage, ...rest } = updates;
      await contractsApi.update(target.id, { ...rest, ...stageUpdatePayload(stage) });
      if (removedFiles.length) {
        const { failed } = await deleteAttachments(target.id, removedFiles);
        if (failed.length) {
          window.alert(t('dashboard.deleteFileFailed', 'Some files could not be deleted: {{names}}', {
            names: failed.map((f) => f.name).join(', '),
          }));
        }
      }
      if (attachments.length) {
        const { failed } = await uploadAttachments(target.id, attachments);
        if (failed.length) {
          window.alert(t('dashboard.uploadFailed', 'Some files did not upload: {{names}}', {
            names: failed.map((f) => f.name).join(', '),
          }));
        }
      }
      setEditing(null);
      await load();
    } catch (err) {
      console.error('Save failed:', err);
      window.alert(t('dashboard.saveFailed', 'Could not save changes: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (target) => {
    const confirmed = window.confirm(
      t('dashboard.confirmDelete', 'Delete "{{name}}"? This cannot be undone.', { name: target.title })
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await contractsApi.delete(target.id);
      setDrawerId(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      await load();
    } catch (err) {
      console.error('Delete failed:', err);
      window.alert(t('dashboard.deleteFailed', 'Could not delete contract: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Files an approval request. A Draft also moves to In Review; a contract that
   * is already further along keeps its stage, since asking for sign-off should
   * never walk a contract backwards.
   *
   * Filing is the end of the interaction whatever stage the contract was in, so a
   * successful send closes the overlays - the edit panel first, then the drawer -
   * rather than only doing so for the Draft -> In Review case.
   */
  const handleSendForApproval = async (target) => {
    try {
      // The board would otherwise show one card per click.
      const pending = await approvalsApi.getPending().catch(() => []);
      if (pending.some((r) => String(r.contract_id) === String(target.id))) {
        window.alert(t(
          'dashboard.approvalAlreadyPending',
          'This contract already has an approval request awaiting review.'
        ));
        return;
      }

      await approvalsApi.create({
        contract_id: target.id,
        requester_id: user?.id,
        requester_email: user?.email,
        message: t('dashboard.approvalRequestMessage', 'Approval requested for "{{name}}".', {
          name: target.title || '',
        }),
        status: 'pending',
      });
      if (getContractStage(target) === 'draft') {
        await contractsApi.update(target.id, stageUpdatePayload('in_review'));
      }
      setEditing(null);
      setDrawerId(null);
      await load();
    } catch (err) {
      console.error('Send for approval failed:', err);
      window.alert(t('dashboard.approvalFailed', 'Could not send for approval: {{msg}}', { msg: err.message }));
    }
  };

  const handleNotification = (event) => {
    setBellOpen(false);
    if (event.type === 'approvals') {
      navigate('/approvals');
      return;
    }
    setDrawerId(event.contract.id);
  };

  return (
    <div className="ledger">
      <DashboardHeader
        query={query}
        onQueryChange={setQuery}
        expiring={expiring}
        pendingCount={pendingApproval.length}
        bellOpen={bellOpen}
        onBellToggle={setBellOpen}
        onNotificationClick={handleNotification}
        approvalsCount={pendingApproval.length}
        onApprovals={() => navigate('/approvals')}
        onNew={() => navigate('/new')}
      />

      {loading ? (
        <p className="ledger-empty">{t('dashboard.loading', 'Loading...')}</p>
      ) : (
        <>
          <StatStrip totals={totals} />

          <FilterRow
            fileQuery={fileQuery}
            onFileQueryChange={setFileQuery}
            category={category}
            onCategoryChange={setCategory}
            stage={stageFilter}
            onStageChange={setStageFilter}
            view={view}
            onViewChange={setView}
          />

          <AnimatePresence>
            {selected.size > 0 && (
              <BulkBar
                count={selected.size}
                onClear={() => setSelected(new Set())}
              />
            )}
          </AnimatePresence>

          {view === 'table' ? (
            <ContractsTable
              contracts={visible}
              selected={selected}
              onToggle={toggleRow}
              onToggleAll={toggleAll}
              onOpen={(c) => setDrawerId(c.id)}
            />
          ) : (
            <KanbanBoard contracts={visible} onOpen={(c) => setDrawerId(c.id)} />
          )}
        </>
      )}

      <AnimatePresence>
        {drawerContract && (
          <DetailDrawer
            key="drawer"
            contract={drawerContract}
            busy={busy}
            onClose={() => setDrawerId(null)}
            onAdvance={(c) => advance([c])}
            onEdit={(c) => setEditing(c)}
            onDelete={handleDelete}
            onSendForApproval={handleSendForApproval}
            suppressDismiss={Boolean(editing)}
          />
        )}
        {editing && (
          <EditContractModal
            key="edit"
            contract={editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
