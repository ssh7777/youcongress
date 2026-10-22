import test from 'node:test';
import assert from 'node:assert/strict';
import {repository, pageNumber, searchTerm, sourceHref, csvCell, sourceRecordsCsv, PAGE_SIZE} from '../lib/records.mjs';

test('untrusted pagination and search are bounded', () => {
  for (const value of [-1, 'no', '1.5', Infinity, undefined]) assert.equal(pageNumber(value), 1);
  assert.equal(pageNumber('999999'), 10000);
  assert.equal(searchTerm('a'.repeat(300)).length, 200);
  assert.equal(searchTerm(['query']), '');
});
test('source links permit only credential-free HTTP(S)', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', '/local', 'https://user:pass@example.com', null]) assert.equal(sourceHref(value), null);
  assert.equal(sourceHref('https://example.com/source'), 'https://example.com/source');
});
test('search never interpolates SQL and escapes wildcard input', async () => {
  const calls = [];
  const repo = repository(async (...args) => {calls.push(args); return {rows: []};});
  await repo.statements("%' OR 1=1 --_", 2);
  const [sql, values] = calls[0];
  assert.ok(!sql.includes('OR 1=1'));
  assert.equal(values[0], "%' OR 1=1 --_");
  assert.equal(values[1], "%\\%' OR 1=1 --\\_%");
  assert.deepEqual(values.slice(2), [PAGE_SIZE + 1, PAGE_SIZE]);
});
test('pagination uses one extra row and does not expose it', async () => {
  const repo = repository(async () => ({rows: Array.from({length: 25}, (_, id) => ({id}))}));
  const result = await repo.statements();
  assert.equal(result.items.length, 24);
  assert.equal(result.hasMore, true);
});
test('statement lookup passes the slug as data and returns missing records', async () => {
  const repo = repository(async (sql, values) => {
    assert.equal(sql.includes('DROP'), false);
    assert.deepEqual(values, ["'; DROP TABLE users; --"]);
    return {rows: []};
  });
  assert.equal(await repo.statement("'; DROP TABLE users; --"), null);
  assert.equal(await repo.statement('a'.repeat(251)), null);
});
test('quotes use explicit quote–statement links, not author votes', async () => {
  const repo = repository(async (sql, values) => {
    assert.match(sql, /FROM opinions_statements os/);
    assert.match(sql, /os.statement_id = \$1/);
    assert.match(sql, /btrim\(o.source_text\)/);
    assert.doesNotMatch(sql, /JOIN votes/);
    assert.deepEqual(values, ['123', 25, 0]);
    return {rows: []};
  });
  await repo.quotes('123');
});
test('CSV escapes formulas, quotes and multiline fields', () => {
  for (const value of ['=1+1', '+cmd', '-1', '@SUM(A1)', '  =1', '\t=1', '\nhello']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('one,"two"\nthree'), '"one,""two""\nthree"');
  assert.equal(csvCell(null), '""');
});
test('page-only CSV accurately describes its limitations and source provenance', () => {
  const csv = sourceRecordsCsv({id: '1', title: 'A claim'}, [{id: '2', author_name: 'Ada', content: '=1', source_url: 'https://example.com', source_text: 'A passage', date: '2020-01-01', date_precision: 'year'}]);
  assert.match(csv, /not the full Phoenix verified dataset/);
  assert.match(csv, /Third-party quotations/);
  assert.match(csv, /https:\/\/example.com/);
  assert.match(csv, /"'=1"/);
});
