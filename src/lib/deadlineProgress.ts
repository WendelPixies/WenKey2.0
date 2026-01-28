const MS_PER_DAY = 24 * 60 * 60 * 1000;

type DateInput = Date | number | string | null | undefined;

const normalizeToMidnight = (input: DateInput): Date | null => {
  if (input === null || input === undefined) return null;

  if (typeof input === 'string') {
    const parts = input.split('-').map((p) => Number(p));
    if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  // Normalize to local midnight to ignore hours/minutes
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Calculates linear progress for deadline-based KRs.
 *
 * Rules:
 * - doneDate <= metaDate  -> 100%
 * - doneDate >= limitDate -> 0%
 * - between meta and limit: linear decay
 * - meta === limit: <= meta -> 100%, else 0%
 *
 * Returns a percentage between 0 and 100 (max 2 decimals) or null when any
 * input date is missing/invalid.
 */
export const calculateDeadlineProgress = (
  metaDate: DateInput,
  limitDate: DateInput,
  doneDate: DateInput
): number | null => {
  const meta = normalizeToMidnight(metaDate);
  const limit = normalizeToMidnight(limitDate);
  const done = normalizeToMidnight(doneDate);

  if (!meta || !limit || !done) return null;

  const metaTime = meta.getTime();
  const limitTime = limit.getTime();
  const doneTime = done.getTime();

  // Edge case: meta == limite
  if (metaTime === limitTime) {
    return doneTime <= metaTime ? 100 : 0;
  }

  if (doneTime <= metaTime) return 100;
  if (doneTime >= limitTime) return 0;

  const windowDays = Math.max(1, Math.round((limitTime - metaTime) / MS_PER_DAY));
  const delayDays = Math.round((doneTime - metaTime) / MS_PER_DAY);

  const progress = 1 - delayDays / windowDays;
  const clamped = Math.max(0, Math.min(1, progress));

  return parseFloat((clamped * 100).toFixed(2));
};

// Simple usage examples (import and call runDeadlineProgressExamples() locally if desired)
export const deadlineProgressExamples = [
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-09', expected: 100 },
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-10', expected: 100 },
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-11', expected: 80 },
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-12', expected: 60 },
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-13', expected: 40 },
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-14', expected: 20 },
  { meta: '2026-01-10', limit: '2026-01-15', done: '2026-01-15', expected: 0 },
  { meta: '2026-01-10', limit: '2026-01-10', done: '2026-01-11', expected: 0 },
];

export const runDeadlineProgressExamples = () =>
  deadlineProgressExamples.map((ex) => {
    const actual = calculateDeadlineProgress(ex.meta, ex.limit, ex.done);
    return { ...ex, actual, pass: actual === ex.expected };
  });
