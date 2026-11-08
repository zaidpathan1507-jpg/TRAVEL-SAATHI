// Starts the FastAPI server on a throwaway SQLite file and walks through the whole demo flow.
// Usage: npm run test:backend   (needs the backend dependencies: pip install -r backend/requirements.txt)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 4799;
const base = `http://127.0.0.1:${PORT}`;
const dbFile = join(tmpdir(), `anvesha-smoke-${process.pid}.db`).replace(/\\/g, '/');
const server = spawn(process.env.PYTHON || 'python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(PORT)], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, DATABASE_URL: `sqlite:///${dbFile}` },
  stdio: ['ignore', 'inherit', 'inherit'],
});
server.on('error', (e) => {
  console.error('✗ could not start the backend:', e.message, '(set PYTHON=path/to/python if needed)');
  process.exit(1);
});

// wait until the API answers
for (let i = 0; ; i++) {
  try {
    if ((await fetch(base + '/api/health')).ok) break;
  } catch {
    /* not up yet */
  }
  if (i > 60) {
    console.error('✗ backend did not start within 30 s');
    server.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}

const call = async (method, path, body) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data.detail ?? data.error)}`);
  return data;
};
const step = (name) => console.log('✓', name);

try {
  const health = await call('GET', '/api/health');
  assert.equal(health.ok, true);
  step(`health (database: ${health.database})`);

  const exps = await call('GET', '/api/experiences');
  assert.ok(exps.length >= 16 && exps[0].provider && Array.isArray(exps[0].slots));
  step(`${exps.length} experiences`);

  const parsed = await call('POST', '/api/ai/parse', { text: 'I have 3 hours in Pune with my family. We want local food and something cultural under ₹2000 and within 5 km.' });
  assert.equal(parsed.trip.minutes, 180);
  assert.equal(parsed.trip.budget, 2000);
  assert.deepEqual(parsed.trip.interests, ['food', 'culture']);
  step('AI parse: ' + parsed.fields.map((f) => `${f.label}=${f.value}`).join(', '));

  const recs = await call('POST', '/api/ai/recommend', { trip: parsed.trip, limit: 3 });
  assert.equal(recs.recommendations[0].place_id, 'db:pune-food-walk');
  assert.ok(recs.recommendations.length <= 3);
  step(`recommend (${recs.engine_meta.data_source}): ${recs.recommendations.map((r) => `${r.name} ${Math.round(r.final_score * 100)}%`).join(' | ')}`);

  const none = await call('POST', '/api/ai/recommend', { trip: { ...parsed.trip, city: 'Jaipur' }, limit: 3 });
  assert.equal(none.recommendations.length, 0);
  step('recommend: a city with no local data returns an empty list');

  const tp = await call('POST', '/api/ai/trip-plans', { trip: parsed.trip, limit: 12 });
  assert.ok(tp.plans.length >= 1 && tp.plans.length <= 4, 'expected 1-4 plans');
  const known = new Set(tp.shortlist.recommendations.map((r) => r.place_id));
  for (const p of tp.plans) {
    assert.ok(p.stops.length >= 1 && p.stops.every((s) => known.has(s.placeId)), 'plan stops must come from the shortlist');
    assert.ok(p.stops.every((s, i) => s.end > s.start && (i === 0 || s.start >= p.stops[i - 1].end)), 'stops must be in time order');
    assert.ok(p.endMin - p.startMin <= parsed.trip.minutes, 'plan must fit the available time');
  }
  step(`trip-plans (${tp.plan_meta.generator}): ${tp.plans.map((p) => `${p.title} [${p.stops.length} stops, ₹${p.perPerson}/person]`).join(' | ')}`);

  const plan = await call('POST', '/api/ai/plan', { primaryId: 'pune-food-walk', trip: parsed.trip });
  assert.deepEqual(plan.ids, ['shaniwar-wada-story', 'pune-food-walk']);
  step(`plan: ${plan.ids.join(' → ')} (${plan.plan.totalMin} min, ₹${plan.plan.perPerson}/person)`);

  const rain = await call('POST', '/api/ai/adapt/rain', { ids: plan.ids, trip: parsed.trip });
  assert.deepEqual(rain.affected, ['pune-food-walk']);
  step(`rain: ${rain.alternatives.length} indoor alternatives, top = ${rain.alternatives[0].title}`);

  const ids = plan.ids.map((x) => (x === rain.affected[0] ? rain.alternatives[0].id : x));
  const time = await call('POST', '/api/ai/adapt/time', { ids, trip: parsed.trip, minutes: 90 });
  step(`90 min: ${time.savedMin} minutes saved`);

  const checkout = await call('POST', '/api/bookings', { items: ids.map((id, i) => ({ expId: id, time: 970 + i * 55 })), date: '2026-09-25', adults: 2, children: 2, payment: 'upi', customer: 'Ananya Sharma', from: 'Bengaluru' });
  assert.equal(checkout.bookings.length, 2);
  step(`checkout ${checkout.checkoutId}: ₹${checkout.total}`);

  const pb = await call('GET', '/api/bookings?providerId=heritage');
  assert.ok(pb.some((b) => b.checkoutId === checkout.checkoutId && b.isNew));
  step(`provider sees ${pb.filter((b) => b.isNew).length} new booking(s)`);

  const upd = await call('PATCH', `/api/bookings/${pb.find((b) => b.status === 'Pending').id}`, { status: 'Confirmed' });
  assert.equal(upd.status, 'Confirmed');
  step('booking status updated');

  const av = await call('GET', '/api/providers/heritage/availability?from=2026-09-25&days=7');
  const slot = av['shaniwar-wada-story']['2026-09-25'][0];
  const toggled = await call('PATCH', '/api/availability', { experienceId: 'shaniwar-wada-story', date: '2026-09-25', time: slot.time, enabled: false });
  assert.equal(toggled.enabled, false);
  step(`availability: ${Object.keys(av).length} experiences, slot closed`);

  const created = await call('POST', '/api/providers/heritage/experiences', { title: 'Family Heritage Package', category: 'culture', durationMin: 120, price: 900, childPrice: 500, slots: [{ time: 990, capacity: 12 }] });
  assert.ok(created.id);
  step('experience published');

  const an = await call('GET', '/api/providers/heritage/analytics');
  assert.equal(an.series.days.length, 14);
  step('analytics');
  console.log('\nAll API checks passed.');
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  server.kill();
  for (const suffix of ['', '-journal']) {
    try {
      rmSync(dbFile + suffix, { force: true });
    } catch {
      /* the server may still hold the file on Windows; the OS temp folder is cleaned up eventually */
    }
  }
}
