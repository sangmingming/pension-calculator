import { CITY_PROFILES, type CityId, type CityProfile } from '@/lib/cities';
import {
  currentMonthIndex,
  indexToMonth,
  monthToIndex,
  monthsBetween,
  statutoryRetirement,
  type RetirementMode,
  type WorkerType,
} from '@/lib/retirement';

export type FutureMode = 'base' | 'ratio';

export interface PensionInputs {
  city: CityId;
  accountBalance: number;
  paidMonths: number;
  totalYears: number;
  futureMode: FutureMode;
  baseAmount: number;
  ratioPct: number;
  futureMonths: number;
  /** 用户手动修改后，退休信息变化不再覆盖后续缴费月数 */
  futureMonthsCustomized: boolean;
  currentAge: number;
  birthMonth: string;
  workerType: WorkerType;
  retirementMode: RetirementMode;
  retirementMonth: string;
  payoutMonths: number;
  /** 后续缴费指数使用的上年度社平工资／规定基准 */
  contributionReference: number;
  /** 基础养老金计发基数 */
  pensionBase: number;
  interestRate: number;
  /** 退休前年均通胀假设，仅用于折算当前购买力 */
  inflationRate: number;
  pastIndex: number;
  /** 北京：按N应缴口径计入指数分母、但指数分子为0的断缴月数 */
  beijingBreakMonths: number;
}

export interface YearPoint {
  year: number;
  balance: number;
  contributed: number;
}

export interface PensionResult {
  futureBase: number;
  futureIndex: number;
  avgIndex: number;
  indexDenominatorMonths: number;
  /** 广东低平均指数修正系数，其他地区恒为 1 */
  coefficientA: number;
  existingFV: number;
  contribFV: number;
  accountFinal: number;
  basePension: number;
  personalPension: number;
  monthly: number;
  yearly: number;
  /** 按退休前通胀假设折算的当前购买力 */
  realMonthly: number;
  realYearly: number;
  inflationDivisor: number;
  yearsToRetire: number;
  monthsToRetire: number;
  retirementAgeMonths: number;
  replacementRate: number | null;
  totalMonths: number;
  deemedMonths: number;
  monthlyContribution: number;
  totalContribution: number;
  interestEarned: number;
  yearsMismatch: boolean;
  retirementYear: number;
  minRequiredYears: number;
  belowCommonMinYears: boolean;
  growth: YearPoint[];
}

export const PERSONAL_RATE = 0.08;

export const PAYOUT_MONTHS_BY_AGE: Record<number, number> = {
  40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216, 46: 212,
  47: 208, 48: 204, 49: 199, 50: 195, 51: 190, 52: 185, 53: 180,
  54: 175, 55: 170, 56: 164, 57: 158, 58: 152, 59: 145, 60: 139,
  61: 132, 62: 125, 63: 117, 64: 109, 65: 101, 66: 93, 67: 84,
  68: 75, 69: 65, 70: 56,
};

/** 非整数年龄按相邻整数年龄线性折算，仅作估算，保留当地核定修正入口。 */
export function estimatePayoutMonths(ageMonths: number): number {
  const age = Math.floor(ageMonths / 12);
  const remainingMonths = ageMonths % 12;
  const current = PAYOUT_MONTHS_BY_AGE[age];
  if (!Number.isFinite(current)) return NaN;
  if (remainingMonths === 0) return current;
  const next = PAYOUT_MONTHS_BY_AGE[age + 1];
  if (!Number.isFinite(next)) return NaN;
  return Math.round((current - ((current - next) * remainingMonths) / 12) * 10) / 10;
}

export function defaultInputs(city: CityId = 'shanghai', now = new Date()): PensionInputs {
  const profile = CITY_PROFILES[city];
  const currentMonth = currentMonthIndex(now);
  const birthMonth = indexToMonth(currentMonth - 40 * 12);
  const retirement = statutoryRetirement('male', birthMonth)!;
  const futureMonths = monthsBetween(indexToMonth(currentMonth), retirement.retirementMonth);
  return {
    city,
    accountBalance: 80000,
    paidMonths: 120,
    totalYears: yearsFromMonths(120, futureMonths),
    futureMode: 'base',
    baseAmount: 9000,
    ratioPct: 100,
    futureMonths,
    futureMonthsCustomized: false,
    currentAge: 40,
    birthMonth,
    workerType: 'male',
    retirementMode: 'statutory',
    retirementMonth: retirement.retirementMonth,
    payoutMonths: estimatePayoutMonths(retirement.ageMonths),
    contributionReference: profile.contributionReference,
    pensionBase: profile.pensionBase,
    interestRate: 3,
    inflationRate: 1.5,
    pastIndex: 1,
    beijingBreakMonths: 0,
  };
}

export function yearsFromMonths(paidMonths: number, futureMonths: number): number {
  if (!Number.isFinite(paidMonths) || !Number.isFinite(futureMonths)) return NaN;
  return Number(((paidMonths + futureMonths) / 12).toFixed(4));
}

export function minYearsForRetirement(year: number): number {
  if (year < 2030) return 15;
  return Math.min(20, 15 + (year - 2029) * 0.5);
}

