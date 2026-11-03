import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchAllReportRows } from '../src/services/reportExport.js';

test('exports every row when results cross the 10,000-row boundary', async () => {
  const requests = [];
  const firstPage = Array.from({ length: 10000 }, (_, id) => ({ id }));
  const secondPage = [{ id: 10000 }, { id: 10001 }];
  const client = {
    async get(url) {
      requests.push(url);
      return requests.length === 1
        ? { data: { data: firstPage, has_more: true } }
        : { data: { data: secondPage, has_more: false } };
    },
  };

  const rows = await fetchAllReportRows(client, { opco: 'ACS' });

  assert.equal(rows.length, 10002);
  assert.match(requests[0], /opco=ACS/);
  assert.match(requests[0], /limit=10000/);
  assert.match(requests[0], /offset=0/);
  assert.match(requests[1], /offset=10000/);
});

test('advances by page size when server-side filtering returns a short page', async () => {
  const offsets = [];
  const client = {
    async get(url) {
      const offset = Number(new URL(url, 'https://example.test').searchParams.get('offset'));
      offsets.push(offset);
      return offset === 0
        ? { data: { data: [{ id: 1 }], has_more: true } }
        : { data: { data: [{ id: 2 }], has_more: false } };
    },
  };

  const rows = await fetchAllReportRows(client, { feedback_type: 'thumbs_up' });

  assert.deepEqual(rows, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(offsets, [0, 10000]);
});

test('rejects an invalid empty continuation page instead of looping forever', async () => {
  const client = { async get() { return { data: { data: [], has_more: true } }; } };

  await assert.rejects(
    fetchAllReportRows(client, {}),
    /empty page with has_more=true/,
  );
});

