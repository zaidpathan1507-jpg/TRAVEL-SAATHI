import { useMemo, useState, type ReactNode } from 'react';
import { Sparkles, Wand2, ImagePlus, Clock, MapPin, IndianRupee, Plus, X, Users, Rocket, Star } from 'lucide-react';
import { ProviderLayout } from '../../components/Layouts';
import { useApp } from '../../store/AppStore';
import { useRouter } from '../../router';
import { Button, Chip, Stepper, Toggle, Badge } from '../../components/ui';
import { SceneArt } from '../../components/SceneArt';
import { CATEGORY_META, PROVIDERS } from '../../data/experiences';
import type { Category, Experience } from '../../lib/types';
import { clock, cx, dur, inr } from '../../lib/format';
const SUIT = ['Families', 'Couples', 'Children', 'Solo travelers', 'Elderly'];
const LANGS = ['English', 'Hindi', 'Marathi', 'Gujarati', 'French'];
const TIMES = [8 * 60, 10 * 60, 16 * 60, 16 * 60 + 30, 17 * 60 + 30, 18 * 60 + 30];

export default function CreateExperience() {
  const { path, navigate } = useRouter();
  const { publishExperience, toast } = useApp();
  const family = path.includes('template=family');
  const [name, setName] = useState(family ? 'Peshwa Stories & Street Bites: Family Edition' : '');
  const [cat, setCat] = useState<Category>(family ? 'culture' : 'food');
  const [desc, setDesc] = useState(family ? 'A 2-hour loop for families: legends of Shaniwar Wada told with a kids’ treasure trail, then four mild-spice tastings in Kasba Peth.' : '');
  const [duration, setDuration] = useState(family ? 120 : 90);
  const [price, setPrice] = useState(family ? 900 : 700);
  const [kidPrice, setKidPrice] = useState(family ? 500 : 400);
  const [location, setLocation] = useState('Delhi Darwaza, Shaniwar Wada');
  const [capacity, setCapacity] = useState(12);
  const [slots, setSlots] = useState<number[]>([16 * 60 + 30, 17 * 60 + 30]);
  const [upload, setUpload] = useState<string | undefined>();
  const [suit, setSuit] = useState<string[]>(family ? ['Families', 'Children', 'Elderly'] : ['Couples', 'Solo travelers']);
  const [langs, setLangs] = useState<string[]>(['English', 'Hindi', 'Marathi']);
  const [acc, setAcc] = useState({ wheel: true, veg: true, pet: false });
  const [improving, setImproving] = useState(false);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const completeness = useMemo(() => {
    const checks = [name.length > 8, desc.length > 60, slots.length > 0, suit.length > 0, langs.length > 1, price > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [name, desc, slots, suit, langs, price]);
  const reach = Math.round(620 + (suit.includes('Families') ? 420 : 0) + (price <= 1000 ? 260 : 0) + (acc.wheel ? 90 : 0) + slots.length * 40);

  const improve = () => {
    setImproving(true);
    setTimeout(() => {
      setDesc(
        `${name || 'This experience'} is a ${dur(duration)} walk through Pune’s old city for curious families. Hear the legends of the Peshwas at Shaniwar Wada, follow a kids’ treasure trail, then taste four local favourites, from sabudana vada to mastani, all made mild for small palates. Step-free route, vegetarian by default.`,
      );
      setImproving(false);
    }, 900);
  };

  const publish = () => {
    const e: Experience = {
      id: 'custom-' + Date.now(),
      title: name || 'Untitled experience',
      tagline: desc.slice(0, 80),
      category: cat,
      tags: [cat, ...(suit.includes('Families') ? (['family'] as Category[]) : [])],

      image: upload,
      area: 'Shaniwar Peth',
      address: location,
      x: 46,
      y: 48,
      durationMin: duration,
      price,
      childPrice: kidPrice,
      rating: 5,
      reviews: 0,
      slots: slots.map((t) => ({ time: t, left: capacity, capacity })),
      indoor: false,
      familyFriendly: suit.includes('Families') || suit.includes('Children'),
      wheelchair: acc.wheel,
      vegetarian: acc.veg,
      walking: 'low',
      languages: langs,
      provider: PROVIDERS.heritage,
      about: desc,
      included: [],
      highlights: [],
      accessibility: [],
      reviewsList: [],
      badge: 'New',
    };
    publishExperience(e);
    toast({ title: 'Experience published', body: `Now matching ~${reach.toLocaleString('en-IN')} travelers a week`, tone: 'success', action: { label: 'Set slots', to: '/provider/availability' } });
    navigate('/provider');
  };

  return (
    <ProviderLayout title="Create experience">
      {family && (
        <div className="mb-5 flex items-center gap-3 rounded-3xl bg-ai-soft p-4 text-[13.5px] text-ink-800">
          <Sparkles size={18} className="shrink-0 text-rani-500" /> Pre-filled from the AI insight “Create a 2-hour family package”. Edit anything before publishing.
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card title="Basics">
            <Field id="cx-name" label="Experience name">
              <input id="cx-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Old Pune Breakfast Trail" className="input" />
            </Field>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink-700">Category</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)} icon={<span>{CATEGORY_META[c].emoji}</span>}>
                    {CATEGORY_META[c].label}
                  </Chip>
                ))}
              </div>
            </div>
            <Field id="cx-desc" label="Description" action={
              <button onClick={improve} className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2.5 py-1 text-[12px] font-bold text-rani-600">
                <Wand2 size={13} /> {improving ? 'Writing…' : 'Improve with AI'}
              </button>
            }>
              <textarea id="cx-desc" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What will travelers do, see and taste?" className="input !h-auto py-3 leading-relaxed" />
              <div className="mt-1 text-right text-[11.5px] text-ink-400">{desc.length} characters</div>
            </Field>
          </Card>

          <Card title="Timing, price & capacity">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-700">
                <Clock size={14} /> Duration
              </div>
              <div className="flex flex-wrap gap-2">
                {[45, 60, 90, 120, 180].map((d) => (
                  <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>
                    {dur(d)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="cx-price" label="Price per adult (₹)">
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input id="cx-price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="input pl-8 tnum" />
                </div>
              </Field>
              <Field id="cx-kid" label="Price per child (₹)">
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input id="cx-kid" type="number" value={kidPrice} onChange={(e) => setKidPrice(Number(e.target.value))} className="input pl-8 tnum" />
                </div>
              </Field>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl bg-brand-50 p-3 text-[13px] text-ink-800">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <b>Suggested price: ₹750–₹950</b> based on 42 similar {CATEGORY_META[cat].label.toLowerCase()} experiences in Pune. Families book 2.1× more under ₹1,000.
                <button onClick={() => setPrice(850)} className="ml-1 font-bold text-brand-700 underline">
                  Use ₹850
                </button>
              </div>
            </div>
            <Field id="cx-loc" label="Meeting point">
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input id="cx-loc" value={location} onChange={(e) => setLocation(e.target.value)} className="input pl-8" />
              </div>
            </Field>
            <Stepper label="Capacity per slot" sub="Max guests" value={capacity} min={2} max={40} onChange={setCapacity} />
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink-700">Available slots (daily)</div>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <Chip key={t} active={slots.includes(t)} onClick={() => setSlots(toggle(slots, t).sort((a, b) => a - b))}>
                    {clock(t)}
                  </Chip>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Photos">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              <label htmlFor="cx-upload" className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 text-[12px] font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600">
                <ImagePlus size={22} />
                Upload
                <input
                  id="cx-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUpload(URL.createObjectURL(f));
                  }}
                />
              </label>
              {upload && (
                <div className="relative aspect-square overflow-hidden rounded-2xl ring-4 ring-brand-300">
                  <img src={upload} alt="Uploaded" className="h-full w-full object-cover" />
                  <button onClick={() => setUpload(undefined)} aria-label="Remove photo" className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white">
                    <X size={13} />
                  </button>
                </div>
              )}
              {[
                { img: '/images/experiences/shaniwar-wada-story.jpg', alt: 'Shaniwar Wada Delhi Darwaza' },
                { img: '/images/experiences/pune-food-walk.jpg', alt: 'Authentic Misal Pav' },
                { img: '/images/experiences/kasba-ganpati.jpg', alt: 'Kasba Ganpati courtyard' },
              ].slice(0, upload ? 2 : 3).map((item, idx) => (
                <button key={idx} onClick={() => setUpload(item.img)} aria-label={`Select sample: ${item.alt}`} className={cx('aspect-square overflow-hidden rounded-2xl hover:opacity-90')}>
                  <SceneArt image={item.img} alt={item.alt} />
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-500">Listings with 5+ real photos get 2.4× more bookings.</p>
          </Card>

          <Card title="Traveler suitability & accessibility">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-700">
                <Users size={14} /> Great for
              </div>
              <div className="flex flex-wrap gap-2">
                {SUIT.map((s) => (
                  <Chip key={s} active={suit.includes(s)} onClick={() => setSuit(toggle(suit, s))}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 px-4">
              <Toggle id="cx-wheel" label="Wheelchair accessible" checked={acc.wheel} onChange={(v) => setAcc({ ...acc, wheel: v })} />
              <Toggle id="cx-veg" label="Vegetarian options" checked={acc.veg} onChange={(v) => setAcc({ ...acc, veg: v })} />
              <Toggle id="cx-pet" label="Pet friendly" checked={acc.pet} onChange={(v) => setAcc({ ...acc, pet: v })} />
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink-700">Languages</div>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <Chip key={l} active={langs.includes(l)} onClick={() => setLangs(toggle(langs, l))}>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <aside>
          <div className="sticky top-24 space-y-4">
            <div className="eyebrow">Live preview</div>
            <div className="overflow-hidden rounded-3xl bg-white shadow-card">
              <div className="relative aspect-[16/10]">
                <SceneArt image={upload} alt={name || 'New experience preview'} />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <Badge tone="glass">
                    {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                  </Badge>
                  <Badge tone="dark">New</Badge>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[17px] font-bold leading-snug">{name || 'Your experience name'}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold">
                    <Star size={13} className="fill-amber-400 text-amber-400" /> New
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] text-ink-600">
                  {dur(duration)} · {inr(price)}/person · kids {inr(kidPrice)}
                </div>
                <p className="mt-2 line-clamp-3 text-[13px] text-ink-600">{desc || 'Your description will appear here.'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {slots.map((s) => (
                    <span key={s} className="rounded-lg bg-ink-100 px-2 py-1 text-[11.5px] font-bold text-ink-700 tnum">
                      {clock(s)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold">Listing quality</span>
                <span className="font-display text-[20px] font-bold text-ink-950 tnum">{completeness}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-ai transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
                <Users size={18} className="text-brand-500" />
                <div className="text-[13px] text-ink-700">
                  Anvesha AI will show this to about <b className="text-ink-950 tnum">{reach.toLocaleString('en-IN')} matching travelers</b> a week in Pune.
                </div>
              </div>
              <Button size="lg" full className="mt-4" icon={<Rocket size={17} />} onClick={publish} disabled={!name}>
                Publish Experience
              </Button>
              <Button size="sm" variant="ghost" full className="mt-1" icon={<Plus size={14} />} onClick={() => toast({ title: 'Draft saved', tone: 'info' })}>
                Save as draft
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </ProviderLayout>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-card">
      <h3 className="text-[17px] font-bold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ id, label, children, action }: { id: string; label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-700">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}
