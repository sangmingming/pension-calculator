import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calculator, Check, ChevronDown, ExternalLink, MapPin, Monitor, Moon, RotateCcw, ShieldCheck, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  calcPension,
  defaultInputs,
  estimatePayoutMonths,
  validateInputs,
  yearsFromMonths,
  type FutureMode,
  type PensionInputs,
  type PensionResult,
} from '@/lib/pension';
import {
  addMonths,
  completedAge,
  currentMonthIndex,
  formatAge,
  formatMonth,
  indexToMonth,
  monthsBetween,
  statutoryRetirement,
  WORKER_TYPE_LABELS,
  type RetirementMode,
  type WorkerType,
} from '@/lib/retirement';
import { CITY_ORDER, CITY_PROFILES, PROVINCE_ORDER, REGION_ORDER, type CityId } from '@/lib/cities';
import ResultPanel from '@/sections/ResultPanel';

const DRAFT_KEY = 'pension-calc-draft-v5';
const LEGACY_DRAFT_KEYS = ['pension-calc-draft-v4', 'pension-calc-draft-v3', 'pension-calc-draft-v2'];
const THEME_KEY = 'pension-theme';
type ThemePreference = 'system' | 'light' | 'dark';

const POLICY_LINKS = [
  {
    title: '国务院关于完善企业职工基本养老保险制度的决定',
    meta: '国发〔2005〕38号 · 两项养老金公式、8% 个人账户与计发月数表',
    href: 'https://fgk.chinatax.gov.cn/zcfgk/c102440/c5193739/content.html',
    source: '国家税务总局政策法规库',
  },
  {
    title: '关于实施渐进式延迟法定退休年龄的决定',
    meta: '全国人大常委会 · 退休年龄对照表与最低缴费年限调整',
    href: 'https://www.gov.cn/yaowen/liebiao/202409/content_6974294.htm',
    source: '中国政府网',
  },
  {
    title: '实施弹性退休制度暂行办法',
    meta: '人社部发〔2024〕94号 · 弹性提前、延迟退休及办理规则',
    href: 'https://www.gov.cn/zhengce/zhengceku/202501/content_6995747.htm',
    source: '中国政府网',
  },
  {
    title: '《中华人民共和国社会保险法》释义',
    meta: '基本养老金构成、缴费指数、个人账户与待遇调整机制',
    href: 'https://www.mohrss.gov.cn/SYrlzyhshbzb/rdzt/syshehuibaoxianfa/bxffaguijijiedu/201208/t20120806_28572.html',
    source: '人力资源和社会保障部',
  },
  {
    title: '国家社会保险公共服务平台',
    meta: '官方社保查询、养老保险服务与法定退休年龄计算器',
    href: 'https://si.12333.gov.cn/',
    source: '人力资源和社会保障部主办',
  },
  {
    title: '北京市基本养老保险规定实施通知',
    meta: '京劳社养发〔2007〕29号 · N应缴、断缴期间0指数与可扣除期间',
    href: 'https://rsj.beijing.gov.cn/xxgk/2024zcwj/202407/t20240726_3759985.html',
    source: '北京市人力资源和社会保障局',
  },
];

function loadTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* 无法读取存储时跟随系统 */
  }
  return 'system';
}

type Errors = Partial<Record<keyof PensionInputs, string>>;
interface CalculationSnapshot {
  inputs: PensionInputs;
  result: PensionResult;
}

const NUMBER_KEYS: (keyof PensionInputs)[] = [
  'accountBalance', 'paidMonths', 'totalYears', 'baseAmount', 'ratioPct',
  'futureMonths', 'currentAge', 'payoutMonths', 'contributionReference',
  'pensionBase', 'interestRate', 'inflationRate', 'pastIndex', 'beijingBreakMonths',
];

