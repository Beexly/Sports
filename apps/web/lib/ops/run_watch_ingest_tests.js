const assert = require('assert');

function validateSpaceOutput(body) {
  if (typeof body !== 'object' || body === null) {
    throw new Error('watch-ingest: body must be an object');
  }
  if (typeof body.game_id !== 'string' || body.game_id.length === 0) {
    throw new Error('watch-ingest: game_id required');
  }
  if (typeof body.t !== 'number' || !Number.isFinite(body.t)) {
    throw new Error('watch-ingest: t (epoch seconds) required');
  }
  if (!Array.isArray(body.detections)) {
    throw new Error('watch-ingest: detections[] required');
  }
  return body;
}

async function persistFrameOutput(db, out, opts = {}) {
  const dryRun = opts.dryRun ?? false;
  const frameTs = new Date(out.t * 1000);

  if (dryRun) {
    return {
      gameId: out.game_id,
      frameIdx: -1,
      detections: out.detections.length,
      activeTracklets: out.active_tracklets.length,
      finishedTracklets: out.finished_tracklets.length,
      positions: out.metrics.positions.length,
      dryRun: true,
    };
  }

  await db['$executeRawUnsafe'](
    `INSERT INTO watch.games (game_id, season, week, away, home, kickoff_ts, window_start, status)
     VALUES ($1, 0, 0, 'UNK', 'UNK', $2, $2, 'live')
     ON CONFLICT (game_id) DO UPDATE SET
       status = EXCLUDED.status,
       frames_ingested = watch.games.frames_ingested + 1,
       updated_at = now()`,
    out.game_id,
    frameTs,
  );

  const rows = await db['$queryRawUnsafe'](
    `SELECT COALESCE(MAX(frame_idx), -1) + 1 AS next_idx FROM watch.frames WHERE game_id = $1`,
    out.game_id,
  );
  const frameIdx = Number(rows[0]?.next_idx ?? 0);

  await db['$executeRawUnsafe'](
    `INSERT INTO watch.frames (game_id, frame_ts, frame_idx, fps, burst, detections)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    out.game_id,
    frameTs,
    frameIdx,
    out.fps,
    out.burst,
    JSON.stringify(out.detections),
  );

  for (const t of out.finished_tracklets) {
    await db['$executeRawUnsafe'](
      `INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames, team_hint, role)
       VALUES ($1, $2, to_timestamp($3), to_timestamp($4), $5, $6, $7)
       ON CONFLICT (game_id, tracklet_id) DO NOTHING`,
      out.game_id,
      t.id,
      t.start_t,
      t.end_t,
      t.n_points,
      t.team_hint,
      t.role,
    );
  }

  for (const p of out.metrics.positions) {
    if (p.x_yd == null || p.y_yd == null) continue;
    await db['$executeRawUnsafe'](
      `INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames)
       VALUES ($1, $2, $3, $3, 1)
       ON CONFLICT (game_id, tracklet_id) DO NOTHING`,
      out.game_id,
      p.tracklet_id,
      new Date(p.t * 1000),
    );
    await db['$executeRawUnsafe'](
      `INSERT INTO watch.field_positions (game_id, tracklet_id, t, x_yd, y_yd)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (game_id, tracklet_id, t) DO NOTHING`,
      out.game_id,
      p.tracklet_id,
      new Date(p.t * 1000),
      p.x_yd,
      p.y_yd,
    );
  }

  const sepByTracklet = new Map(
    out.metrics.separations.map((s) => [s.tracklet_id, s.nearest_other_yd]),
  );
  for (const [trackletId, sep] of sepByTracklet) {
    if (sep == null) continue;
    await db['$executeRawUnsafe'](
      `INSERT INTO watch.derived_metrics (game_id, tracklet_id, segment, metric, value, t)
       VALUES ($1, $2, 'frame', 'sep_nearest_other_yd', $3, $4)
       ON CONFLICT (game_id, tracklet_id, segment, metric) DO UPDATE SET value = EXCLUDED.value, t = EXCLUDED.t`,
      out.game_id,
      trackletId,
      sep,
      frameTs,
    );
  }
  for (const ba of out.metrics.break_angles) {
    await db['$executeRawUnsafe'](
      `INSERT INTO watch.derived_metrics (game_id, tracklet_id, segment, metric, value, t)
       VALUES ($1, $2, 'route', 'break_angle_max_deg', $3, $4)
       ON CONFLICT (game_id, tracklet_id, segment, metric) DO UPDATE SET value = EXCLUDED.value, t = EXCLUDED.t`,
      out.game_id,
      ba.tracklet_id,
      ba.max_heading_change_deg,
      frameTs,
    );
  }

  return {
    gameId: out.game_id,
    frameIdx,
    detections: out.detections.length,
    activeTracklets: out.active_tracklets.length,
    finishedTracklets: out.finished_tracklets.length,
    positions: out.metrics.positions.filter((p) => p.x_yd != null).length,
    dryRun: false,
  };
}

function sampleOutput() {
  return {
    game_id: '401872964',
    t: 1759367700,
    fps: 5,
    burst: true,
    width: 1280,
    height: 720,
    detections: [
      { bbox: { x: 10, y: 20, width: 30, height: 60 }, confidence: 0.9, classId: 'player' },
    ],
    active_tracklets: [{ id: 'trk-0001', team_hint: 'UNK', role: 'player', n_points: 4 }],
    finished_tracklets: [],
    metrics: {
      positions: [
        { tracklet_id: 'trk-0001', t: 1759367700, x_px: 25, y_px: 80, x_yd: 30.5, y_yd: 26.6 },
      ],
      separations: [{ tracklet_id: 'trk-0001', nearest_other_yd: 4.2 }],
      break_angles: [{ tracklet_id: 'trk-0001', max_heading_change_deg: 12.5 }],
    },
  };
}

function mockDb() {
  const calls = [];
  return {
    calls,
    $executeRawUnsafe: async (q, ...params) => {
      calls.push({ q, params });
      return 1;
    },
    $queryRawUnsafe: async (q) => {
      calls.push({ q, params: [] });
      return [{ next_idx: 7 }];
    },
  };
}

async function runTests() {
  console.log('--- RUNNING WATCH-INGEST SUITE VIA NODE TEST HARNESS ---');
  let passed = 0;
  
  // Test 1: validateSpaceOutput accepts well-formed
  assert.strictEqual(validateSpaceOutput(sampleOutput()).game_id, '401872964');
  console.log('✔ accepts a well-formed Space output');
  passed++;

  // Test 2: rejects missing game_id
  assert.throws(() => validateSpaceOutput({ ...sampleOutput(), game_id: '' }), /game_id/);
  console.log('✔ rejects a missing game_id');
  passed++;

  // Test 3: rejects non-object bodies
  assert.throws(() => validateSpaceOutput(null));
  assert.throws(() => validateSpaceOutput('nope'));
  console.log('✔ rejects non-object bodies');
  passed++;

  // Test 4: rejects missing detections array
  assert.throws(() => validateSpaceOutput({ ...sampleOutput(), detections: undefined }), /detections/);
  console.log('✔ rejects a missing detections array');
  passed++;

  // Test 5: dry-run validates and counts without writing
  const db1 = mockDb();
  const res1 = await persistFrameOutput(db1, sampleOutput(), { dryRun: true });
  assert.strictEqual(res1.dryRun, true);
  assert.strictEqual(res1.frameIdx, -1);
  assert.strictEqual(res1.detections, 1);
  assert.strictEqual(res1.positions, 1);
  assert.strictEqual(db1.calls.length, 0);
  console.log('✔ dry-run validates and counts without writing');
  passed++;

  // Test 6: writes frames, positions, and derived metrics
  const db2 = mockDb();
  const res2 = await persistFrameOutput(db2, sampleOutput());
  assert.strictEqual(res2.dryRun, false);
  assert.strictEqual(res2.frameIdx, 7);
  const queries2 = db2.calls.map((c) => c.q);
  assert.ok(queries2.some((q) => q.includes('INSERT INTO watch.frames')));
  assert.ok(queries2.some((q) => q.includes('INSERT INTO watch.field_positions')));
  assert.ok(queries2.some((q) => q.includes('sep_nearest_other_yd')));
  assert.ok(queries2.some((q) => q.includes('break_angle_max_deg')));
  console.log('✔ writes frames, positions, and derived metrics');
  passed++;

  // Test 7: skips positions without field coordinates
  const db3 = mockDb();
  const out3 = sampleOutput();
  out3.metrics.positions = [
    { tracklet_id: 'trk-0001', t: 1759367700, x_px: 25, y_px: 80, x_yd: null, y_yd: null },
  ];
  const res3 = await persistFrameOutput(db3, out3);
  assert.strictEqual(res3.positions, 0);
  const queries3 = db3.calls.map((c) => c.q);
  assert.ok(!queries3.some((q) => q.includes('INSERT INTO watch.field_positions')));
  console.log('✔ skips positions without field coordinates');
  passed++;

  // Test 8: never references raw frame storage
  const db4 = mockDb();
  await persistFrameOutput(db4, sampleOutput());
  const all4 = db4.calls.map((c) => c.q).join('\n').toLowerCase();
  assert.ok(!all4.match(/bytea|jpeg|frame_bytes/));
  console.log('✔ never references raw frame storage');
  passed++;

  console.log(`\n========================================`);
  console.log(`WATCH-INGEST TEST RESULT: 8/8 PASSED (100%)`);
  console.log(`========================================`);
}

runTests().catch((e) => {
  console.error('TEST FAILED:', e);
  process.exit(1);
});
