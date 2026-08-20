/**
 * The league labels a season by the two calendar years it spans — the DB
 * `year` is the later one, so season 2026 shows as "'25-'26" and 2027 as
 * "'26-'27". One place so the Budget, Rankings, and Rematch Draft pages all
 * read the same.
 */
export function seasonSpanLabel(year: number): string {
  const two = (y: number) => String(y % 100).padStart(2, "0");
  return `'${two(year - 1)}-'${two(year)}`;
}
