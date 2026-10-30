import { AlertTriangle, ArrowRight, Calculator, ChevronDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PensionInputs, PensionResult } from '@/lib/pension';
import { fmtCNY } from '@/lib/pension';
import { CITY_PROFILES } from '@/lib/cities';
import { formatAge, formatMonth } from '@/lib/retirement';

interface Snapshot {
  inputs: PensionInputs;
  result: PensionResult;
}

function fmt2(v: number): string {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function FormulaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[color:var(--hairline)] py-3 last:border-0">
      <p className="mb-1.5 text-[12px] font-medium text-[color:var(--paper)]">{label}</p>
      <p className="num text-[11px] leading-relaxed text-[color:var(--paper-dim)]">{children}</p>
    </div>
  );
}

export default function ResultPanel({
  snapshot,
  dirty,
  onRecalculate,
}: {
  snapshot: Snapshot | null;
  dirty: boolean;
  onRecalculate: () => void;
}) {
  if (!snapshot) {
    return (
      <div className="flex min-h-[360px] flex-col">
        <p className="text-[12px] font-medium text-[color:var(--paper-dim)]">估算结果</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--hairline)] text-[color:var(--gold)]" aria-hidden="true">
            <Calculator size={22} strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-[15px] font-medium text-[color:var(--paper)]">等待你的参数</p>
            <p className="mx-auto mt-2 max-w-[28ch] text-[13px] leading-relaxed text-[color:var(--paper-dim)]">
              点击「计算养老金」后，这里会展示每月金额、两项构成与完整计算过程。
            </p>
          </div>
          <div className="w-full border-t border-[color:var(--hairline)] pt-4 text-[12px] leading-relaxed text-[color:var(--paper-dim)]">
            基础养老金 <span className="mx-2 text-[color:var(--gold)]">+</span> 个人账户养老金
          </div>
        </div>
      </div>
    );
  }

  const { inputs: inp, result } = snapshot;
  const profile = CITY_PROFILES[inp.city];
  const basePct = result.monthly > 0 ? (result.basePension / result.monthly) * 100 : 0;
  const inflationTerm = inp.inflationRate < 0 ? `(${inp.inflationRate}%)` : `${inp.inflationRate}%`;
  const chartData = result.growth.map((point) => ({
    year: point.year === 0 ? '现在' : `第${point.year}年`,
    余额: Math.round(point.balance),
  }));

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <div>
        <div className="flex min-h-[24px] items-center justify-between gap-3">
          <p className="text-[12px] font-medium text-[color:var(--paper-dim)]">估算结果</p>
          {dirty && (
            <span className="rounded-full border border-[color:var(--gold)]/40 px-2.5 py-1 text-[11px] text-[color:var(--gold)]">
              参数已修改
            </span>
          )}
        </div>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--gold)]">
          预计每月基本养老金 · 名义金额
        </p>
        <p className="num mt-2 flex items-baseline gap-2 leading-none text-[color:var(--paper)]">
          <span className="text-[24px] font-medium">¥</span>
          <span className="text-[46px] font-semibold tracking-[-0.04em]">{fmtCNY(result.monthly)}</span>
          <span className="text-[13px] font-normal text-[color:var(--paper-dim)]">/ 月</span>
        </p>
        <p className="mt-3 text-[12px] text-[color:var(--paper-dim)]">
          {inp.city === 'other' ? '按退休地手动参数静态估算' : `按${profile.name}参数静态估算`} · 不含过渡性养老金及地方补充待遇
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[color:var(--hairline)] px-3.5 py-3">
          <div>
            <p className="text-[11px] text-[color:var(--paper-dim)]">{inp.retirementMode === 'statutory' ? '预计法定退休' : '手动设定退休'}</p>
            <p className="num mt-1 text-[14px] font-medium text-[color:var(--paper)]">{formatMonth(inp.retirementMonth)}</p>
          </div>
          <div className="border-l border-[color:var(--hairline)] pl-3.5">
            <p className="text-[11px] text-[color:var(--paper-dim)]">届时年龄</p>
            <p className="mt-1 text-[14px] font-medium text-[color:var(--paper)]">{formatAge(result.retirementAgeMonths)}</p>
          </div>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={onRecalculate}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[color:var(--gold)]/45 px-3 text-[12px] font-medium text-[color:var(--gold)] transition-colors hover:bg-[color:var(--gold)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/50"
          >
            按新参数更新结果 <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <section id="real-pension" className="rounded-xl border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/[0.07] p-4" aria-labelledby="real-pension-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="real-pension-title" className="text-[12px] font-medium text-[color:var(--gold)]">相当于现在的购买力</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--paper-dim)]">
              距退休 {result.monthsToRetire} 个月（{result.yearsToRetire.toFixed(1)} 年） · 年通胀假设 {inp.inflationRate}%
            </p>
          </div>
          <p className="num shrink-0 text-right leading-none">
            <span className="mr-1 text-[15px] text-[color:var(--paper-dim)]">¥</span>
            <span className="text-[28px] font-semibold tracking-[-0.03em]">{fmtCNY(result.realMonthly)}</span>
            <span className="ml-1 text-[11px] font-normal text-[color:var(--paper-dim)]">/月</span>
          </p>
        </div>
        <p className="mt-3 border-t border-[color:var(--hairline)] pt-3 text-[11px] leading-relaxed text-[color:var(--paper-dim)]">
          名义金额 ÷ (1 + {inflationTerm})^{result.yearsToRetire.toFixed(2)}；约相当于现在每年 ¥{fmtCNY(result.realYearly)} 的购买力。
        </p>
      </section>

      <div className="grid grid-cols-2 border-y border-[color:var(--hairline)] py-4">
        <div>
          <p className="text-[11px] text-[color:var(--paper-dim)]">名义金额 · 折合每年</p>
          <p className="num mt-1 text-[17px] font-medium">¥{fmtCNY(result.yearly)}</p>
        </div>
        <div className="border-l border-[color:var(--hairline)] pl-5">
          <p className="text-[11px] text-[color:var(--paper-dim)]">相对后续缴费基数</p>
          <p className="num mt-1 text-[17px] font-medium">
            {result.replacementRate === null ? '—' : `${(result.replacementRate * 100).toFixed(1)}%`}
          </p>
        </div>
      </div>

      {(result.belowCommonMinYears || result.yearsMismatch) && (
        <div className="flex flex-col gap-2.5" role="note">
          {result.belowCommonMinYears && (
            <p className="flex gap-2 text-[12px] leading-relaxed text-[color:var(--gold)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              预计 {result.retirementYear} 年退休，对应最低缴费年限为 {result.minRequiredYears} 年；当前 {inp.totalYears} 年不足，可能不满足按月领取条件。以下仅为公式测算。
            </p>
          )}
          {result.yearsMismatch && (
            <p className="flex gap-2 text-[12px] leading-relaxed text-[color:var(--gold)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              缴费年限 {inp.totalYears} 年与缴费月数合计 {(result.totalMonths / 12).toFixed(2)} 年不一致：基础养老金按前者计算，平均指数按月数加权，请确认。
            </p>
          )}
        </div>
      )}

      <section aria-labelledby="pension-breakdown">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="pension-breakdown" className="text-[13px] font-medium">养老金构成</h2>
          <span className="text-[11px] text-[color:var(--paper-dim)]">每月</span>
        </div>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-[color:var(--paper)]/10"
          role="img"
          aria-label={`基础养老金占比 ${basePct.toFixed(1)}%，个人账户养老金占比 ${(100 - basePct).toFixed(1)}%`}
        >
          <div className="h-full bg-[color:var(--gold)]" style={{ width: `${basePct}%` }} />
          <div className="h-full bg-[color:var(--pine-bright)]" style={{ width: `${100 - basePct}%` }} />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[12px] text-[color:var(--paper-dim)]">
              <i className="h-2 w-2 rounded-[2px] bg-[color:var(--gold)]" aria-hidden="true" /> 基础养老金
            </span>
            <span className="text-right">
              <b className="num text-[16px] font-medium text-[color:var(--paper)]">¥{fmtCNY(result.basePension)}</b>
              <span className="num ml-2 text-[11px] text-[color:var(--paper-dim)]">{basePct.toFixed(0)}%</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[12px] text-[color:var(--paper-dim)]">
              <i className="h-2 w-2 rounded-[2px] bg-[color:var(--pine-bright)]" aria-hidden="true" /> 个人账户养老金
            </span>
            <span className="text-right">
              <b className="num text-[16px] font-medium text-[color:var(--paper)]">¥{fmtCNY(result.personalPension)}</b>
              <span className="num ml-2 text-[11px] text-[color:var(--paper-dim)]">{(100 - basePct).toFixed(0)}%</span>
            </span>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--hairline)] pt-5" aria-labelledby="account-summary">
        <div className="flex items-end justify-between gap-3">
          <h2 id="account-summary" className="text-[13px] font-medium">退休时个人账户</h2>
          <p className="num text-[19px] font-medium">¥{fmtCNY(result.accountFinal)}</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] leading-relaxed text-[color:var(--paper-dim)]">当前余额</p>
            <p className="num mt-1 text-[13px]">¥{fmtCNY(inp.accountBalance)}</p>
          </div>
          <div>
            <p className="text-[11px] leading-relaxed text-[color:var(--paper-dim)]">后续计入本金</p>
            <p className="num mt-1 text-[13px]">¥{fmtCNY(result.totalContribution)}</p>
          </div>
          <div>
            <p className="text-[11px] leading-relaxed text-[color:var(--paper-dim)]">利息估算</p>
            <p className="num mt-1 text-[13px]">¥{fmtCNY(result.interestEarned)}</p>
          </div>
        </div>
      </section>

      {chartData.length > 1 && (
        <section aria-labelledby="growth-title">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="growth-title" className="text-[12px] font-medium text-[color:var(--paper-dim)]">个人账户余额增长</h2>
            <span className="text-[11px] text-[color:var(--paper-dim)]">含记账利息</span>
          </div>
          <div className="h-[150px] w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pine-bright)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--pine-bright)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'rgba(244,242,235,0.62)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(value) => [`¥${Number(value).toLocaleString('zh-CN')}`, '账户余额']}
                  contentStyle={{
                    background: '#23211B',
                    border: '1px solid rgba(244,242,235,0.15)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#F4F2EB',
                  }}
                  labelStyle={{ color: 'rgba(244,242,235,0.65)' }}
                />
                <Area type="monotone" dataKey="余额" stroke="var(--pine-bright)" strokeWidth={2} fill="url(#balFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <details className="group border-t border-[color:var(--hairline)] pt-2">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-medium text-[color:var(--paper-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--paper-dim)]/40 [&::-webkit-details-marker]:hidden">
          查看本次计算过程
          <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="pb-1">
          <FormulaRow label="后续每月计入个人账户">
            ¥{fmt2(result.futureBase)} × 8% = ¥{fmt2(result.monthlyContribution)}
          </FormulaRow>
          <FormulaRow label={inp.city === 'beijing' && inp.beijingBreakMonths > 0 ? '北京实际缴费工资指数（含N应缴断缴期）' : '平均缴费指数'}>
            ({inp.paidMonths} × {inp.pastIndex} + {inp.futureMonths} × {result.futureIndex.toFixed(4)}
            {result.deemedMonths > 0 ? ` + ${result.deemedMonths} × 1（视同）` : ''}) ÷ {result.indexDenominatorMonths} = {result.avgIndex.toFixed(6)}
          </FormulaRow>
          {inp.city === 'beijing' && inp.beijingBreakMonths > 0 && (
            <FormulaRow label="北京N应缴分母">
              实际缴费 {result.totalMonths} 个月{result.deemedMonths > 0 ? ` + 视同缴费 ${result.deemedMonths} 个月` : ''} + 断缴 {inp.beijingBreakMonths} 个月（指数按0）= {result.indexDenominatorMonths} 个月；断缴月数不增加缴费年限或账户本金
            </FormulaRow>
          )}
          {profile.rule === 'guangdong' && result.coefficientA < 1 && (
            <FormulaRow label="广东低平均指数修正系数 a">
              {result.avgIndex.toFixed(6)} ÷ 0.6 = {result.coefficientA.toFixed(6)}
            </FormulaRow>
          )}
          <FormulaRow label="基础养老金">
            ¥{fmt2(inp.pensionBase)} × ({result.coefficientA.toFixed(6)} + {result.avgIndex.toFixed(6)}) ÷ 2 × {inp.totalYears} × 1% = ¥{fmt2(result.basePension)}
          </FormulaRow>
          <FormulaRow label="个人账户养老金">
            ¥{fmt2(result.accountFinal)} ÷ {inp.payoutMonths} = ¥{fmt2(result.personalPension)}
          </FormulaRow>
          <FormulaRow label="折算为当前购买力">
            ¥{fmt2(result.monthly)} ÷ (1 + {inflationTerm})^{result.yearsToRetire.toFixed(2)} = ¥{fmt2(result.realMonthly)} / 月
          </FormulaRow>
        </div>
      </details>

      <p className="text-[11px] leading-relaxed text-[color:var(--paper-dim)]">
        后续缴费视为月末计入，利息按设定年利率折算估算，实际按当地记账规则执行。{profile.formulaNote}
      </p>
    </div>
  );
}
