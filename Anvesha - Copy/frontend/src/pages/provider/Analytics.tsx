import { useState, type ReactNode } from 'react';
import { Sparkles, TrendingUp, CloudRain, Users, Clock, ArrowUpRight } from 'lucide-react';
import { ProviderLayout } from '../../components/Layouts';
import { AreaChart, BarChart, Donut, Heatmap, HBars } from '../../components/Charts';
import { SERIES, POPULAR, TRAVELER_MIX, PEAK, dayLabel, DEMAND_SIGNALS } from '../../data/provider';
import { byId } from '../../data/experiences';
import { Segmented } from '../../components/ui';
import { inr } from '../../lib/format';
import { useRouter } from '../../router';

export default function Analytics() {
  const [range, setRange] = useState<'7' | '14'>('14');
  const { navigate } = useRouter();
  const n = Number(range);
  const labels = SERIES.days.slice(-n).map((d) => dayLabel(d, { day: 'numeric', month: 'short' }));
  const views = SERIES.views.slice(-n);
  const bookings = SERIES.bookings.slice(-n);
  const revenue = SERIES.revenue.slice(-n);
  const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

  const kpis = [
    ['Views', sum(views).toLocaleString('en-IN'), '+11%'],
    ['Bookings', String(sum(bookings)), '+18%'],
    ['Revenue', inr(sum(revenue)), '+24%'],
    ['Conversion', `${((sum(bookings) / sum(views)) * 100).toFixed(1)}%`, '+0.6 pt'],
  ];

  return (
    <ProviderLayout title="Analytics" actions={<Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} />}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([k, v, d]) => (
          <div key={k} className="rounded-3xl bg-white p-5 shadow-card">
            <div className="text-[13px] font-semibold text-ink-500">{k}</div>
            <div className="mt-1 font-display text-[26px] font-bold text-ink-950 tnum">{v}</div>
            <div className="inline-flex items-center gap-0.5 text-[12px] font-bold text-leaf-600">
              <ArrowUpRight size={13} /> {d} vs previous
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {[
          { icon: Users, t: 'Families are your fastest-growing segment', s: '44% of bookings, up from 31% last month. A 2-hour family package could add ~14 bookings a week.', cta: 'Create package', to: '/provider/create?template=family' },
          { icon: CloudRain, t: 'Rain is coming this week', s: '3 evenings of rain forecast. Travelers searching “indoor” jumped 64%. Consider a covered route or tasting-studio variant.', cta: 'Adjust slots', to: '/provider/availability' },
          { icon: Clock, t: '5–8 PM on weekends sells out', s: 'Saturday 5:30 PM is 93% full two days ahead. Adding a 6:30 PM slot could capture 11 waiting travelers.', cta: 'Add slot', to: '/provider/availability' },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl bg-ink-950 p-5 text-white shadow-card">
            <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wider text-brand-300">
              <Sparkles size={13} /> AI insight
            </div>
            <c.icon size={20} className="mt-3 text-white/80" />
            <div className="mt-2 text-[16px] font-bold leading-snug">{c.t}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{c.s}</p>
            <button onClick={() => navigate(c.to)} className="mt-3 text-[13px] font-bold text-brand-300 hover:text-brand-200">
              {c.cta} →
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Views" sub="Times your experiences were shown to matching travelers">
          <AreaChart data={views} labels={labels} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))} color="#4E6BD6" />
        </ChartCard>
        <ChartCard title="Bookings" sub="Confirmed bookings per day">
          <BarChart data={bookings} labels={labels} format={(v) => String(Math.round(v))} color="#0F9D8A" />
        </ChartCard>
        <ChartCard title="Revenue" sub="Gross booking value, ₹">
          <AreaChart data={revenue} labels={labels} format={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${Math.round(v)}`)} color="#F2711C" />
        </ChartCard>
        <ChartCard title="Popular experiences" sub="Bookings in the last 30 days">
          <HBars items={POPULAR.map((p) => ({ label: byId(p.id).title, value: p.bookings, sub: inr(p.revenue) }))} format={(v) => `${v}`} />
        </ChartCard>
        <ChartCard title="Traveler categories" sub="Share of bookings by group type">
          <Donut items={TRAVELER_MIX} centerLabel="of bookings" />
        </ChartCard>
        <ChartCard title="Peak booking times" sub="When travelers take your slots (last 8 weeks)">
          <Heatmap rows={PEAK.days} cols={PEAK.bands} grid={PEAK.grid} />
        </ChartCard>
      </div>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-500" />
          <h3 className="text-[17px] font-bold">What travelers near you are asking for</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMAND_SIGNALS.map((d) => (
            <div key={d.label} className="rounded-2xl bg-ink-50 p-4">
              <div className="text-[13px] font-semibold text-ink-700">{d.label}</div>
              <div className="mt-1 font-display text-[24px] font-bold text-ink-950 tnum">{d.share}%</div>
              <div className="text-[12px] font-bold text-leaf-600">↑ {d.trend}% this week</div>
            </div>
          ))}
        </div>
      </div>
    </ProviderLayout>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <h3 className="text-[17px] font-bold">{title}</h3>
      <p className="mb-4 text-[12.5px] text-ink-500">{sub}</p>
      {children}
    </section>
  );
}
