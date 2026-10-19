import assert from 'node:assert/strict';
import test from 'node:test';
import { harness, button, named, nodes, textOf } from './helpers/componentHarness.mjs';

const request = { id: 10, contract_id: 20, status: 'pending', contracts: { id: 20, title: 'Agreement', stage: 'in_review' } };
const approvalSeed = (row = request) => [[row], false, {}, null, '', false, null];

test('editor approval controls are disabled and their handlers reject direct invocation', async () => {
  let writes = 0;
  const app = harness({ seed: approvalSeed(), api: { approvalsApi: { decide: async () => { writes++; }, update: async () => { writes++; } } } });
  const Page = app.load('src/pages/ApprovalsBoard.jsx').default;
  const tree = app.render(Page);
  const approve = button(tree, 'approval_board_approve');
  const edit = button(tree, 'approval_board_edit');
  assert.equal(approve.props.disabled, true);
  assert.equal(edit.props.disabled, true);
  await approve.props.onClick();
  edit.props.onClick();
  assert.equal(writes, 0);
  assert.equal(app.state[3], null);
});

test('reopening a stored terminal request exposes no approval buttons', () => {
  const app = harness({ seed: approvalSeed({ ...request, status: 'approved' }), user: { id: 'approver', role: 'approver' } });
  const tree = app.render(app.load('src/pages/ApprovalsBoard.jsx').default);
  assert.equal(button(tree, 'approval_board_approve'), undefined);
  assert.equal(button(tree, 'approval_board_reject'), undefined);
});

test('a failed approval transaction leaves the request pending and retryable', async () => {
  const app = harness({ seed: approvalSeed(), user: { id: 'approver', role: 'approver' },
    api: { approvalsApi: { decide: async () => { throw new Error('Rejected transaction'); } } } });
  const Page = app.load('src/pages/ApprovalsBoard.jsx').default;
  await button(app.render(Page), 'approval_board_approve').props.onClick();
  assert.equal(app.state[2][request.id], undefined);
  assert.equal(button(app.render(Page), 'approval_board_approve').props.disabled, false);
});

test('a fast double click submits only one decision transaction', async () => {
  let calls = 0;
  let resolve;
  const app = harness({ seed: approvalSeed(), user: { id: 'approver', role: 'approver' }, api: {
    approvalsApi: { decide: () => { calls++; return new Promise((done) => { resolve = done; }); } },
    contractsApi: { getById: async () => ({ ...request.contracts, stage: 'negotiation' }) },
  } });
  const Page = app.load('src/pages/ApprovalsBoard.jsx').default;
  const approve = button(app.render(Page), 'approval_board_approve');
  const first = approve.props.onClick();
  await approve.props.onClick();
  assert.equal(calls, 1);
  resolve({ ...request, status: 'approved' });
  await first;
  assert.equal(button(app.render(Page), 'approval_board_approve'), undefined);
});

test('failed phase completion does not start the next phase or dismiss the dialog', async () => {
  const phases = [{ id: 1, phase_number: 1, status: 'active', tasks: [] }, { id: 2, phase_number: 2, status: 'pending', tasks: [] }];
  const updates = [];
  const app = harness({ seed: [phases, false, false, new Set(), {}, { type: 'complete', phaseId: 1 }], api: {
    phasesApi: { update: async (id) => { updates.push(id); throw new Error('Write failed'); } },
  } });
  const Page = app.load('src/components/PhaseManagement.jsx').default;
  await named(app.render(Page, { contractId: 10 }), 'PhaseConfirmModal').props.onConfirm();
  assert.deepEqual(updates, [1]);
  assert.equal(app.state[0][1].status, 'pending');
  assert.equal(app.state[5].phaseId, 1);
});

test('completing the last task submits one phase update and refreshes the committed state', async () => {
  const phase = { id: 1, phase_number: 1, status: 'active', tasks: [{ id: 'task', completed: false }] };
  const updates = [];
  const committed = [{ ...phase, status: 'completed' }, { id: 2, phase_number: 2, status: 'active' }];
  const app = harness({ seed: [[phase], false, false, new Set(), {}, null], api: {
    phasesApi: { update: async (id, change) => updates.push({ id, change }), getByContractId: async () => committed },
  } });
  const Page = app.load('src/components/PhaseManagement.jsx').default;
  await named(app.render(Page, { contractId: 10 }), 'PhaseCard').props.onToggleTask(1, 'task');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 1);
  assert.equal(updates[0].change.status, 'completed');
  assert.equal(app.state[0], committed);
});

test('folder navigation keeps empty folders visible and nested paths intact', async () => {
  const paths = [];
  const app = harness({ api: { storageApi: { listFiles: async (prefix) => {
    paths.push(prefix);
    return prefix.endsWith('/Legal') ? [{ name: '.keep', id: 'marker', metadata: {} }, { name: 'terms.pdf', id: 'file', metadata: {} }] :
      [{ name: 'Legal', id: null, metadata: null }];
  } } } });
  const { useStorageFolder, isStorageFolder } = app.load('src/hooks/useStorageFolder.js');
  const render = () => app.render(() => useStorageFolder('uploads/10'));
  let folder = render();
  await folder.reload();
  folder = render();
  assert.equal(isStorageFolder(folder.files[0]), true);
  folder.enter(folder.files[0].name);
  folder = render();
  await folder.reload();
  folder = render();
  assert.equal(folder.files.length, 1);
  assert.equal(folder.relativeName('terms.pdf'), 'Legal/terms.pdf');
  assert.equal(isStorageFolder(folder.files[0]), false);
  folder.goTo('');
  assert.equal(render().prefix, 'uploads/10');
  assert.deepEqual(paths, ['uploads/10', 'uploads/10/Legal']);
});

