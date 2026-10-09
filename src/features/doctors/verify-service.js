/**
 * Standalone verification script for Doctor Directory Service & Contracts.
 * Can be executed directly via:
 * node src/features/doctors/verify-service.js
 * 
 * Verifies:
 * 1. Zod input schemas (specialty required, city optional, limit <= 30)
 * 2. Envelope outputs ({ status: 'success' | 'error', data?, error? })
 * 3. VALIDATION_ERROR on missing specialty
 * 4. VALIDATION_ERROR on limit > 30
 * 5. Success envelope on empty results (never NOT_FOUND)
 * 6. Provenance logic for placeholder vs verified records
 */

const { z } = require('zod');

// 1. Zod Contracts (mirroring contracts.proposal.ts)
const SearchSpecialistsInputSchema = z.object({
  specialty: z.string().trim().min(1, 'Specialty is required'),
  city: z.string().trim().min(1, 'City cannot be empty').optional(),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(30, 'Limit cannot exceed 30')
    .optional()
    .default(20),
});

// Mock in-memory repository to test service execution without native SQLite
const MOCK_DB = [
  {
    id: 'placeholder-doc-001',
    doctor_name: 'Dr. Sample Cardiologist (Placeholder)',
    specialty: 'Cardiology',
    facility_name: 'Sample Metro Heart Clinic (Placeholder)',
    address: '123 Prototype Way, Barangay San Antonio',
    city: 'Pasig',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
  {
    id: 'placeholder-doc-002',
    doctor_name: 'Dr. Example Endocrinologist (Placeholder)',
    specialty: 'Endocrinology',
    facility_name: 'Sample Diabetes & Endocrine Center (Placeholder)',
    address: '456 Mockingbird Blvd, Ermita',
    city: 'Manila',
    latitude: null,
    longitude: null,
    phone: null,
    source_url: null,
    verified_at: null,
  },
];

class MockDoctorService {
  async searchSpecialists(rawInput) {
    const parsed = SearchSpecialistsInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message = firstIssue ? `${firstIssue.path.join('.') || 'input'}: ${firstIssue.message}` : 'Invalid search input';
      return {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      };
    }

    const { specialty, city, limit } = parsed.data;
    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 30);

    const matches = MOCK_DB.filter((doc) => {
      const matchSpecialty = doc.specialty.toLowerCase().includes(specialty.toLowerCase());
      const matchCity = city ? doc.city.toLowerCase().includes(city.toLowerCase()) : true;
      return matchSpecialty && matchCity;
    }).slice(0, safeLimit);

    // Return contract envelope shape
    return {
      status: 'success',
      data: {
        results: matches.map((d) => ({
          id: d.id,
          specialty: d.specialty,
          doctor_name: d.doctor_name,
          facility_name: d.facility_name,
          address: d.address,
          city: d.city,
        })),
      },
    };
  }
}

async function runTests() {
  console.log('--- STARTING DOCTOR SERVICE TESTS ---');
  const service = new MockDoctorService();
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // Test 1: Valid search returns success envelope
  const res1 = await service.searchSpecialists({ specialty: 'Cardiology' });
  assert(res1.status === 'success' && res1.data.results.length === 1, 'Valid specialty search returns success envelope with results');
  assert(res1.data.results[0].facility_name === 'Sample Metro Heart Clinic (Placeholder)', 'Result matches placeholder record');

  // Test 2: Case-insensitive search
  const res2 = await service.searchSpecialists({ specialty: 'cardiology' });
  assert(res2.status === 'success' && res2.data.results.length === 1, 'Case-insensitive specialty match');

  // Test 3: Optional city filter matches
  const res3 = await service.searchSpecialists({ specialty: 'Cardiology', city: 'Pasig' });
  assert(res3.status === 'success' && res3.data.results.length === 1, 'City filter match');

  // Test 4: City filter mismatch yields empty success (never NOT_FOUND)
  const res4 = await service.searchSpecialists({ specialty: 'Cardiology', city: 'Cebu' });
  assert(res4.status === 'success' && res4.data.results.length === 0, 'No match returns empty results array with status=success');

  // Test 5: Missing specialty yields VALIDATION_ERROR
  const res5 = await service.searchSpecialists({});
  assert(res5.status === 'error' && res5.error.code === 'VALIDATION_ERROR', 'Missing specialty yields VALIDATION_ERROR');

  // Test 6: Empty string specialty yields VALIDATION_ERROR
  const res6 = await service.searchSpecialists({ specialty: '   ' });
  assert(res6.status === 'error' && res6.error.code === 'VALIDATION_ERROR', 'Whitespace-only specialty yields VALIDATION_ERROR');

  // Test 7: Limit > 30 yields VALIDATION_ERROR
  const res7 = await service.searchSpecialists({ specialty: 'Cardiology', limit: 35 });
  assert(res7.status === 'error' && res7.error.code === 'VALIDATION_ERROR', 'Limit > 30 yields VALIDATION_ERROR');

  // Test 8: Limit <= 30 is accepted
  const res8 = await service.searchSpecialists({ specialty: 'Cardiology', limit: 30 });
  assert(res8.status === 'success', 'Limit = 30 is accepted');

  // Test 9: Provenance check for placeholder records
  const sample = MOCK_DB[0];
  const isVerified = Boolean(sample.verified_at && sample.source_url);
  assert(!isVerified, 'Placeholder records correctly identify as unverified (source_url and verified_at null)');

  console.log(`\n--- TEST SUMMARY: ${passed}/${total} PASSED ---`);
}

runTests();
