/** Hide unverified legacy/placeholder rows without deleting any stored data. */
export const VERIFIED_DOCTOR_SQL = "source_url LIKE 'https://%' AND source_url NOT LIKE '%example.%' AND source_url NOT LIKE '%.invalid%' AND verified_at IS NOT NULL AND datetime(verified_at) IS NOT NULL AND datetime(verified_at) <= datetime('now')";