const dashboardRow = { id: 20, title: 'Agreement', status: 'rejected', stage: 'in_review', revision: 4 };
const dashboardSeed = (row = dashboardRow) => [[row], false, false, '', false, '', 'All', 'all', 'table', new Set(), row.id, row, null];

test('dashboard double submission makes one atomic request and no separate contract update', async () => {
  let calls = 0;
  let resolve;
  const app = harness({ seed: dashboardSeed({ ...dashboardRow, stage: 'draft', status: 'draft' }), api: {
    approvalsApi: { create: (payload) => {
      assert.equal(payload.expected_revision, 4);
      calls++;
      return new Promise((done) => { resolve = done; });
    } },
    contractsApi: { update: () => assert.fail('Submission must be one database transaction'), getAll: async () => [] },
  } });
  const Page = app.load('src/pages/Dashboard.jsx').default;
  const send = named(app.render(Page), 'DetailDrawer').props.onSendForApproval;
  const first = send({ ...dashboardRow, stage: 'draft', status: 'draft' });
  await send(dashboardRow);
  assert.equal(calls, 1);
  resolve({ status: 'pending' });
  await first;
  assert.equal(app.state[2], false);
  assert.equal(app.state[10], null);
});

test('failed dashboard submission remains retryable without a partial local transition', async () => {
  const row = { ...dashboardRow, stage: 'draft', status: 'draft' };
  const app = harness({ seed: dashboardSeed(row), api: {
    approvalsApi: { create: async () => { throw new Error('Transaction rolled back'); } },
    contractsApi: { update: () => assert.fail('Must not write separately') },
  } });
  const Page = app.load('src/pages/Dashboard.jsx').default;
  await named(app.render(Page), 'DetailDrawer').props.onSendForApproval(row);
  assert.equal(app.state[0][0].stage, 'draft');
  assert.equal(app.state[2], false);
  assert.equal(app.state[10], row.id);
});

test('renaming a rejected contract preserves status and sends the loaded revision', async () => {
  let saved;
  const app = harness({ seed: dashboardSeed(), api: { contractsApi: {
    update: async (...args) => { saved = args; }, getAll: async () => [],
  } } });
  const Page = app.load('src/pages/Dashboard.jsx').default;
  await named(app.render(Page), 'EditContractModal').props.onSave(dashboardRow, { title: 'Renamed', stage: 'in_review' });
  assert.equal(saved[0], 20);
  assert.equal(saved[1].title, 'Renamed');
  assert.equal('status' in saved[1], false);
  assert.equal('stage' in saved[1], false);
  assert.equal(saved[2].expectedRevision, 4);
});

test('a failed dashboard load shows an error and retry instead of zero totals', async () => {
  let attempts = 0;
  const app = harness({ api: { contractsApi: { getAll: async () => {
    if (++attempts === 1) throw new Error('Connection lost');
    return [dashboardRow];
  } } } });
  const Page = app.load('src/pages/Dashboard.jsx').default;
  app.render(Page);
  await app.runEffects();
  let tree = app.render(Page);
  assert.ok(nodes(tree).some((node) => node.props?.role === 'alert'));
  assert.equal(named(tree, 'StatStrip'), undefined);
  assert.equal(named(tree, 'ContractsTable'), undefined);
  assert.match(textOf(tree), /Could not load contracts/);
  await button(tree, 'Retry').props.onClick();
  tree = app.render(Page);
  assert.equal(nodes(tree).some((node) => node.props?.role === 'alert'), false);
  assert.equal(named(tree, 'StatStrip').props.totals.total, 1);
});

test('superseded approval details explain the required resubmission', () => {
  const app = harness({ seed: approvalSeed({ ...request, status: 'superseded' }), user: { id: 'approver', role: 'approver' } });
  const tree = app.render(app.load('src/pages/ApprovalsBoard.jsx').default);
  assert.equal(button(tree, 'approval_board_approve'), undefined);
  assert.match(textOf(tree), /contract changed.*new approval/i);
});

test('the shared request form also commits through one transaction without overwriting a later stage', async () => {
  let submitted = 0;
  const app = harness({ seed: [true, 'Review these terms', false], api: {
    approvalsApi: { create: async (payload) => { submitted++; assert.equal(payload.expected_revision, 4); return { status: 'pending' }; } },
    contractsApi: { update: () => assert.fail('No second lifecycle write is allowed') },
  } });
  const Form = app.load('src/components/ApprovalRequestForm.jsx').default;
  await button(app.render(Form, { contractId: 20, contract: dashboardRow }), 'send_request').props.onClick();
  assert.equal(submitted, 1);
  assert.equal(app.state[0], false);
});
