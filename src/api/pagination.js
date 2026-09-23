/** Read every requested row, even when the server caps each response. */
export async function fetchAllRows(createQuery, { offset = 0, limit, pageSize = 500 } = {}) {
  const rows = [];
  const start = Math.max(0, offset);
  const requested = limit == null ? Infinity : Math.max(0, limit);
  let total = Infinity;
  while (rows.length < requested && start + rows.length < total) {
    const from = start + rows.length;
    const size = Math.min(pageSize, requested - rows.length);
    const { data, error, count } = await createQuery(rows.length === 0).range(from, from + size - 1);
    if (error) throw error;
    if (count != null) total = count;
    if (!data?.length) break;
    rows.push(...data);
  }
  return rows;
}
