import { useState } from 'react';
import { Sparkles, ArrowRight, Heart, MapPin } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { Availability, Badge, Button, Check, Chip, MatchBadge, Modal, Rating, Segmented, Slider, Toggle, ProgressSteps } from '../components/ui';
import { Logo, LogoMark } from '../components/Logo';
import { ExperienceCard, CompactExperience } from '../components/ExperienceCard';
import { byId } from '../data/experiences';
import { buildPlan } from '../lib/engine';
import { ItineraryTimeline } from '../components/ItineraryTimeline';

const COLORS = [
  ['Ink 950', '#0B1433', 'Text, primary dark surfaces'],
  ['Marigold 500', '#F2711C', 'Brand, primary actions'],
  ['Rani 500', '#E0397B', 'AI gradient end'],
  ['Leaf 500', '#12A383', 'Success, match checks'],
  ['Ink 50', '#F6F7FB', 'App background'],
  ['Amber 500', '#F59E0B', 'Warnings, low seats'],
];

export default function DesignSystem() {
  const { toast, trip } = useApp();
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [v, setV] = useState(60);
  const [modal, setModal] = useState(false);
  return (
    <div className="space-y-10">
      <div>
        <div className="eyebrow">Anvesha design system</div>
        <h1 className="mt-1 text-[34px] font-extrabold tracking-tight">Components & tokens</h1>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="eyebrow mb-4">Brand</div>
          <div className="flex items-center gap-6">
            <LogoMark size={64} />
            <Logo />
            <div className="rounded-2xl bg-ink-950 px-4 py-3">
              <Logo light />
            </div>
          </div>
          <p className="mt-4 text-[13.5px] text-ink-600">A location pin with a four-point spark: a place, and something to discover in it. The marigold-to-rani gradient marks anything the AI did for you.</p>
        </div>
        <div className="card p-6">
          <div className="eyebrow mb-4">Type</div>
          <div className="font-display text-[40px] font-extrabold leading-none tracking-tight">Bricolage Grotesque</div>
          <div className="mt-1 text-[13px] text-ink-500">Display · headings · numbers</div>
          <div className="mt-4 text-[18px] font-semibold">Plus Jakarta Sans</div>
          <div className="text-[15px] text-ink-700">Body text is set at 14–16 px for comfortable reading on phones.</div>
          <div className="eyebrow mt-3">Small metadata label</div>
        </div>
      </section>

      <section className="card p-6">
        <div className="eyebrow mb-4">Colour</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map(([n, hex, use]) => (
            <div key={n}>
              <div className="h-16 rounded-2xl ring-1 ring-ink-100" style={{ background: hex }} />
              <div className="mt-2 text-[13px] font-bold">{n}</div>
              <div className="font-mono text-[11.5px] text-ink-500">{hex}</div>
              <div className="text-[11.5px] text-ink-500">{use}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 h-12 rounded-2xl bg-ai" />
        <div className="mt-1 text-[12px] text-ink-500">AI gradient — only on AI-generated or AI-actionable elements</div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <div className="eyebrow">Buttons</div>
          <div className="flex flex-wrap gap-2">
            <Button>Book Experience</Button>
            <Button variant="ai" icon={<Sparkles size={16} />}>
              Ask AI
            </Button>
            <Button variant="dark" iconRight={<ArrowRight size={16} />}>
              View
            </Button>
            <Button variant="outline" icon={<Heart size={15} />}>
              Save
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="eyebrow pt-2">Chips & badges</div>
          <div className="flex flex-wrap gap-2">
            <Chip active>Food</Chip>
            <Chip icon={<MapPin size={14} />}>≤ 2 km</Chip>
            <Chip count={4}>Pending</Chip>
            <Badge tone="brand">Local favourite</Badge>
            <Badge tone="green">Confirmed</Badge>
            <Badge tone="amber">Pending</Badge>
            <Badge tone="red">Cancelled</Badge>
            <Badge tone="dark">Hidden gem</Badge>
          </div>
          <div className="eyebrow pt-2">AI match, rating, availability</div>
          <div className="flex flex-wrap items-center gap-4">
            <MatchBadge score={92} />
            <MatchBadge score={92} variant="ring" />
            <Rating value={4.8} count={328} />
            <Availability left={6} />
            <Availability left={2} />
            <Availability left={0} />
          </div>
          <div className="space-y-1.5">
            <Check>Within budget</Check>
            <Check ok={false}>Outdoor — rain expected at 5 PM</Check>
          </div>
        </div>
        <div className="card space-y-4 p-6">
          <div className="eyebrow">Controls</div>
          <Toggle id="ds-toggle" label="Wheelchair accessible" desc="Toggle" checked={on} onChange={setOn} />
          <Segmented value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Per person' }, { value: 'b', label: 'Total' }]} />
          <Slider id="ds-slider" value={v} min={0} max={100} onChange={setV} marks={['0', '50', '100']} />
          <ProgressSteps steps={['Interests', 'Style', 'Access']} current={1} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toast({ title: 'Toast notification', body: 'Short, specific, actionable', tone: 'ai', action: { label: 'Undo', to: '/design' } })}>
              Show toast
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModal(true)}>
              Open modal
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div>
          <div className="eyebrow mb-3">Experience card</div>
          <ExperienceCard exp={byId('pune-food-walk')} />
        </div>
        <div className="space-y-4">
          <div className="eyebrow">Compact card</div>
          <CompactExperience exp={byId('mitti-pottery')} />
          <div className="eyebrow pt-2">Timeline</div>
          <div className="card p-4">
            <ItineraryTimeline items={buildPlan(['shaniwar-wada-story', 'pune-food-walk'], trip).items} compact highlight={{ 'pune-food-walk': 'new' }} />
          </div>
        </div>
      </section>

      <Modal open={modal} onClose={() => setModal(false)} title="Modal" footer={<Button full onClick={() => setModal(false)}>Got it</Button>}>
        <p className="text-[14px] text-ink-700">Modals slide up as a bottom sheet on phones and centre on larger screens.</p>
      </Modal>
    </div>
  );
}
