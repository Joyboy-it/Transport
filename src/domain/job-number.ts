export function formatJobNumber(year: number, sequence: number) {
  return `JOB-${year}-${String(sequence).padStart(5, "0")}`;
}

/** Christian-era year in Thailand (UTC+7, no daylight saving). */
export function bangkokYear(now: Date) {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear();
}
