/**
 * Schema drift tolerance for contract writes.
 *
 * Deployments of this app disagree on the contracts table: production
 * historically used `expiration_date` / `content`, and `stage` only exists once
 * SQL/add_contract_stage_column.sql has been run. Sending a column the table
 * doesn't have makes PostgREST reject the entire write with a 400 -
 * "Could not find the 'x' column of 'contracts' in the schema cache".
 *
 * Rather than hard-coding one schema, the adapter learns the real column set
 * from the rows it reads, remaps anything that has a known older name, and drops
 * what genuinely isn't there. In the normal case no failed request is made.
 */

/** Columns this app writes, and the older name they may live under. */
export const COLUMN_ALIASES = {
  expiry_date: 'expiration_date',
  description: 'content',
};

/** Columns that are optional: absent means "drop it", not "fail". */
export const OPTIONAL_COLUMNS = ['stage'];

/** Pulls the offending column name out of a PostgREST schema error. */
export const missingColumnFrom = (error) => {
  const message = error?.message || '';
  const quoted = /Could not find the '([^']+)' column/.exec(message);
  if (quoted) return quoted[1];
  const named = /column "?([a-zA-Z_]+)"? of relation/.exec(message);
  return named ? named[1] : null;
};

export const createSchemaAdapter = (aliases = COLUMN_ALIASES, optional = OPTIONAL_COLUMNS) => {
  const absent = new Set();
  const aliased = new Map();

  /**
   * Learns the table's shape from a row exactly as the database returned it.
   * Must be given the raw row, before any normaliser synthesises fields onto it.
   */
  const learnFromRow = (row) => {
    if (!row || typeof row !== 'object') return;

    optional.forEach((column) => {
      if (column in row) absent.delete(column);
      else absent.add(column);
    });

    Object.entries(aliases).forEach(([preferred, legacy]) => {
      if (preferred in row) aliased.delete(preferred);
      else if (legacy in row) aliased.set(preferred, legacy);
    });
  };

  /** Rewrites a payload to match the column set we believe the table has. */
  const adaptPayload = (payload) => {
    const out = { ...payload };
    aliased.forEach((legacy, preferred) => {
      if (preferred in out) {
        if (!(legacy in out)) out[legacy] = out[preferred];
        delete out[preferred];
      }
    });
    absent.forEach((column) => { delete out[column]; });
    return out;
  };

  /**
   * Runs a write; if the table rejects a column, learns from that and retries.
   * @param {(body: object) => Promise<{data: any, error: any}>} run
   */
  const writeWithFallback = async (run, payload, attempts = 4) => {
    let body = adaptPayload(payload);

    for (let i = 0; i < attempts; i += 1) {
      const { data, error } = await run(body);
      if (!error) return data;

      const column = missingColumnFrom(error);
      if (!column || !(column in body)) throw error;

      const legacy = aliases[column];
      if (legacy && !aliased.has(column)) aliased.set(column, legacy);
      else absent.add(column);

      const next = adaptPayload(payload);
      // No change means retrying would just repeat the same failing request.
      if (JSON.stringify(next) === JSON.stringify(body)) throw error;
      body = next;
    }

    throw new Error('Could not reconcile the contracts schema after several attempts');
  };

  return {
    learnFromRow,
    adaptPayload,
    writeWithFallback,
    /** Inspection, for tests and debugging. */
    state: () => ({ absent: [...absent], aliased: [...aliased] }),
  };
};

/** The adapter the contracts API uses. */
export const contractsSchema = createSchemaAdapter();