export function validateInputs(
  inp: PensionInputs,
  profile: CityProfile,
  now = new Date(),
): Partial<Record<keyof PensionInputs, string>> {
  const e: Partial<Record<keyof PensionInputs, string>> = {};
  const validInt = (v: number, max: number) => Number.isFinite(v) && Number.isInteger(v) && v >= 0 && v <= max;
  const validMoney = (v: number, allowZero = false) =>
    Number.isFinite(v) && (allowZero ? v >= 0 : v > 0) && v <= 1_000_000_000;

  if (!validMoney(inp.accountBalance, true)) e.accountBalance = '请输入 0 至 10 亿元之间的金额';
  if (!validInt(inp.paidMonths, 720)) e.paidMonths = '请输入 0–720 之间的整数月数';
  if (!Number.isFinite(inp.totalYears) || inp.totalYears <= 0 || inp.totalYears > 60) {
    e.totalYears = '缴费年限需在 0–60 年之间';
  } else if (Math.abs(inp.totalYears * 10000 - Math.round(inp.totalYears * 10000)) > 1e-7) {
    e.totalYears = '缴费年限最多保留 4 位小数';
  }
  if (inp.futureMode === 'base') {
    if (!validMoney(inp.baseAmount) || inp.baseAmount > 10_000_000) {
      e.baseAmount = '请输入有效的缴费基数';
    } else if (profile.id !== 'other' && (inp.baseAmount < profile.minBase || inp.baseAmount > profile.maxBase)) {
      e.baseAmount = `${profile.name}当前缴费基数应在 ${profile.minBase.toLocaleString('zh-CN')}–${profile.maxBase.toLocaleString('zh-CN')} 元/月之间`;
    }
  }
  if (inp.futureMode === 'ratio' && (!Number.isFinite(inp.ratioPct) || inp.ratioPct < 60 || inp.ratioPct > 300)) {
    e.ratioPct = '缴费比例应在 60%–300% 之间';
  }
  if (!validInt(inp.futureMonths, 720)) e.futureMonths = '请输入 0–720 之间的整数月数';

  const currentMonth = currentMonthIndex(now);
  const birth = monthToIndex(inp.birthMonth);
  if (!Number.isFinite(inp.currentAge) || !Number.isInteger(inp.currentAge) || inp.currentAge < 18 || inp.currentAge > 100) {
    e.currentAge = '请输入 18–100 之间的整数年龄';
  }
  if (!Number.isFinite(birth) || birth > currentMonth || birth < monthToIndex('1900-01')) {
    e.birthMonth = '请选择有效的出生年月';
  }
  if (!['male', 'female55', 'female50'].includes(inp.workerType)) {
    e.workerType = '请选择性别及职工类别';
  }

  const retirement = monthToIndex(inp.retirementMonth);
  const monthsToRetire = retirement - currentMonth;
  if (!Number.isFinite(retirement)) {
    e.retirementMonth = '请选择退休年月';
  } else if (monthsToRetire < 0) {
    e.retirementMonth = '退休年月不能早于当前年月';
  } else if (monthsToRetire > 720) {
    e.retirementMonth = '距退休时间不能超过 60 年';
  } else if (Number.isFinite(birth)) {
    const retirementAgeMonths = retirement - birth;
    if (retirementAgeMonths < 40 * 12 || retirementAgeMonths > 70 * 12) {
      e.retirementMonth = '本工具的退休年龄范围为 40–70 岁';
    }
  }
  if (validInt(inp.futureMonths, 720) && Number.isFinite(monthsToRetire) && monthsToRetire >= 0 && inp.futureMonths > monthsToRetire) {
    e.futureMonths = `后续缴费月数不能超过距退休的 ${monthsToRetire} 个月`;
  }
  if (!Number.isFinite(inp.payoutMonths) || inp.payoutMonths <= 0 || inp.payoutMonths > 300) e.payoutMonths = '计发月数需在 0–300 之间';
  if (!validMoney(inp.contributionReference) || inp.contributionReference > 10_000_000) {
    e.contributionReference = profile.id === 'other' ? '请填写退休地的缴费指数基准' : '请输入有效的缴费指数基准';
  }
  if (!validMoney(inp.pensionBase) || inp.pensionBase > 10_000_000) {
    e.pensionBase = profile.id === 'other' || !Number.isFinite(profile.pensionBase)
      ? '请填写退休地的养老金计发基数'
      : '请输入有效的养老金计发基数';
  }
  if (!Number.isFinite(inp.interestRate) || inp.interestRate < 0 || inp.interestRate > 15) e.interestRate = '记账利率假设在 0%–15% 之间';
  if (!Number.isFinite(inp.inflationRate) || inp.inflationRate < -5 || inp.inflationRate > 20) e.inflationRate = '通胀假设应在 -5%–20% 之间';
  if (!Number.isFinite(inp.pastIndex) || inp.pastIndex < 0.3 || inp.pastIndex > 3) e.pastIndex = '缴费指数通常在 0.6–3 之间';
  if (profile.id === 'beijing' && !validInt(inp.beijingBreakMonths, 720)) {
    e.beijingBreakMonths = '请输入 0–720 之间的整数月数；无可计入断缴期请填 0';
  }
  if (validInt(inp.paidMonths, 720) && validInt(inp.futureMonths, 720) && inp.paidMonths + inp.futureMonths === 0) {
    e.paidMonths = '已缴与后续缴费月数不能同时为 0';
  }
  return e;
}

