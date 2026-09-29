import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
// Compile only these pure backend modules in memory; no generated files or server needed.
function load(name) {
  const file = new URL('../lib/integration/' + name + '.ts', import.meta.url);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => {
    if (id === './mapping') return load('mapping');
    throw new Error('Unexpected dependency: ' + id);
  }, compiled, compiled.exports);
  return compiled.exports;
}
const { mapPayload } = load('mapping');
const { collect } = load('service');
const base = { id: 'sensor-1', zoneId: 'Z-01', observedAt: '2026-09-29T12:00:00+07:00' };
const occupancy = { ...base, status: 'ACTIVE', occupied: false, activity: 'none' };
test('normalizes timezone, enum, energy and power without inventing occupancy', () => {
  const [row] = mapPayload('wifi-csi', { data: [occupancy] });
  assert.equal(row.observedAt, '2026-09-29T05:00:00.000Z');
  assert.equal(row.occupied, false);
  assert.equal(row.status, 'active');
  for (const source of ['energy-meter', 'bms', 'hvac']) {
    const [energy] = mapPayload(source, { data: [{ ...base, status: 'running', energy: { value: 1500, unit: 'Wh' }, power: { value: 500, unit: 'W' } }] });
    assert.equal(energy.energyKwh, 1.5);
    assert.equal(energy.powerKw, 0.5);
  }
});
test('rejects malformed readings, duplicates and ambiguous timestamps', () => {
  for (const row of [{ ...occupancy, occupied: 'false' }, { ...occupancy, observedAt: '2026-09-29' }, { ...occupancy, status: 'bogus' }]) {
    assert.throws(() => mapPayload('wifi-csi', { data: [row] }));
  }
  assert.throws(() => mapPayload('wifi-csi', { data: [occupancy, occupancy] }));
  assert.throws(() => mapPayload('energy-meter', { data: [{ ...base, status: 'running', energy: { value: -1, unit: 'kWh' } }] }));
});
test('maps production sources and rejects reversed schedules', () => {
  const row = { ...base, machineId: 'M1', lineId: 'L1', machineStatus: 'running', lineStatus: 'idle', schedule: [{ orderId: 'P1', startAt: base.observedAt, endAt: '2026-09-29T13:00:00+07:00' }] };
  for (const source of ['plc', 'mes', 'scada']) assert.equal(mapPayload(source, { data: [row] })[0].schedule.length, 1);
  row.schedule[0].endAt = '2026-09-29T11:00:00+07:00';
  assert.throws(() => mapPayload('mes', { data: [row] }));
});
test('isolates failures and uses only GET with redirects disabled', async () => {
  const result = await collect(['wifi-csi', 'plc'], { INTEGRATION_WIFI_CSI_URL: 'https://gateway.test/occupancy', INTEGRATION_WIFI_CSI_TOKEN: 'secret' }, async (url, init) => {
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.Authorization, 'Bearer secret');
    return Response.json({ data: [occupancy] });
  });
  assert.equal(result.meta.status, 'partial');
  assert.equal(result.data.length, 1);
  assert.equal(result.errors[0].code, 'NOT_CONFIGURED');
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('reports invalid JSON, upstream failure, empty success and invalid configuration', async () => {
  const env = { INTEGRATION_PLC_URL: 'https://gateway.test' };
  for (const [response, code] of [[new Response('bad'), 'INVALID_PAYLOAD'], [new Response('', { status: 500 }), 'UPSTREAM_ERROR'], [Response.json({ data: [{}] }), 'INVALID_PAYLOAD']]) {
    assert.equal((await collect(['plc'], env, async () => response)).errors[0].code, code);
  }
  assert.equal((await collect(['plc'], env, async () => Response.json({ data: [] }))).meta.status, 'ok');
  assert.equal((await collect(['plc'], { INTEGRATION_PLC_URL: 'file:///test' })).errors[0].code, 'INVALID_CONFIG');
});
test('timeout aborts the upstream request and oversized bodies fail', async () => {
  const result = await collect(['plc'], { INTEGRATION_PLC_URL: 'https://gateway.test', INTEGRATION_TIMEOUT_MS: '5' }, async (_, init) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 1000);
    init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal.reason); });
  }));
  assert.equal(result.errors[0].code, 'TIMEOUT');
  const large = await collect(['plc'], { INTEGRATION_PLC_URL: 'https://gateway.test' }, async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)));
  assert.equal(large.errors[0].code, 'INVALID_PAYLOAD');
});
