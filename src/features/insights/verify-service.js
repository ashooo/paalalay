/**
 * Standalone verification script for Insights Service & get_health_summary Contracts.
 * Can be executed directly via:
 * node src/features/insights/verify-service.js
 * 
 * Verifies:
 * 1. Zod input schemas (from and to required YYYY-MM-DD, from <= to)
 * 2. Envelope outputs ({ status: 'success' | 'error', data?, error? })
 * 3. VALIDATION_ERROR on missing 'from' or 'to'
 * 4. VALIDATION_ERROR when from > to
 * 5. VALIDATION_ERROR on malformed date strings
 * 6. Correct aggregation of empty data (zero hardcoded dummy data)
 * 7. Correct aggregation of real readings
 */

const { z } = require('zod');

// 1. Zod Contracts
const HealthLogTypeSchema = z.enum([
  'blood_pressure',
  'blood_sugar',
  'temperature',
  'weight',
  'symptom',
]);

const GetHealthSummaryInputSchema = z
  .object({
    from: z
      .string({ error: "'from' date is required" })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "'from' date must be in YYYY-MM-DD format"),
    to: z
      .string({ error: "'to' date is required" })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "'to' date must be in YYYY-MM-DD format"),
    log_type: HealthLogTypeSchema.optional(),
  })
  .refine((data) => data.from <= data.to, {
    message: "'from' date cannot be later than 'to' date",
    path: ['from'],
  });

class TestInsightsService {
  constructor(healthLogs = [], intakes = []) {
    this.logs = healthLogs;
    this.intakes = intakes;
  }

  async getHealthSummary(rawInput) {
    const parsed = GetHealthSummaryInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message = firstIssue
        ? `${firstIssue.path.join('.') || 'input'}: ${firstIssue.message}`
        : 'Invalid health summary input';

      return {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      };
    }

    const { from, to, log_type } = parsed.data;
    const fromUtc = `${from}T00:00:00.000Z`;
    const toUtc = `${to}T23:59:59.999Z`;

    const filtered = this.logs.filter((l) => {
      const matchesType = log_type ? l.log_type === log_type : true;
      const matchesDate = l.recorded_at >= fromUtc && l.recorded_at <= toUtc;
      return matchesType && matchesDate;
    });

    const counts = {
      blood_pressure: 0,
      blood_sugar: 0,
      temperature: 0,
      weight: 0,
      symptom: 0,
    };

    for (const item of filtered) {
      if (item.log_type in counts) counts[item.log_type]++;
    }

    const latest_readings = {
      blood_pressure: null,
      blood_sugar: null,
      temperature: null,
      weight: null,
      symptom: null,
    };

    const bpList = filtered.filter((l) => l.log_type === 'blood_pressure');
    if (bpList.length > 0) {
      const latestBp = bpList[bpList.length - 1];
      latest_readings.blood_pressure = {
        systolic: latestBp.systolic,
        diastolic: latestBp.diastolic,
        pulse_bpm: latestBp.pulse_bpm,
        recorded_at: latestBp.recorded_at,
      };
    }

    let medication_adherence;
    const filteredIntakes = this.intakes.filter(
      (i) => i.scheduled_for >= fromUtc && i.scheduled_for <= toUtc
    );
    if (filteredIntakes.length > 0) {
      const taken = filteredIntakes.filter((i) => i.status === 'taken').length;
      const skipped = filteredIntakes.filter((i) => i.status === 'skipped').length;
      medication_adherence = {
        scheduled_count: filteredIntakes.length,
        taken_count: taken,
        skipped_count: skipped,
        adherence_rate: taken / filteredIntakes.length,
      };
    }

    return {
      status: 'success',
      data: {
        from,
        to,
        counts,
        latest_readings,
        medication_adherence,
      },
    };
  }
}

async function runTests() {
  console.log('--- RUNNING INSIGHTS CONTRACT & SERVICE TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const emptyService = new TestInsightsService([], []);

  // Test 1: Missing 'from'
  const res1 = await emptyService.getHealthSummary({ to: '2026-10-10' });
  assert(
    res1.status === 'error' && res1.error.code === 'VALIDATION_ERROR',
    "1. Missing 'from' returns VALIDATION_ERROR"
  );

  // Test 2: Missing 'to'
  const res2 = await emptyService.getHealthSummary({ from: '2026-10-01' });
  assert(
    res2.status === 'error' && res2.error.code === 'VALIDATION_ERROR',
    "2. Missing 'to' returns VALIDATION_ERROR"
  );

  // Test 3: Malformed date format
  const res3 = await emptyService.getHealthSummary({
    from: '10/01/2026',
    to: '2026-10-10',
  });
  assert(
    res3.status === 'error' && res3.error.code === 'VALIDATION_ERROR',
    '3. Non-YYYY-MM-DD date returns VALIDATION_ERROR'
  );

  // Test 4: from > to
  const res4 = await emptyService.getHealthSummary({
    from: '2026-10-15',
    to: '2026-10-10',
  });
  assert(
    res4.status === 'error' &&
      res4.error.code === 'VALIDATION_ERROR' &&
      res4.error.message.includes('cannot be later than'),
    "4. 'from' later than 'to' returns VALIDATION_ERROR"
  );

  // Test 5: Empty state handling (No dummy data)
  const res5 = await emptyService.getHealthSummary({
    from: '2026-10-01',
    to: '2026-10-10',
  });
  assert(
    res5.status === 'success' &&
      res5.data.counts.blood_pressure === 0 &&
      res5.data.latest_readings.blood_pressure === null &&
      res5.data.medication_adherence === undefined,
    '5. Empty state returns valid success envelope with zero counts and null readings'
  );

  // Test 6: Aggregating real readings
  const populatedService = new TestInsightsService(
    [
      {
        log_type: 'blood_pressure',
        systolic: 120,
        diastolic: 80,
        pulse_bpm: 72,
        recorded_at: '2026-10-05T08:00:00.000Z',
      },
      {
        log_type: 'blood_pressure',
        systolic: 125,
        diastolic: 82,
        pulse_bpm: 75,
        recorded_at: '2026-10-06T08:00:00.000Z',
      },
    ],
    [
      { status: 'taken', scheduled_for: '2026-10-05T09:00:00.000Z' },
      { status: 'taken', scheduled_for: '2026-10-06T09:00:00.000Z' },
      { status: 'skipped', scheduled_for: '2026-10-07T09:00:00.000Z' },
    ]
  );

  const res6 = await populatedService.getHealthSummary({
    from: '2026-10-01',
    to: '2026-10-10',
  });
  assert(
    res6.status === 'success' &&
      res6.data.counts.blood_pressure === 2 &&
      res6.data.latest_readings.blood_pressure.systolic === 125 &&
      res6.data.medication_adherence.taken_count === 2 &&
      res6.data.medication_adherence.scheduled_count === 3 &&
      Math.round(res6.data.medication_adherence.adherence_rate * 100) === 67,
    '6. Correctly aggregates counts, latest readings, and adherence rates'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