export function calcPension(inp: PensionInputs, profile: CityProfile, now = new Date()): PensionResult {
  const r = inp.interestRate / 100;
  const n = inp.futureMonths;
  const currentMonth = currentMonthIndex(now);
  const monthsToRetire = monthToIndex(inp.retirementMonth) - currentMonth;
  const yearsToRetire = monthsToRetire / 12;
  const retirementAgeMonths = monthsBetween(inp.birthMonth, inp.retirementMonth);

  const futureBase = inp.futureMode === 'base'
    ? inp.baseAmount
    : Math.round((inp.contributionReference * inp.ratioPct) / 100);
  const futureIndex = Number((futureBase / inp.contributionReference).toFixed(4));
  const pmt = futureBase * PERSONAL_RATE;

  const rm = Math.pow(1 + r, 1 / 12) - 1;
  const existingFV = inp.accountBalance * Math.pow(1 + rm, monthsToRetire);
  const annuityFV = n === 0 ? 0 : rm === 0 ? pmt * n : (pmt * (Math.pow(1 + rm, n) - 1)) / rm;
  // 若提前停止缴费，已形成的账户余额仍继续计息至退休。
  const contribFV = annuityFV * Math.pow(1 + rm, monthsToRetire - n);
  const accountFinal = existingFV + contribFV;

  const totalMonths = inp.paidMonths + n;
  const creditedMonths = Math.round(inp.totalYears * 12);
  const deemedMonths = Math.max(0, creditedMonths - totalMonths);
  // 北京：断缴期指数分子为0，但按N应缴口径计入分母，不增加缴费年限或账户本金。
  const breakMonths = profile.id === 'beijing' ? inp.beijingBreakMonths : 0;
  const indexDenominatorMonths = totalMonths + deemedMonths + breakMonths;
  const avgIndex = (inp.paidMonths * inp.pastIndex + n * futureIndex + deemedMonths) / indexDenominatorMonths;

  const creditedYears = Number(inp.totalYears.toFixed(4));
  // 广东：平均指数低于 0.6 时，a = 平均指数 ÷ 0.6；其余地区 a = 1。
  const coefficientA = profile.rule === 'guangdong' && avgIndex < 0.6 ? avgIndex / 0.6 : 1;
  const baseRaw = (inp.pensionBase * (coefficientA + avgIndex) / 2) * creditedYears * 0.01;
  const personalRaw = accountFinal / inp.payoutMonths;
  const roundBenefit = (value: number) => profile.roundUpToJiao
    ? Math.ceil((value - 1e-10) * 10) / 10
    : Math.round(value * 100) / 100;
  const basePension = roundBenefit(baseRaw);
  const personalPension = roundBenefit(personalRaw);
  const monthly = Math.round((basePension + personalPension) * 100) / 100;
  const inflationDivisor = Math.pow(1 + inp.inflationRate / 100, yearsToRetire);
  const realMonthly = Math.round((monthly / inflationDivisor) * 100) / 100;
  const totalContribution = pmt * n;
  const retirementYear = Math.floor(monthToIndex(inp.retirementMonth) / 12);
  const minRequiredYears = minYearsForRetirement(retirementYear);

  const growth: YearPoint[] = [{ year: 0, balance: inp.accountBalance, contributed: 0 }];
  let bal = inp.accountBalance;
  for (let y = 1; y <= Math.ceil(yearsToRetire); y++) {
    const monthsThisYear = Math.min(12, monthsToRetire - (y - 1) * 12);
    let contributed = 0;
    for (let m = 0; m < monthsThisYear; m++) {
      bal *= 1 + rm;
      const absoluteMonth = (y - 1) * 12 + m;
      if (absoluteMonth < n) {
        bal += pmt;
        contributed += pmt;
      }
    }
    if (monthsThisYear > 0) growth.push({ year: y, balance: bal, contributed });
  }

  return {
    futureBase,
    futureIndex,
    avgIndex,
    indexDenominatorMonths,
    coefficientA,
    existingFV,
    contribFV,
    accountFinal,
    basePension,
    personalPension,
    monthly,
    yearly: monthly * 12,
    realMonthly,
    realYearly: realMonthly * 12,
    inflationDivisor,
    yearsToRetire,
    monthsToRetire,
    retirementAgeMonths,
    replacementRate: n > 0 && futureBase > 0 ? monthly / futureBase : null,
    totalMonths,
    deemedMonths,
    monthlyContribution: pmt,
    totalContribution,
    interestEarned: accountFinal - inp.accountBalance - totalContribution,
    yearsMismatch: Math.abs(inp.totalYears - totalMonths / 12) > 1 / 12,
    retirementYear,
    minRequiredYears,
    belowCommonMinYears: inp.totalYears < minRequiredYears,
    growth,
  };
}

export function fmtCNY(v: number): string {
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}
