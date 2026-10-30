export type WorkerType = 'male' | 'female55' | 'female50';
export type RetirementMode = 'statutory' | 'manual';

export interface MonthParts {
  year: number;
  month: number;
}

export interface StatutoryRetirement {
  retirementMonth: string;
  ageMonths: number;
  delayMonths: number;
  originalAge: number;
}

export const WORKER_TYPE_LABELS: Record<WorkerType, string> = {
  male: '男职工 · 原60岁退休',
  female55: '女职工 · 原55岁退休',
  female50: '女职工 · 原50岁退休',
};

const REFORM_START: Record<WorkerType, number> = {
  male: 1965 * 12,
  female55: 1970 * 12,
  female50: 1975 * 12,
};

const ORIGINAL_AGE: Record<WorkerType, number> = {
  male: 60,
  female55: 55,
  female50: 50,
};

export function monthIndex(year: number, month: number): number {
  return year * 12 + month - 1;
}

export function currentMonthIndex(date = new Date()): number {
  return monthIndex(date.getFullYear(), date.getMonth() + 1);
}

export function parseMonth(value: string): MonthParts | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthToIndex(value: string): number {
  const parts = parseMonth(value);
  return parts ? monthIndex(parts.year, parts.month) : NaN;
}

export function indexToMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function addMonths(value: string, months: number): string {
  return indexToMonth(monthToIndex(value) + months);
}

export function monthsBetween(fromMonth: string, toMonth: string): number {
  return monthToIndex(toMonth) - monthToIndex(fromMonth);
}

export function formatMonth(value: string): string {
  const parts = parseMonth(value);
  return parts ? `${parts.year}年${parts.month}月` : '—';
}

export function formatAge(ageMonths: number): string {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) return '—';
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months === 0 ? `${years}岁` : `${years}岁${months}个月`;
}

export function completedAge(birthMonth: string, atMonth = indexToMonth(currentMonthIndex())): number {
  return Math.floor(monthsBetween(birthMonth, atMonth) / 12);
}

/**
 * 按全国人大常委会决定所附对照表换算。
 * 1965/1970/1975 年 1 月起，分别按每 4/4/2 个出生月延迟 1 个月。
 */
export function statutoryRetirement(
  workerType: WorkerType,
  birthMonth: string,
): StatutoryRetirement | null {
  const birth = monthToIndex(birthMonth);
  if (!Number.isFinite(birth) || !(workerType in REFORM_START)) return null;

  const start = REFORM_START[workerType];
  const step = workerType === 'female50' ? 2 : 4;
  const maxDelay = workerType === 'female50' ? 60 : 36;
  const delayMonths = birth < start
    ? 0
    : Math.min(maxDelay, Math.floor((birth - start) / step) + 1);
  const originalAge = ORIGINAL_AGE[workerType];
  const ageMonths = originalAge * 12 + delayMonths;

  return {
    retirementMonth: indexToMonth(birth + ageMonths),
    ageMonths,
    delayMonths,
    originalAge,
  };
}
