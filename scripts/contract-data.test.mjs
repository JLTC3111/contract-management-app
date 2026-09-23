import assert from 'node:assert/strict';
import test from 'node:test';
import { createSchemaAdapter } from '../src/api/schemaAdapter.js';
import { fetchAllRows } from '../src/api/pagination.js';
import { CONTRACT_CURRENCY, formatCurrency, formatCompactCurrency } from '../src/utils/formatters.js';
import { canEditContracts, canDecideApproval } from '../src/utils/permissions.js';

const missing = (column) => ({ message: `Could not find the '${column}' column of 'contracts' in the schema cache` });

test('missing contract values fail without being removed from later saves', async () => {
  const adapter = createSchemaAdapter();
  const sent = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    await assert.rejects(adapter.writeWithFallback(async (body) => {
      sent.push(body);
      return { error: missing('contract_value') };
    }, { title: 'Agreement', contract_value: 1200 }), { code: 'CONTRACT_SCHEMA_MISMATCH' });
  }
  assert.equal(sent.length, 2);
  assert.ok(sent.every((body) => body.contract_value === 1200));
});

test('supported legacy names preserve dates and content while optional stage can be omitted', async () => {
  const adapter = createSchemaAdapter();
  const saved = await adapter.writeWithFallback(async (body) => {
    for (const column of ['expiry_date', 'description', 'stage']) {
      if (column in body) return { error: missing(column) };
    }
    return { data: body };
  }, { expiry_date: '2027-01-01', description: 'Terms', stage: 'draft', status: 'draft' });
  assert.deepEqual(saved, { expiration_date: '2027-01-01', content: 'Terms', status: 'draft' });
});

test('missing both names of a substantive field cannot silently discard it', async () => {
  const adapter = createSchemaAdapter();
  await assert.rejects(adapter.writeWithFallback(async (body) => ({
    error: missing('description' in body ? 'description' : 'content'),
  }), { description: 'Must be saved' }), { code: 'CONTRACT_SCHEMA_MISMATCH' });
});

function cappedQuery(rows, cap, calls) {
  return (withCount) => ({
    async range(from, to) {
      calls.push([from, to]);
      return { data: rows.slice(from, Math.min(to + 1, from + cap)), count: withCount ? rows.length : null };
    },
  });
}

test('loading all contracts crosses the server row cap without losing rows or totals', async () => {
  const rows = Array.from({ length: 1237 }, (_, id) => ({ id, contract_value: 10 }));
  const calls = [];
  const loaded = await fetchAllRows(cappedQuery(rows, 173, calls));
  assert.deepEqual(loaded, rows);
  assert.equal(loaded.reduce((sum, row) => sum + row.contract_value, 0), 12370);
  assert.ok(calls.length > 1);
});

test('explicit offset and limit work across a smaller server cap', async () => {
  const rows = Array.from({ length: 100 }, (_, id) => ({ id }));
  assert.deepEqual(await fetchAllRows(cappedQuery(rows, 7, []), { offset: 13, limit: 25 }), rows.slice(13, 38));
  assert.deepEqual(await fetchAllRows(cappedQuery(rows, 7, []), { limit: 0 }), []);
});

test('a later page failure rejects the load instead of returning misleading partial totals', async () => {
  const failure = new Error('Connection lost');
  let page = 0;
  await assert.rejects(fetchAllRows(() => ({ range: async () => ++page === 1 ?
    { data: [{ id: 1 }], count: 2 } : { error: failure } })), failure);
});

test('all UI languages format the same USD amount', () => {
  for (const language of ['en', 'vi', 'de', 'fr', 'es', 'ja', 'th', 'zh']) {
    assert.equal(formatCurrency(1234.56, CONTRACT_CURRENCY, language),
      new Intl.NumberFormat(language, { style: 'currency', currency: 'USD' }).format(1234.56));
    assert.equal(formatCompactCurrency(1234.56, CONTRACT_CURRENCY, language), formatCompactCurrency(1234.56, 'USD', language));
  }
});

test('editing and approval permissions match the database role model', () => {
  assert.equal(canEditContracts({ role: 'editor' }), true);
  assert.equal(canEditContracts({ role: 'approver' }), false);
  assert.equal(canEditContracts({ role: 'viewer' }), false);
  assert.equal(canEditContracts(null), false);
  assert.equal(canDecideApproval({ role: 'editor', id: 'one' }, {}), false);
  assert.equal(canDecideApproval({ role: 'approver', id: 'one' }, {}), true);
  assert.equal(canDecideApproval({ role: 'approver', id: 'one' }, { approver_id: 'two' }), false);
  assert.equal(canDecideApproval({ role: 'admin', id: 'one' }, { approver_id: 'two' }), true);
});
