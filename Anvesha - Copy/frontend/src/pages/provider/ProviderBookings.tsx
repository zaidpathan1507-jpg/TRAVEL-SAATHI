import { useState } from 'react';
import { Search, Check, X, CheckCheck, Phone, MessageSquare, Users, StickyNote } from 'lucide-react';
import { ProviderLayout } from '../../components/Layouts';
import { useApp } from '../../store/AppStore';
import { byId } from '../../data/experiences';
import { TODAY_ISO, dayLabel } from '../../data/provider';
import { Badge, Button, Drawer } from '../../components/ui';
import { SceneArt } from '../../components/SceneArt';
import { STATUS_TONE } from './ProviderDashboard';
import { clock, cx, inr } from '../../lib/format';
import type { BookingStatus, ProviderBooking } from '../../lib/types';

const TABS: ('All' | BookingStatus)[] = ['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];

export default function ProviderBookings() {
  const { providerBookings, updateBookingStatus, toast } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<ProviderBooking | null>(null);

  const rows = providerBookings
    .filter((b) => tab === 'All' || b.status === tab)
    .filter((b) => !q || (b.customer + byId(b.expId).title + b.id).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || (b.date + b.time).localeCompare(a.date + a.time));

  const act = (b: ProviderBooking, s: BookingStatus) => {
    updateBookingStatus(b.id, s);
    setOpen((o) => (o && o.id === b.id ? { ...o, status: s, isNew: false } : o));
    toast({ title: `Booking ${s.toLowerCase()}`, body: `${b.customer} · ${byId(b.expId).title}`, tone: s === 'Cancelled' ? 'warn' : 'success' });
  };

  const Actions = ({ b, full }: { b: ProviderBooking; full?: boolean }) => (
    <div className={cx('flex gap-1.5', full && 'flex-wrap')}>
      {b.status === 'Pending' && (
        <Button size="sm" variant="dark" icon={<Check size={14} />} onClick={(e) => { e.stopPropagation(); act(b, 'Confirmed'); }}>
          Confirm
        </Button>
      )}
      {b.status === 'Confirmed' && (
        <Button size="sm" variant="secondary" icon={<CheckCheck size={14} />} onClick={(e) => { e.stopPropagation(); act(b, 'Completed'); }}>
          Complete
        </Button>
      )}
      {(b.status === 'Pending' || b.status === 'Confirmed') && (
        <Button size="sm" variant="danger" icon={<X size={14} />} onClick={(e) => { e.stopPropagation(); act(b, 'Cancelled'); }}>
          {full ? 'Cancel booking' : ''}
        </Button>
      )}
    </div>
  );

  return (
    <ProviderLayout title="Bookings">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const n = t === 'All' ? providerBookings.length : providerBookings.filter((b) => b.status === t).length;
            return (
              <button key={t} onClick={() => setTab(t)} className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold', tab === t ? 'bg-ink-950 text-white' : 'bg-white text-ink-700 shadow-sm')}>
                {t}
                <span className={cx('rounded-full px-1.5 text-[11px]', tab === t ? 'bg-white/20' : 'bg-ink-100')}>{n}</span>
              </button>
            );
          })}
        </div>
        <label htmlFor="bk-search" className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 shadow-sm lg:w-72">
          <Search size={16} className="text-ink-400" />
          <input id="bk-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer or booking ID" className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none" />
        </label>
      </div>

      {/* desktop table */}
      <div className="hidden overflow-x-auto rounded-3xl bg-white shadow-card md:block">
        <table className="w-full min-w-[860px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-100 text-[11.5px] font-bold uppercase tracking-wider text-ink-500">
              <th className="px-5 py-3.5">Customer</th>
              <th className="px-3 py-3.5">Experience</th>
              <th className="px-3 py-3.5">Date</th>
              <th className="px-3 py-3.5">Time</th>
              <th className="px-3 py-3.5">Group</th>
              <th className="px-3 py-3.5">Payment</th>
              <th className="px-3 py-3.5 text-right">Amount</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((b) => (
              <tr key={b.id} onClick={() => setOpen(b)} className={cx('cursor-pointer transition hover:bg-ink-50', b.isNew && 'bg-leaf-50/70')}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink-950">{b.customer}</span>
                    {b.isNew && <Badge tone="green">New</Badge>}
                  </div>
                  <div className="text-[12px] text-ink-500">
                    {b.id} · {b.from}
                  </div>
                </td>
                <td className="max-w-[220px] truncate px-3 py-3.5 font-medium text-ink-800">{byId(b.expId).title}</td>
                <td className="px-3 py-3.5 text-ink-700">{b.date === TODAY_ISO ? 'Today' : dayLabel(b.date)}</td>
                <td className="px-3 py-3.5 text-ink-700 tnum">{clock(b.time)}</td>
                <td className="px-3 py-3.5 text-ink-700">
                  {b.adults + b.children} <span className="text-[12px] text-ink-500">· {b.travelerType}</span>
                </td>
                <td className="px-3 py-3.5 text-ink-700">{b.payment}</td>
                <td className="px-3 py-3.5 text-right font-bold text-ink-950 tnum">{inr(b.amount)}</td>
                <td className="px-3 py-3.5">
                  <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                </td>
                <td className="px-5 py-3.5">
                  <Actions b={b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-10 text-center text-[14px] text-ink-500">No bookings match.</div>}
      </div>

      {/* mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((b) => (
          <button key={b.id} onClick={() => setOpen(b)} className={cx('block w-full rounded-3xl bg-white p-4 text-left shadow-card', b.isNew && 'ring-2 ring-leaf-300')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[15px] font-bold text-ink-950">
                  {b.customer} {b.isNew && <Badge tone="green">New</Badge>}
                </div>
                <div className="text-[12.5px] text-ink-500">{byId(b.expId).title}</div>
              </div>
              <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[12px]">
              {[
                ['Date', b.date === TODAY_ISO ? 'Today' : dayLabel(b.date, { day: 'numeric', month: 'short' })],
                ['Time', clock(b.time)],
                ['Guests', String(b.adults + b.children)],
                ['Amount', inr(b.amount)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-ink-500">{k}</div>
                  <div className="font-bold text-ink-950 tnum">{v}</div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? `Booking ${open.id}` : ''}>
        {open && (
          <div className="h-full space-y-5 overflow-y-auto p-5">
            <div className="flex items-center gap-3">
              <div className="h-16 w-20 overflow-hidden rounded-2xl">
                <SceneArt image={byId(open.expId)?.image} alt={byId(open.expId)?.title} />
              </div>
              <div>
                <div className="text-[16px] font-bold text-ink-950">{byId(open.expId).title}</div>
                <div className="text-[13px] text-ink-500">
                  {open.date === TODAY_ISO ? 'Today' : dayLabel(open.date)} · {clock(open.time)}
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-ink-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink-950">{open.customer}</span>
                <Badge tone={STATUS_TONE[open.status]}>{open.status}</Badge>
              </div>
              <div className="mt-1 text-[13px] text-ink-600">
                From {open.from} · {open.travelerType}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
                <div>
                  <div className="text-ink-500">Adults</div>
                  <div className="font-bold">{open.adults}</div>
                </div>
                <div>
                  <div className="text-ink-500">Children</div>
                  <div className="font-bold">{open.children}</div>
                </div>
                <div>
                  <div className="text-ink-500">{open.payment}</div>
                  <div className="font-bold tnum">{inr(open.amount)}</div>
                </div>
              </div>
            </div>
            {open.note && (
              <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-900">
                <StickyNote size={16} className="mt-0.5 shrink-0" /> {open.note}
              </div>
            )}
            {open.travelerType === 'Family' && (
              <div className="flex gap-2 rounded-2xl bg-ai-soft p-3 text-[13px] text-ink-800">
                <Users size={16} className="mt-0.5 shrink-0 text-rani-500" /> Family with kids: Anvesha AI suggests the mild tasting ladder and the treasure-trail card.
              </div>
            )}
            <Actions b={open} full />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" icon={<MessageSquare size={15} />} onClick={() => toast({ title: 'Message sent', body: `To ${open.customer}`, tone: 'success' })}>
                Message
              </Button>
              <Button variant="outline" icon={<Phone size={15} />} onClick={() => toast({ title: 'Masked number', body: '+91 90xxx xxx21', tone: 'info' })}>
                Call
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </ProviderLayout>
  );
}