function loadDraft(): PensionInputs {
  try {
    const current = localStorage.getItem(DRAFT_KEY);
    const legacy = current
      ? null
      : LEGACY_DRAFT_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    const raw = current ?? legacy;
    if (!raw) return defaultInputs();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const city = REGION_ORDER.includes(parsed.city as CityId) ? parsed.city as CityId : 'shanghai';
    const draft = defaultInputs(city);
    for (const key of NUMBER_KEYS) {
      const value = parsed[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        (draft[key] as number) = value;
      }
    }
    // 旧版上海草稿只有一个基数字段，迁移时同时填入两项上海参数。
    if (!current && typeof parsed.cityBase === 'number' && Number.isFinite(parsed.cityBase)) {
      draft.contributionReference = parsed.cityBase;
      draft.pensionBase = parsed.cityBase;
    }
    if (parsed.futureMode === 'base' || parsed.futureMode === 'ratio') draft.futureMode = parsed.futureMode;
    if (parsed.futureMonthsCustomized === true) draft.futureMonthsCustomized = true;
    if (parsed.workerType === 'male' || parsed.workerType === 'female55' || parsed.workerType === 'female50') {
      draft.workerType = parsed.workerType;
    }
    if (parsed.retirementMode === 'statutory' || parsed.retirementMode === 'manual') {
      draft.retirementMode = parsed.retirementMode;
    }
    if (typeof parsed.birthMonth === 'string' && /^\d{4}-\d{2}$/.test(parsed.birthMonth)) {
      draft.birthMonth = parsed.birthMonth;
      if (typeof parsed.retirementMonth === 'string' && /^\d{4}-\d{2}$/.test(parsed.retirementMonth)) {
        draft.retirementMonth = parsed.retirementMonth;
      } else if (draft.retirementMode === 'statutory') {
        draft.retirementMonth = statutoryRetirement(draft.workerType, draft.birthMonth)?.retirementMonth ?? draft.retirementMonth;
      }
    } else {
      // 旧草稿没有出生信息：保留原退休时间并转为手动模式，不擅自推定法定退休年月。
      draft.retirementMode = 'manual';
      if (Number.isFinite(draft.futureMonths)) {
        draft.retirementMonth = addMonths(indexToMonth(currentMonthIndex()), draft.futureMonths);
      }
    }
    return draft;
  } catch {
    return defaultInputs();
  }
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  suffix,
  hint,
  readOnly = false,
  labelAction,
}: {
  id: keyof PensionInputs;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  suffix?: string;
  hint?: string;
  readOnly?: boolean;
  labelAction?: React.ReactNode;
}) {
  const messageId = `${id}-message`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-h-[20px] items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-medium text-[color:var(--ink)]">
          {label}
        </Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error || hint ? messageId : undefined}
          className={`num h-12 rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] pr-14 text-[15px] shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35 ${readOnly ? 'bg-[color:var(--bg-warm)] text-[color:var(--ink-soft)]' : ''} ${error ? 'border-[color:var(--danger)]' : 'hover:border-[color:var(--ink-faint)]'}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] text-[color:var(--ink-faint)]">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={messageId} className="text-[12px] leading-relaxed text-[color:var(--danger)]">{error}</p>
      ) : hint ? (
        <p id={messageId} className="text-[12px] leading-relaxed text-[color:var(--ink-faint)]">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold tracking-wide text-[color:var(--ink)]">{title}</h2>
      {description && <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ink-faint)]">{description}</p>}
    </div>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<ThemePreference>(loadTheme);
  const [initialValues] = useState<PensionInputs>(loadDraft);
  const [values, setValues] = useState<PensionInputs>(initialValues);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [yearsAuto, setYearsAuto] = useState(
    () => yearsFromMonths(initialValues.paidMonths, initialValues.futureMonths) === initialValues.totalYears,
  );
  const [futureMonthsAuto, setFutureMonthsAuto] = useState(() => {
    const distance = monthsBetween(indexToMonth(currentMonthIndex()), initialValues.retirementMonth);
    return !initialValues.futureMonthsCustomized && initialValues.futureMonths === distance;
  });
  const [errors, setErrors] = useState<Errors>({});
  const [calculation, setCalculation] = useState<CalculationSnapshot | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(
    initialValues.city === 'other' || !Number.isFinite(CITY_PROFILES[initialValues.city].pensionBase),
  );
  const profile = CITY_PROFILES[values.city];
  const needsLocationParameters = values.city === 'other' || !Number.isFinite(profile.pensionBase);
  const statutory = useMemo(
    () => statutoryRetirement(values.workerType, values.birthMonth),
    [values.workerType, values.birthMonth],
  );
  const retirementAgeMonths = monthsBetween(values.birthMonth, values.retirementMonth);
  const monthsToRetire = monthsBetween(indexToMonth(currentMonthIndex()), values.retirementMonth);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* 隐私模式下仍可在当前页面切换主题 */
    }
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  // 草稿仅保存在当前浏览器本地。
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      /* 隐私模式等场景下写入失败可忽略 */
    }
  }, [values]);

  const display = useMemo(() => {
    const next: Record<string, string> = {};
    for (const key of NUMBER_KEYS) {
      const value = values[key];
      next[key] = texts[key] ?? (Number.isNaN(value) ? '' : String(value));
    }
    return next;
  }, [values, texts]);

  const dirty = useMemo(
    () => calculation !== null && JSON.stringify(values) !== JSON.stringify(calculation.inputs),
    [values, calculation],
  );

  const setNum = (key: keyof PensionInputs) => (raw: string) => {
    const parsed = raw.trim() === '' ? NaN : Number(raw);
    const next = { ...values, [key]: parsed };
    const nextTexts = { ...texts, [key]: raw };

    if (key === 'totalYears') setYearsAuto(false);
    if (key === 'futureMonths') {
      next.futureMonthsCustomized = true;
      setFutureMonthsAuto(false);
    }
    if (yearsAuto && (key === 'paidMonths' || key === 'futureMonths')) {
      const synced = yearsFromMonths(next.paidMonths, next.futureMonths);
      if (Number.isFinite(synced) && synced > 0) {
        next.totalYears = synced;
        nextTexts.totalYears = String(synced);
      }
    }
    setTexts(nextTexts);
    setValues(next);
  };

  const setVal = <K extends keyof PensionInputs>(key: K, val: PensionInputs[K]) => {
    setValues((current) => ({ ...current, [key]: val }));
  };

  const toggleYearsMode = () => {
    if (yearsAuto) {
      setYearsAuto(false);
      return;
    }
    const synced = yearsFromMonths(values.paidMonths, values.futureMonths);
    if (Number.isFinite(synced) && synced > 0) {
      setValues((current) => ({ ...current, totalYears: synced }));
      setTexts((current) => ({ ...current, totalYears: String(synced) }));
    }
    setYearsAuto(true);
  };

  const handleCity = (city: CityId) => {
    if (city === values.city) return;
    const nextProfile = CITY_PROFILES[city];
    const nextBase = city !== 'other' && Number.isFinite(values.baseAmount)
      ? Math.min(nextProfile.maxBase, Math.max(nextProfile.minBase, values.baseAmount))
      : values.baseAmount;
    setValues((current) => ({
      ...current,
      city,
      baseAmount: nextBase,
      contributionReference: nextProfile.contributionReference,
      pensionBase: nextProfile.pensionBase,
    }));
    setTexts((current) => ({
      ...current,
      baseAmount: String(nextBase),
      contributionReference: Number.isFinite(nextProfile.contributionReference) ? String(nextProfile.contributionReference) : '',
      pensionBase: Number.isFinite(nextProfile.pensionBase) ? String(nextProfile.pensionBase) : '',
    }));
    setErrors((current) => ({
      ...current,
      baseAmount: undefined,
      contributionReference: undefined,
      pensionBase: undefined,
    }));
    if (city === 'other' || !Number.isFinite(nextProfile.pensionBase)) setAdvancedOpen(true);
  };

  const openCustomParameters = () => {
    setAdvancedOpen(true);
    requestAnimationFrame(() => {
      document.getElementById('advanced-parameters')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(values.city === 'other' ? 'contributionReference' : 'pensionBase')?.focus({ preventScroll: true });
    });
  };

  const applyRetirement = (patch: Partial<PensionInputs>, rawAge?: string) => {
    const next = { ...values, ...patch };
    if (next.retirementMode === 'statutory') {
      const automatic = statutoryRetirement(next.workerType, next.birthMonth);
      if (automatic) next.retirementMonth = automatic.retirementMonth;
    }

    const distance = monthsBetween(indexToMonth(currentMonthIndex()), next.retirementMonth);
    if (futureMonthsAuto && Number.isFinite(distance) && distance >= 0 && distance <= 720) {
      next.futureMonths = distance;
    }
    if (yearsAuto) {
      const synced = yearsFromMonths(next.paidMonths, next.futureMonths);
      if (Number.isFinite(synced) && synced > 0) next.totalYears = synced;
    }
    const ageMonths = monthsBetween(next.birthMonth, next.retirementMonth);
    const payoutMonths = estimatePayoutMonths(ageMonths);
    if (Number.isFinite(payoutMonths)) next.payoutMonths = payoutMonths;

    setValues(next);
    setTexts((current) => ({
      ...current,
      ...(rawAge !== undefined ? { currentAge: rawAge } : {}),
      ...(futureMonthsAuto ? { futureMonths: String(next.futureMonths) } : {}),
      totalYears: String(next.totalYears),
      payoutMonths: String(next.payoutMonths),
    }));
    setErrors((current) => ({
      ...current,
      currentAge: undefined,
      birthMonth: undefined,
      workerType: undefined,
      retirementMonth: undefined,
      futureMonths: undefined,
      payoutMonths: undefined,
    }));
  };

  const handleCurrentAge = (raw: string) => {
    const age = raw.trim() === '' ? NaN : Number(raw);
    if (Number.isInteger(age) && age >= 0 && age <= 110) {
      const birthMonth = indexToMonth(currentMonthIndex() - age * 12);
      applyRetirement({ currentAge: age, birthMonth }, raw);
    } else {
      setValues((current) => ({ ...current, currentAge: age }));
      setTexts((current) => ({ ...current, currentAge: raw }));
    }
  };

  const handleBirthMonth = (birthMonth: string) => {
    const age = completedAge(birthMonth);
    applyRetirement({
      birthMonth,
      currentAge: Number.isFinite(age) ? age : values.currentAge,
    });
  };

  const handleWorkerType = (workerType: WorkerType) => {
    applyRetirement({ workerType });
  };

  const handleRetirementMode = (retirementMode: RetirementMode) => {
    applyRetirement({ retirementMode });
  };

  const handleCalc = () => {
    const nextErrors = validateInputs(values, profile);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.contributionReference || nextErrors.pensionBase || nextErrors.interestRate || nextErrors.inflationRate || nextErrors.pastIndex || nextErrors.beijingBreakMonths) setAdvancedOpen(true);
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first?.focus({ preventScroll: true });
      });
      return;
    }
    setCalculation({ inputs: { ...values }, result: calcPension(values, profile) });
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        document.getElementById('result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleReset = () => {
    const defaults = defaultInputs(values.city);
    setValues(defaults);
    setTexts({});
    setYearsAuto(true);
    setFutureMonthsAuto(true);
    setErrors({});
    setCalculation(null);
    setAdvancedOpen(needsLocationParameters);
    try {
      localStorage.removeItem(DRAFT_KEY);
      for (const key of LEGACY_DRAFT_KEYS) localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };

  const advancedHasError = !!(errors.contributionReference || errors.pensionBase || errors.interestRate || errors.inflationRate || errors.pastIndex || errors.beijingBreakMonths);
  const errorCount = Object.keys(errors).length;

  return (
    <div className="min-h-100dvh bg-[color:var(--bg)] text-[color:var(--ink)]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:pt-12">
        <header className="mb-8 md:mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="num text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--pine)]">
                Nationwide · Pension Estimator
              </p>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--ink-faint)]">
                <ShieldCheck size={14} aria-hidden="true" /> 本地计算，参数不上传
              </span>
            </div>
            <Select value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
              <SelectTrigger id="theme-mode" aria-label="显示主题" className="h-11 w-[142px] rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] text-[13px] shadow-none focus:ring-2 focus:ring-[color:var(--pine)]/35">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system" className="min-h-[44px]">
                  <span className="flex items-center gap-2"><Monitor size={15} aria-hidden="true" />跟随系统</span>
                </SelectItem>
                <SelectItem value="light" className="min-h-[44px]">
                  <span className="flex items-center gap-2"><Sun size={15} aria-hidden="true" />浅色模式</span>
                </SelectItem>
                <SelectItem value="dark" className="min-h-[44px]">
                  <span className="flex items-center gap-2"><Moon size={15} aria-hidden="true" />深色模式</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-tight md:text-[38px]">
            预期养老金计算器
          </h1>
          <p className="mt-3 max-w-[65ch] text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
            常用城市使用专用参数，23 个省级地区的其他城市可选择省级默认参数；也可手动填写退休地参数，并同时查看名义养老金与当前购买力。
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:gap-8">
          <form
            className="flex min-w-0 flex-col gap-7 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-5 sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              handleCalc();
            }}
            noValidate
          >
            <section className="flex flex-col gap-4" aria-labelledby="sec-city">
              <div id="sec-city">
                <SectionTitle title="在哪里参保" description="城市或省份任选一个即可；个人缴费信息在切换后保留" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] sm:items-center">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[color:var(--pine)]" aria-hidden="true" />
                  <Select value={values.city} onValueChange={(city) => handleCity(city as CityId)}>
                    <SelectTrigger id="city" aria-label="参保城市" className="h-12 w-full rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] pl-10 text-[15px] shadow-none focus:ring-2 focus:ring-[color:var(--pine)]/35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectGroup>
                        <SelectLabel>城市专用参数</SelectLabel>
                        {CITY_ORDER.map((city) => (
                          <SelectItem key={city} value={city} className="min-h-[44px]">
                            {CITY_PROFILES[city].name} · {CITY_PROFILES[city].province}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>省级通用参数（23 个省级地区）</SelectLabel>
                        {PROVINCE_ORDER.map((city) => (
                          <SelectItem key={city} value={city} className="min-h-[44px]">
                            {CITY_PROFILES[city].name} · {CITY_PROFILES[city].province}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>自定义</SelectLabel>
                        <SelectItem value="other" className="min-h-[44px]">
                          其他城市 · 手动填写参数
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-[12px] leading-relaxed text-[color:var(--ink-faint)]">
                  <p>{profile.parameterNote}</p>
                  {needsLocationParameters && (
                    <button
                      type="button"
                      onClick={openCustomParameters}
                      className="mt-1 min-h-[36px] font-medium text-[color:var(--pine)] underline decoration-[color:var(--pine)]/30 underline-offset-4 hover:decoration-[color:var(--pine)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35"
                    >
                      {values.city === 'other' ? '填写退休地参数' : '补充退休地计发基数'} →
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div className="h-px bg-[color:var(--line)]" />

            <section className="flex flex-col gap-5" aria-labelledby="sec-now">
              <div id="sec-now">
                <SectionTitle title="现在有多少" description="以当前社保个人账户信息为准" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="accountBalance"
                  label="个人账户累计储存额"
                  value={display.accountBalance}
                  onChange={setNum('accountBalance')}
                  error={errors.accountBalance}
                  suffix="元"
                />
                <NumberField
                  id="paidMonths"
                  label="已缴费月数"
                  value={display.paidMonths}
                  onChange={setNum('paidMonths')}
                  error={errors.paidMonths}
                  suffix="个月"
                  hint={Number.isFinite(values.paidMonths) ? `约合 ${(values.paidMonths / 12).toFixed(1)} 年` : undefined}
                />
              </div>
            </section>

            <div className="h-px bg-[color:var(--line)]" />

            <section className="flex flex-col gap-5" aria-labelledby="sec-future">
              <div id="sec-future">
                <SectionTitle title="以后怎么缴" description="后续缴费按当前基数与月数静态估算" />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[13px] font-medium text-[color:var(--ink)]">后续缴费方式</Label>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="后续缴费方式">
                  {(
                    [
                      ['base', '固定缴费基数', '每月按固定金额'],
                      ['ratio', '按比例缴费', '按当地缴费指数基准档位'],
                    ] as [FutureMode, string, string][]
                  ).map(([mode, title, desc]) => {
                    const selected = values.futureMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setVal('futureMode', mode)}
                        className={`relative min-h-[64px] rounded-lg border px-3.5 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/40 ${
                          selected
                            ? 'border-[color:var(--pine)] bg-[color:var(--pine-soft)]'
                            : 'border-[color:var(--line)] bg-[color:var(--surface)] hover:border-[color:var(--ink-faint)]'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2 text-[13px] font-medium">
                          {title}
                          {selected && <Check size={15} className="shrink-0 text-[color:var(--pine)]" aria-hidden="true" />}
                        </span>
                        <span className="mt-1 block text-[11px] text-[color:var(--ink-faint)]">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {values.futureMode === 'base' ? (
                  <NumberField
                    id="baseAmount"
                    label="后续月缴费基数"
                    value={display.baseAmount}
                    onChange={setNum('baseAmount')}
                    error={errors.baseAmount}
                    suffix="元/月"
                    hint={values.city === 'other'
                      ? '按退休地实际缴费基数填写，8% 计入个人账户；不套用预设城市的上下限'
                      : `${profile.name}当前范围为 ${profile.minBase.toLocaleString('zh-CN')}–${profile.maxBase.toLocaleString('zh-CN')} 元/月，8% 计入个人账户`}
                  />
                ) : (
                  <NumberField
                    id="ratioPct"
                    label="缴费比例"
                    value={display.ratioPct}
                    onChange={setNum('ratioPct')}
                    error={errors.ratioPct}
                    suffix="%"
                    hint={`对应基数 ¥${Number.isFinite(values.contributionReference) && Number.isFinite(values.ratioPct) ? Math.round(values.contributionReference * values.ratioPct / 100).toLocaleString('zh-CN') : '—'}/月`}
                  />
                )}
                <NumberField
                  id="futureMonths"
                  label="后续缴费月数"
                  value={display.futureMonths}
                  onChange={setNum('futureMonths')}
                  error={errors.futureMonths}
                  suffix="个月"
                  hint={Number.isFinite(values.futureMonths)
                    ? futureMonthsAuto
                      ? `默认缴至退休（距退休 ${Number.isFinite(monthsToRetire) ? monthsToRetire : '—'} 个月）；可按实际继续缴费月数修改`
                      : '已手动设置；修改年龄、生日或退休时间不会自动覆盖'
                    : undefined}
                />
              </div>

              <NumberField
                id="totalYears"
                label="预期累计缴费年限"
                value={display.totalYears}
                onChange={setNum('totalYears')}
                error={errors.totalYears}
                suffix="年"
                readOnly={yearsAuto}
                hint={yearsAuto ? '已缴月数与后续月数变化时自动更新' : '手动年限可包含视同缴费年限；与月数不一致时会提示'}
                labelAction={
                  <button
                    type="button"
                    onClick={toggleYearsMode}
                    className="-my-2 min-h-[44px] rounded px-1.5 text-[12px] font-medium text-[color:var(--pine)] underline decoration-[color:var(--pine)]/30 underline-offset-4 hover:decoration-[color:var(--pine)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35"
                  >
                    {yearsAuto ? '改为手动' : '按缴费月数同步'}
                  </button>
                }
              />
            </section>

            <div className="h-px bg-[color:var(--line)]" />

            <section className="flex flex-col gap-5" aria-labelledby="sec-retire">
              <div id="sec-retire">
                <SectionTitle title="什么时候退休" description="退休年龄变化会自动带入对应计发月数" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="worker-type" className="min-h-[20px] text-[13px] font-medium text-[color:var(--ink)]">性别及职工类别</Label>
                  <Select value={values.workerType} onValueChange={(value) => handleWorkerType(value as WorkerType)}>
                    <SelectTrigger id="worker-type" className="h-12 rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] text-[14px] shadow-none focus:ring-2 focus:ring-[color:var(--pine)]/35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(WORKER_TYPE_LABELS) as WorkerType[]).map((type) => (
                        <SelectItem key={type} value={type} className="min-h-[44px]">{WORKER_TYPE_LABELS[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.workerType && <p className="text-[12px] text-[color:var(--danger)]">{errors.workerType}</p>}
                </div>
                <NumberField
                  id="currentAge"
                  label="当前年龄"
                  value={display.currentAge}
                  onChange={handleCurrentAge}
                  error={errors.currentAge}
                  suffix="岁"
                  hint="快速填写后，请核对左侧类别与下方出生年月"
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="birth-month" className="min-h-[20px] text-[13px] font-medium text-[color:var(--ink)]">出生年月</Label>
                  <Input
                    id="birth-month"
                    type="month"
                    value={values.birthMonth}
                    onChange={(event) => handleBirthMonth(event.target.value)}
                    aria-invalid={!!errors.birthMonth}
                    className={`h-12 rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] text-[15px] shadow-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35 ${errors.birthMonth ? 'border-[color:var(--danger)]' : ''}`}
                  />
                  <p className={`text-[12px] leading-relaxed ${errors.birthMonth ? 'text-[color:var(--danger)]' : 'text-[color:var(--ink-faint)]'}`}>
                    {errors.birthMonth ?? '法定退休按出生年月精确对照，不仅按年龄整数估算'}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="retirement-mode" className="min-h-[20px] text-[13px] font-medium text-[color:var(--ink)]">退休时间方式</Label>
                  <Select value={values.retirementMode} onValueChange={(value) => handleRetirementMode(value as RetirementMode)}>
                    <SelectTrigger id="retirement-mode" className="h-12 rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] text-[14px] shadow-none focus:ring-2 focus:ring-[color:var(--pine)]/35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="statutory" className="min-h-[44px]">法定退休 · 自动计算</SelectItem>
                      <SelectItem value="manual" className="min-h-[44px]">弹性／特殊退休 · 手动选择</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {values.retirementMode === 'statutory' ? (
                <div className="rounded-xl border border-[color:var(--pine)]/25 bg-[color:var(--pine-soft)] p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[11px] text-[color:var(--ink-faint)]">预计法定退休</p>
                      <p className="num mt-1 text-[15px] font-semibold text-[color:var(--pine)]">{formatMonth(values.retirementMonth)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--ink-faint)]">法定退休年龄</p>
                      <p className="mt-1 text-[15px] font-semibold text-[color:var(--pine)]">{formatAge(retirementAgeMonths)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--ink-faint)]">较原法定年龄</p>
                      <p className="num mt-1 text-[15px] font-semibold text-[color:var(--pine)]">延迟 {statutory?.delayMonths ?? '—'} 个月</p>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-[color:var(--pine)]/15 pt-3 text-[11px] leading-relaxed text-[color:var(--ink-soft)]">
                    按渐进式延迟退休对照表计算；弹性退休、特殊工种及其他国家另有规定的情形请改用手动模式。
                  </p>
                  {errors.retirementMonth && (
                    <p role="alert" className="mt-2 text-[12px] leading-relaxed text-[color:var(--danger)]">
                      {errors.retirementMonth}；如已退休或需特殊办理，请改用手动模式。
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="manual-retirement-month" className="min-h-[20px] text-[13px] font-medium text-[color:var(--ink)]">实际退休年月</Label>
                  <Input
                    id="manual-retirement-month"
                    type="month"
                    value={values.retirementMonth}
                    onChange={(event) => applyRetirement({ retirementMonth: event.target.value })}
                    aria-invalid={!!errors.retirementMonth}
                    className={`h-12 rounded-lg border-[color:var(--line)] bg-[color:var(--surface)] text-[15px] shadow-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35 ${errors.retirementMonth ? 'border-[color:var(--danger)]' : ''}`}
                  />
                  <p className={`text-[12px] leading-relaxed ${errors.retirementMonth ? 'text-[color:var(--danger)]' : 'text-[color:var(--ink-faint)]'}`}>
                    {errors.retirementMonth ?? '用于弹性提前、弹性延迟或特殊工种；退休年龄、后续缴费月数与通胀折算会同步更新'}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="payoutMonths"
                  label="个人账户计发月数"
                  value={display.payoutMonths}
                  onChange={setNum('payoutMonths')}
                  error={errors.payoutMonths}
                  suffix="个月"
                  hint="整数年龄查表；非整数年龄按相邻档位线性折算，仅为估算，可按当地核定修正"
                />
                <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-warm)] px-4 py-3">
                  <p className="text-[12px] text-[color:var(--ink-faint)]">当前退休时间</p>
                  <p className="num mt-1 text-[15px] font-medium">{formatMonth(values.retirementMonth)} · {formatAge(retirementAgeMonths)}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--ink-faint)]">
                    距退休 {Number.isFinite(monthsToRetire) ? monthsToRetire : '—'} 个月，通胀按这一时间折算
                  </p>
                </div>
              </div>

              <details
                id="advanced-parameters"
                open={advancedOpen || advancedHasError}
                onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
                className="group scroll-mt-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]"
              >
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-[13px] font-medium">
                      {values.city === 'other'
                        ? '退休地计发参数（两项基准必填）'
                        : needsLocationParameters ? `${profile.name}计发参数（计发基数必填）` : '高级计发参数'}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[color:var(--ink-faint)]">退休地基准、记账利率、历史指数与通胀假设</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {advancedHasError && <span className="text-[11px] text-[color:var(--danger)]">需修正</span>}
                    <ChevronDown size={17} className="text-[color:var(--ink-faint)] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-[color:var(--line)] p-4 sm:grid-cols-2">
                  <NumberField
                    id="contributionReference"
                    label={values.city === 'other' ? '退休地缴费指数基准' : `${profile.name}缴费指数基准`}
                    value={display.contributionReference}
                    onChange={setNum('contributionReference')}
                    error={errors.contributionReference}
                    suffix="元/月"
                    hint={profile.contributionYear}
                  />
                  <NumberField
                    id="pensionBase"
                    label={values.city === 'other' ? '退休地养老金计发基数' : `${profile.name}养老金计发基数`}
                    value={display.pensionBase}
                    onChange={setNum('pensionBase')}
                    error={errors.pensionBase}
                    suffix="元/月"
                    hint={profile.pensionBaseYear}
                  />
                  <NumberField
                    id="interestRate"
                    label="个人账户记账利率假设"
                    value={display.interestRate}
                    onChange={setNum('interestRate')}
                    error={errors.interestRate}
                    suffix="%/年"
                    hint="用于现有余额与后续缴费的复利滚存"
                  />
                  <NumberField
                    id="inflationRate"
                    label="退休前年均通胀假设"
                    value={display.inflationRate}
                    onChange={setNum('inflationRate')}
                    error={errors.inflationRate}
                    suffix="%/年"
                    hint="默认 1.5%，仅折算当前购买力；可填 0 或负值，不改变名义养老金"
                  />
                  <NumberField
                    id="pastIndex"
                    label="已缴期间平均缴费指数"
                    value={display.pastIndex}
                    onChange={setNum('pastIndex')}
                    error={errors.pastIndex}
                    hint={`按${values.city === 'other' ? '退休地' : profile.name}规则处理后的历史平均指数`}
                  />
                  {values.city === 'beijing' && (
                    <NumberField
                      id="beijingBreakMonths"
                      label="北京N应缴断缴月数"
                      value={display.beijingBreakMonths}
                      onChange={setNum('beijingBreakMonths')}
                      error={errors.beijingBreakMonths}
                      suffix="个月"
                      hint="无断缴填0；断缴期以0指数进入分母，不增加缴费年限或账户本金；领取失业保险待遇等可扣除期间不要填入"
                    />
                  )}
                  <p className="text-[11px] leading-relaxed text-[color:var(--ink-faint)] sm:col-span-2">
                    {profile.formulaNote} 两项基准用途不同，请分别按退休地口径填写；未来退休可按个人假设调整。通胀仅用于退休前购买力折算，不叠加到工资、计发基数或养老金上。
                  </p>
                </div>
              </details>
            </section>

            <div>
              {errorCount > 0 && (
                <p role="alert" className="mb-3 flex items-center gap-2 text-[13px] text-[color:var(--danger)]">
                  <AlertCircle size={16} aria-hidden="true" /> 有 {errorCount} 项参数需要修正后再计算
                </p>
              )}
              <div className="flex flex-col gap-2.5">
                <Button
                  type="submit"
                  size="lg"
                  className="h-16 w-full rounded-xl bg-[color:var(--pine)] text-[18px] font-semibold tracking-wide text-[color:var(--on-accent)] shadow-md shadow-[color:var(--pine)]/15 hover:bg-[color:var(--pine-deep)] focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/40 focus-visible:ring-offset-2 active:scale-[0.99] sm:h-[68px] sm:text-[19px]"
                >
                  <Calculator className="!h-5 !w-5" aria-hidden="true" />
                  {dirty ? '按新参数重新计算' : calculation ? '重新计算养老金' : '计算养老金'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleReset}
                  className="h-11 w-full rounded-lg text-[13px] text-[color:var(--ink-soft)] hover:bg-[color:var(--bg-warm)] hover:text-[color:var(--ink)]"
                >
                  <RotateCcw size={15} aria-hidden="true" /> 恢复默认参数
                </Button>
              </div>
            </div>
          </form>

          <aside
            id="result-panel"
            aria-label="估算结果"
            className="min-w-0 scroll-mt-4 rounded-2xl bg-[color:var(--result-bg)] p-5 text-[color:var(--paper)] sm:p-6 lg:sticky lg:top-6"
          >
            <ResultPanel snapshot={calculation} dirty={dirty} onRecalculate={handleCalc} />
          </aside>
        </div>

        <section className="mt-10 border-t border-[color:var(--line)] pt-6" aria-labelledby="policy-links-title">
          <div className="grid gap-5 md:grid-cols-[190px_minmax(0,1fr)] md:gap-8">
            <div>
              <h2 id="policy-links-title" className="text-[15px] font-semibold text-[color:var(--ink)]">政策依据与官方查询</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-faint)]">
                国家层面政策原文与官方服务入口，均在新窗口打开。地方参数仍以退休地最新通知为准。
              </p>
            </div>
            <ul className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-[44px] items-start gap-2 text-[13px] font-medium leading-relaxed text-[color:var(--pine)] underline decoration-[color:var(--pine)]/30 underline-offset-4 hover:decoration-[color:var(--pine)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pine)]/35"
                  >
                    <span>{link.title}</span>
                    <ExternalLink size={14} className="mt-1 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </a>
                  <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ink-soft)]">{link.meta}</p>
                  <p className="mt-1 text-[11px] text-[color:var(--ink-faint)]">来源：{link.source}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mt-8 border-t border-[color:var(--line)] pt-5 text-[12px] leading-relaxed text-[color:var(--ink-faint)]">
          本工具按所选城市的企业职工养老保险通用两项公式静态估算，不含过渡性养老金及地方补充待遇，也未预测未来工资与政策变化。法定退休年月按渐进式延迟退休对照表估算；弹性退休、特殊工种及其他另有规定的情形请手动选择。非整数退休年龄的计发月数按相邻整数档位线性折算，仅供测算。部分城市最新计发基数尚未公布时采用已标注年份的参考值；省级选项用于快速估算，地市特殊口径请手动修正，暂不预置内蒙古、西藏、宁夏、新疆参数。当前购买力按用户设定的退休前年均通胀率折算，不代表收益或待遇调整预测。领取资格及实际待遇以退休时当地社保经办机构核定为准。参数草稿只保存在当前浏览器，清除浏览器数据会丢失。
        </footer>
      </div>
    </div>
  );
}
