import { useEffect, useState, type ReactNode } from 'react';
import { MapPin, Timer, Wallet, Users, Route, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../store/AppStore';
import type { Category, GroupType, Trip } from '../lib/types';
import { Button, Chip, Modal, Segmented, Slider, Stepper, Toggle } from './ui';
import { dur, inr, cx } from '../lib/format';
import { groupLabel, interestLabel } from '../lib/engine';
import { CATEGORY_META } from '../data/experiences';

export function TripChips({ trip, showInterests, className, onEdit }: { trip: Trip; showInterests?: boolean; className?: string; onEdit?: () => void }) {
  const items = [
    { icon: <MapPin size={15} />, label: trip.city },
    { icon: <Timer size={15} />, label: `${dur(trip.minutes)} available` },
    { icon: <Wallet size={15} />, label: `Budget ${inr(trip.budget)}${trip.budgetMode === 'person' ? '/person' : ' total'}` },
    { icon: <Users size={15} />, label: groupLabel(trip) },
    ...(showInterests ? [{ icon: <span className="text-[13px]">✦</span>, label: interestLabel(trip) }, { icon: <Route size={15} />, label: `≤ ${trip.maxKm} km` }] : []),
  ];
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      {items.map((i) => (
        <span key={i.label} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-800">
          <span className="text-brand-600">{i.icon}</span>
          {i.label}
        </span>
      ))}
      {onEdit && (
        <button onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-brand-700 hover:bg-brand-50">
          <SlidersHorizontal size={15} /> Edit trip
        </button>
      )}
    </div>
  );
}

const CITIES = ['Pune', 'Mumbai', 'Jaipur', 'Goa', 'Udaipur', 'Kochi'];

export function TripEditor() {
  const { trip, setTrip, tripEditorOpen, setTripEditorOpen, toast } = useApp();
  const [d, setD] = useState<Trip>(trip);
  useEffect(() => {
    if (tripEditorOpen) setD(trip);
  }, [tripEditorOpen, trip]);
  const up = (p: Partial<Trip>) => setD((x) => ({ ...x, ...p }));
  const close = () => setTripEditorOpen(false);
  const toggleInterest = (c: Category) => up({ interests: d.interests.includes(c) ? d.interests.filter((x) => x !== c) : [...d.interests, c] });

  return (
    <Modal
      open={tripEditorOpen}
      onClose={close}
      title="Edit your trip"
      wide
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button
            className="flex-[2]"
            onClick={() => {
              setTrip(d);
              close();
              toast({ title: 'Trip updated', body: 'Recommendations re-ranked for your new constraints', tone: 'ai' });
            }}
          >
            Update recommendations
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <Field label="Where are you?">
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <Chip key={c} active={d.city === c} onClick={() => up({ city: c })}>
                {c}
              </Chip>
            ))}
          </div>
          {d.city !== 'Pune' && <p className="mt-2 text-[12.5px] text-amber-700">The demo catalogue covers Pune. Other cities show Pune data.</p>}
        </Field>
        <Field label="Time available" value={dur(d.minutes)}>
          <Slider id="trip-time" value={d.minutes} min={30} max={480} step={15} onChange={(v) => up({ minutes: v })} format={dur} marks={['30m', '2h', '4h', '6h', '8h']} />
        </Field>
        <Field label="Budget" value={`${inr(d.budget)} ${d.budgetMode === 'person' ? 'per person' : 'total'}`}>
          <Slider id="trip-budget" value={d.budget} min={200} max={6000} step={100} onChange={(v) => up({ budget: v })} format={inr} marks={['₹200', '₹2k', '₹4k', '₹6k']} />
          <Segmented
            className="mt-3"
            value={d.budgetMode}
            onChange={(v) => up({ budgetMode: v })}
            options={[
              { value: 'person', label: 'Per person' },
              { value: 'group', label: 'Total for group' },
            ]}
          />
        </Field>
        <Field label="Who's coming?">
          <Segmented<GroupType>
            className="w-full"
            value={d.groupType}
            onChange={(v) => up({ groupType: v, ...(v === 'solo' ? { adults: 1, children: 0 } : v === 'couple' ? { adults: 2, children: 0 } : {}) })}
            options={[
              { value: 'solo', label: 'Solo' },
              { value: 'couple', label: 'Couple' },
              { value: 'family', label: 'Family' },
              { value: 'friends', label: 'Friends' },
            ]}
          />
          <div className="mt-2 divide-y divide-ink-100">
            <Stepper label="Adults" value={d.adults} min={1} onChange={(v) => up({ adults: v })} />
            <Stepper label="Children" sub="Ages 3–12" value={d.children} onChange={(v) => up({ children: v })} />
          </div>
        </Field>
        <Field label="Interests">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
              <Chip key={c} active={d.interests.includes(c)} onClick={() => toggleInterest(c)} icon={<span>{CATEGORY_META[c].emoji}</span>}>
                {CATEGORY_META[c].label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Max distance" value={`${d.maxKm} km`}>
          <Slider id="trip-km" value={d.maxKm} min={1} max={15} onChange={(v) => up({ maxKm: v })} marks={['1 km', '5', '10', '15 km']} />
        </Field>
        <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100 px-4">
          <Toggle id="t-wheel" label="Wheelchair accessible only" checked={d.wheelchair} onChange={(v) => up({ wheelchair: v })} />
          <Toggle id="t-walk" label="Minimal walking" checked={d.lowWalking} onChange={(v) => up({ lowWalking: v })} />
          <Toggle id="t-indoor" label="Indoor only" checked={d.indoorOnly} onChange={(v) => up({ indoorOnly: v })} />
          <Toggle id="t-veg" label="Vegetarian food" checked={d.vegetarian} onChange={(v) => up({ vegetarian: v })} />
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-sm font-bold text-ink-950">{label}</span>
        {value && <span className="text-sm font-semibold text-brand-700 tnum">{value}</span>}
      </div>
      {children}
    </div>
  );
}
