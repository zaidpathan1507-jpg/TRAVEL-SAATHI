import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Smartphone, CreditCard, Wallet, ShieldCheck, Loader2, Lock, BadgePercent, CalendarDays, Landmark } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { useRouter } from '../router';
import { byId } from '../data/experiences';
import { SceneArt } from '../components/SceneArt';
import { Button, Empty, Stepper } from '../components/ui';
import { clock, cx, dur, inr } from '../lib/format';
import { TODAY, addDays, isoDate, dayLabel } from '../data/provider';
import { api, type PaymentConfig } from '../api/client';
import { payWithRazorpay } from '../lib/razorpay';

type Pay = 'razorpay' | 'upi' | 'card' | 'later';

export function priceFor(ids: string[], adults: number, children: number) {
  const lines = ids.map((id) => {
    const e = byId(id);
    const kid = e.childPrice ?? e.price;
    return { id, title: e.title, adults, children, adult: e.price, kid, total: adults * e.price + children * kid };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount = ids.length >= 2 ? Math.round(subtotal * 0.05) : 0;
  const fees = Math.round((subtotal - discount) * 0.05);
  return { lines, subtotal, discount, fees, total: subtotal - discount + fees };
}

export default function Booking() {
  const { checkout, setCheckout, planIds, startCheckout, confirmBooking, toast } = useApp();
  const { navigate, back } = useRouter();
  const [pay, setPay] = useState<Pay>('upi');
  const [upiApp, setUpiApp] = useState('GPay');
  const [processing, setProcessing] = useState(false);
  const [rzp, setRzp] = useState<PaymentConfig | null>(null);

  // Online payment (Razorpay) is used when the backend has the keys; otherwise the demo payment methods stay
  useEffect(() => {
    api
      .paymentConfig()
      .then((c) => {
        setRzp(c);
        if (c.enabled) setPay('razorpay');
      })
      .catch(() => setRzp({ enabled: false, keyId: null, mode: null }));
  }, []);

  useEffect(() => {
    if (!checkout && planIds.length) startCheckout(planIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checkout) {
    return <Empty icon={<CalendarDays />} title="Nothing to book yet" body="Pick an experience or build an itinerary first." action={<Button onClick={() => navigate('/results')}>Find experiences</Button>} />;
  }

  const { lines, subtotal, discount, fees, total } = priceFor(checkout.expIds, checkout.adults, checkout.children);
  const dates = [0, 1, 2].map((d) => isoDate(addDays(TODAY, d)));

  const finish = (method: string, paid?: { checkoutId: string; paymentId?: string }) => {
    confirmBooking(method, total, paid);
    navigate('/confirmation');
  };

  const confirm = async () => {
    if (pay !== 'razorpay' || total < 1) {
      // demo methods (and free bookings): no money moves
      setProcessing(true);
      setTimeout(() => {
        confirmBooking(pay === 'razorpay' ? 'later' : pay, total);
        setProcessing(false);
        navigate('/confirmation');
      }, 1400);
      return;
    }

    const field = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
    const bookingBody = {
      items: checkout.expIds.map((expId, i) => ({ expId, time: checkout.times[i] })),
      date: checkout.date,
      adults: checkout.adults,
      children: checkout.children,
    };
    setProcessing(true);
    let paymentId: string | undefined;
    try {
      const order = await api.createPaymentOrder(bookingBody); // the server prices the order
      if (order.total !== total) {
        toast({ title: 'Price updated', body: `The total is now ${inr(order.total)}. Please review and pay again.`, tone: 'warn' });
        return;
      }
      const result = await payWithRazorpay({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        description: lines.map((l) => l.title).join(' + ').slice(0, 250),
        prefill: { name: field('bk-name'), email: field('bk-email'), contact: field('bk-phone') },
      });
      paymentId = result.razorpay_payment_id;
      const paid = await api.verifyPayment({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
        booking: { ...bookingBody, payment: 'razorpay', customer: field('bk-name') || 'Guest traveler', from: 'Bengaluru', travelerType: checkout.children ? 'Family' : undefined },
      });
      finish('razorpay', { checkoutId: paid.checkoutId, paymentId: paid.paymentId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      toast({
        title: paymentId ? 'Payment received, booking needs a check' : 'Payment not completed',
        body: paymentId ? `${msg}. Keep your payment id ${paymentId} and contact support.` : msg,
        tone: 'warn',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={back} className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-600 hover:text-ink-950">
        <ArrowLeft size={17} /> Back
      </button>
      <h1 className="text-[30px] font-extrabold tracking-tight sm:text-[36px]">Confirm and book</h1>
      <p className="mt-1 text-[14.5px] text-ink-600">
        {checkout.expIds.length > 1 ? `${checkout.expIds.length} experiences, one checkout.` : 'One experience.'} Seats are held for 10 minutes.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* experiences */}
          <section className="card p-5">
            <h2 className="mb-4 text-[18px] font-bold">Experience{checkout.expIds.length > 1 && 's'}</h2>
            <div className="space-y-4">
              {checkout.expIds.map((id, i) => {
                const e = byId(id);
                return (
                  <div key={id} className="flex gap-3.5">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl">
                      <SceneArt image={e.image} alt={e.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold leading-snug text-ink-950">{e.title}</div>
                      <div className="text-[12.5px] text-ink-500">
                        {e.area} · {dur(e.durationMin)} · Host {e.provider.host}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {e.slots.map((s) => (
                          <button
                            key={s.time}
                            disabled={s.left === 0}
                            onClick={() => setCheckout({ ...checkout, times: checkout.times.map((t, j) => (j === i ? s.time : t)) })}
                            className={cx('h-8 rounded-lg border px-2.5 text-[12.5px] font-bold tnum', Math.abs(checkout.times[i] - s.time) < 1 ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-200 text-ink-700 hover:border-ink-400', s.left === 0 && 'opacity-40')}
                          >
                            {clock(s.time)}
                          </button>
                        ))}
                        {!e.slots.some((s) => Math.abs(checkout.times[i] - s.time) < 1) && (
                          <span className="inline-flex h-8 items-center rounded-lg bg-brand-50 px-2.5 text-[12.5px] font-bold text-brand-700 tnum">Planned {clock(checkout.times[i])}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* date + participants */}
          <section className="card grid gap-6 p-5 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-[18px] font-bold">Date</h2>
              <div className="flex gap-2">
                {dates.map((d, i) => (
                  <button key={d} onClick={() => setCheckout({ ...checkout, date: d })} className={cx('flex-1 rounded-2xl border-2 px-2 py-2.5 text-center', checkout.date === d ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-200 hover:border-ink-400')}>
                    <div className={cx('text-[11px] font-semibold uppercase', checkout.date === d ? 'text-white/70' : 'text-ink-500')}>{i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayLabel(d, { weekday: 'short' })}</div>
                    <div className="font-display text-[17px] font-bold">{dayLabel(d, { day: 'numeric', month: 'short' })}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-1 text-[18px] font-bold">Participants</h2>
              <Stepper label="Adults" sub="Age 13+" value={checkout.adults} min={1} onChange={(v) => setCheckout({ ...checkout, adults: v })} />
              <Stepper label="Children" sub="Age 3–12" value={checkout.children} onChange={(v) => setCheckout({ ...checkout, children: v })} />
            </div>
          </section>

          {/* contact */}
          <section className="card p-5">
            <h2 className="mb-3 text-[18px] font-bold">Lead traveler</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['bk-name', 'Name', 'Ananya Sharma'],
                ['bk-phone', 'Phone', '+91 98450 12345'],
                ['bk-email', 'Email', 'ananya.s@example.com'],
              ].map(([id, l, v]) => (
                <label key={id} htmlFor={id} className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-500">{l}</span>
                  <input id={id} defaultValue={v} className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[14px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                </label>
              ))}
            </div>
          </section>

          {/* payment */}
          <section className="card p-5">
            <h2 className="mb-3 text-[18px] font-bold">Payment method</h2>
            <div className="space-y-2.5" role="radiogroup">
              {(rzp?.enabled
                ? ([
                    { v: 'razorpay', icon: Landmark, t: 'Pay online with Razorpay', s: `UPI, cards, netbanking and wallets${rzp.mode === 'test' ? ' · Test mode, no real money' : ''}` },
                    { v: 'later', icon: Wallet, t: 'Cash / Pay Later', s: 'Pay your host on arrival. Seats confirmed after host approval.' },
                  ] as const)
                : ([
                    { v: 'upi', icon: Smartphone, t: 'UPI', s: 'GPay, PhonePe, Paytm or any UPI app' },
                    { v: 'card', icon: CreditCard, t: 'Credit / Debit card', s: 'Visa, Mastercard, RuPay' },
                    { v: 'later', icon: Wallet, t: 'Cash / Pay Later', s: 'Pay your host on arrival. Seats confirmed after host approval.' },
                  ] as const)
              ).map((p) => (
                <div key={p.v} className={cx('rounded-2xl border-2 transition', pay === p.v ? 'border-ink-950' : 'border-ink-100')}>
                  <button role="radio" aria-checked={pay === p.v} onClick={() => setPay(p.v)} className="flex w-full items-center gap-3 p-3.5 text-left">
                    <span className={cx('grid h-10 w-10 place-items-center rounded-xl', pay === p.v ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-700')}>
                      <p.icon size={19} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[14.5px] font-bold text-ink-950">{p.t}</span>
                      <span className="block text-[12.5px] text-ink-500">{p.s}</span>
                    </span>
                    <span className={cx('grid h-5 w-5 place-items-center rounded-full border-2', pay === p.v ? 'border-ink-950' : 'border-ink-300')}>{pay === p.v && <span className="h-2.5 w-2.5 rounded-full bg-ink-950" />}</span>
                  </button>
                  {pay === 'razorpay' && p.v === 'razorpay' && (
                    <p className="border-t border-ink-100 px-3.5 pb-3.5 pt-3 text-[12.5px] leading-relaxed text-ink-600">
                      A secure Razorpay window opens to take the payment. Your card or UPI details are never stored by Travel Saathi.
                      {rzp?.mode === 'test' && ' Test card 4111 1111 1111 1111 (any future expiry, any CVV) or UPI id success@razorpay.'}
                    </p>
                  )}
                  {pay === 'upi' && p.v === 'upi' && (
                    <div className="border-t border-ink-100 px-3.5 pb-3.5 pt-3">
                      <div className="flex flex-wrap gap-2">
                        {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => (
                          <button key={a} onClick={() => setUpiApp(a)} className={cx('h-9 rounded-xl border px-3.5 text-[13px] font-bold', upiApp === a ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700')}>
                            {a}
                          </button>
                        ))}
                      </div>
                      <label htmlFor="upi-id" className="mt-3 block">
                        <span className="mb-1 block text-[12px] font-semibold text-ink-500">UPI ID</span>
                        <input id="upi-id" defaultValue="ananya@okhdfcbank" className="h-11 w-full rounded-xl border border-ink-200 px-3 text-[14px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                      </label>
                    </div>
                  )}
                  {pay === 'card' && p.v === 'card' && (
                    <div className="grid grid-cols-2 gap-3 border-t border-ink-100 px-3.5 pb-3.5 pt-3">
                      <label htmlFor="cc-num" className="col-span-2 block">
                        <span className="mb-1 block text-[12px] font-semibold text-ink-500">Card number</span>
                        <input id="cc-num" placeholder="4242 4242 4242 4242" inputMode="numeric" className="h-11 w-full rounded-xl border border-ink-200 px-3 text-[14px] outline-none focus:border-brand-400" />
                      </label>
                      <label htmlFor="cc-exp" className="block">
                        <span className="mb-1 block text-[12px] font-semibold text-ink-500">Expiry</span>
                        <input id="cc-exp" placeholder="MM / YY" className="h-11 w-full rounded-xl border border-ink-200 px-3 text-[14px] outline-none focus:border-brand-400" />
                      </label>
                      <label htmlFor="cc-cvv" className="block">
                        <span className="mb-1 block text-[12px] font-semibold text-ink-500">CVV</span>
                        <input id="cc-cvv" placeholder="•••" className="h-11 w-full rounded-xl border border-ink-200 px-3 text-[14px] outline-none focus:border-brand-400" />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* summary */}
        <aside>
          <div className="card sticky p-5" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 84px)' }}>
            <h2 className="text-[18px] font-bold">Price breakdown</h2>
            <div className="mt-3 space-y-3">
              {lines.map((l) => (
                <div key={l.id} className="text-[13.5px]">
                  <div className="flex justify-between gap-3 font-semibold text-ink-900">
                    <span className="truncate">{l.title}</span>
                    <span className="shrink-0 tnum">{inr(l.total)}</span>
                  </div>
                  <div className="text-[12px] text-ink-500 tnum">
                    {l.adults} × {inr(l.adult)}
                    {l.children > 0 && ` + ${l.children} kids × ${l.kid === 0 ? 'free' : inr(l.kid)}`}
                  </div>
                </div>
              ))}
            </div>
            <div className="my-4 border-t border-dashed border-ink-200" />
            <div className="space-y-2 text-[13.5px]">
              <Row k="Subtotal" v={inr(subtotal)} />
              {discount > 0 && <Row k={<span className="inline-flex items-center gap-1 text-leaf-700"><BadgePercent size={14} /> Itinerary bundle (5%)</span>} v={<span className="text-leaf-700">−{inr(discount)}</span>} />}
              <Row k="Taxes & fees" v={inr(fees)} />
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink-100 pt-4">
              <span className="text-[15px] font-bold text-ink-950">Total</span>
              <span className="font-display text-[28px] font-bold text-ink-950 tnum">{inr(total)}</span>
            </div>
            <div className="mb-4 text-right text-[12px] text-ink-500">
              {dayLabel(checkout.date)} · {checkout.adults + checkout.children} guests
            </div>
            <Button size="lg" full onClick={confirm} disabled={processing} icon={processing ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}>
              {processing ? (pay === 'razorpay' ? 'Waiting for payment…' : 'Confirming with hosts…') : pay === 'later' ? 'Request Booking' : pay === 'razorpay' && total >= 1 ? `Pay ${inr(total)} securely` : `Confirm Booking · ${inr(total)}`}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-ink-500">
              <ShieldCheck size={14} className="text-leaf-500" /> Free cancellation up to 2 hours before
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-600">{k}</span>
      <span className="font-semibold text-ink-900 tnum">{v}</span>
    </div>
  );
}
