const REPORT_ENDPOINT = '/api/audit-report/combined-report';

const buildPageParams = (filters, pageSize, offset) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (key !== 'limit' && key !== 'offset' && value !== '' && value !== null && value !== undefined) {
      params.append(key, value);
    }
  });
  params.set('limit', String(pageSize));
  params.set('offset', String(offset));
  return params;
};

export const fetchAllReportRows = async (client, filters, pageSize = 10000) => {
  const rows = [];
  let offset = 0;

  while (true) {
    const params = buildPageParams(filters, pageSize, offset);
    const response = await client.get(`${REPORT_ENDPOINT}?${params}`);
    const payload = response.data;
    const batch = Array.isArray(payload) ? payload : payload?.data || [];
    const hasMore = typeof payload?.has_more === 'boolean'
      ? payload.has_more
      : batch.length === pageSize;

    rows.push(...batch);
    if (!hasMore) return rows;
    if (batch.length === 0) {
      throw new Error('Report pagination returned an empty page with has_more=true');
    }

    // Feedback filtering happens after raw audit pagination in the backend.
    offset += pageSize;
  }
};

