import assert from 'node:assert/strict';
import test from 'node:test';
import { harness, button, named } from './helpers/componentHarness.mjs';

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
