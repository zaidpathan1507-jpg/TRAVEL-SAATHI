import { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Phone,
  MapPin,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  X,
  Minimize2,
  Maximize2,
  Users,
  Compass,
  ArrowRight,
  RefreshCw,
  Share2,
  Building2,
  Shield,
  WifiOff,
} from 'lucide-react';
import { useSOS } from './SOSContext';
import { EmergencyContactsModal } from './EmergencyContactsModal';
import { cx } from '../../lib/format';

export function SOSModal() {
  const {
    sosStage,
    countdown,
    elapsedSeconds,
    coords,
    locationStatus,
    locationError,
    googleMapsUrl,
    contacts,
    primaryContact,
    alertText,
    isOnline,
    nearbyFacilities,
    isSearchingNearby,
    nearbyError,
    isContactsModalOpen,
    isPanelMinimized,
    setIsContactsModalOpen,
    setIsPanelMinimized,
    confirmSOSActivation,
    activateSOSImmediately,
    cancelSOS,
    resolveSOS,
    retryLocation,
    openMapWithLocation,
    refreshNearbyHelp,
  } = useSOS();

  const [copied, setCopied] = useState(false);
  const [showSafeConfirm, setShowSafeConfirm] = useState(false);
  const [shareSupported] = useState(() => typeof navigator !== 'undefined' && !!navigator.share);

  if (sosStage === 'idle') return null;

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(alertText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* noop */
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOS ALERT — Travel Saathi',
          text: alertText,
          url: googleMapsUrl || undefined,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const cleanPhoneForWa = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  const waUrl = primaryContact?.phone
    ? `https://api.whatsapp.com/send?phone=${cleanPhoneForWa(primaryContact.phone)}&text=${encodeURIComponent(alertText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(alertText)}`;

  const smsUrl = primaryContact?.phone
    ? `sms:${primaryContact.phone}?body=${encodeURIComponent(alertText)}`
    : `sms:?body=${encodeURIComponent(alertText)}`;

  /* ------------------------------------------------------------- 1. Confirmation Stage */
  if (sosStage === 'confirming') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm animate-fade-up" onClick={cancelSOS} />
        <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white p-6 shadow-lift animate-slide-up sm:p-7">
          <div className="flex flex-col items-center text-center">
            <span className="relative flex h-16 w-16 place-items-center justify-center rounded-3xl bg-red-100 text-red-600 shadow-sm">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-3xl bg-red-400 opacity-30" />
              <ShieldAlert size={34} className="relative" />
            </span>

            <div className="mt-4 text-[12px] font-extrabold uppercase tracking-widest text-red-600">
              Emergency SOS
            </div>

            <h3 className="mt-1 text-xl font-extrabold text-ink-950">
              Are you sure you want to activate emergency assistance?
            </h3>

            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
              Activating emergency assistance will acquire your GPS coordinates, prepare your emergency alert, and enable 1-tap connection to <b>112</b> and your contacts.
            </p>

            <div className="mt-6 flex w-full flex-col gap-2.5">
              <button
                type="button"
                onClick={confirmSOSActivation}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_-4px_rgba(220,38,38,0.5)] transition hover:bg-red-700 active:scale-98"
              >
                <ShieldAlert size={18} /> ACTIVATE SOS
              </button>
              <button
                type="button"
                onClick={cancelSOS}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-ink-200 bg-white text-[14px] font-semibold text-ink-700 hover:bg-ink-50 transition active:scale-98"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- 2. 5-Second Countdown Stage */
  if (sosStage === 'countdown') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-md animate-fade-up" />
        <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white p-7 text-center shadow-lift animate-pop">
          <div className="relative mx-auto grid h-28 w-28 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-20" />
            <div className="absolute inset-0 rounded-full border-4 border-red-100" />
            <div className="grid h-24 w-24 place-items-center rounded-full bg-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.5)]">
              <span className="font-display text-4xl font-extrabold tnum">{countdown}</span>
            </div>
          </div>

          <h3 className="mt-5 text-xl font-extrabold text-ink-950">
            SOS activating in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
          </h3>
          <p className="mt-1 text-[13px] text-ink-600">
            Emergency information is being prepared. Tap cancel below if triggered accidentally.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={cancelSOS}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 py-3 text-[15px] font-bold text-white shadow-lift hover:bg-ink-800 transition active:scale-98"
            >
              <X size={18} /> CANCEL SOS (Abort)
            </button>
            <button
              type="button"
              onClick={activateSOSImmediately}
              className="text-[12.5px] font-bold text-red-600 hover:text-red-700 underline underline-offset-4"
            >
              Activate Immediately (Skip countdown)
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- 3. SOS ACTIVE Stage */

  // Sticky top banner when user minimizes panel
  if (isPanelMinimized) {
    return (
      <div className="fixed inset-x-0 top-0 z-[75] bg-red-600 text-white shadow-lg animate-slide-up">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <span className="font-display font-black text-[13px] tracking-wider uppercase">
              SOS ACTIVATED · {formatElapsed(elapsedSeconds)}
            </span>
            {coords && (
              <span className="hidden sm:inline text-[12px] opacity-90 truncate">
                · {coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-extrabold text-red-700 shadow-sm hover:bg-red-50"
            >
              <Phone size={12} /> Call 112
            </a>
            <button
              type="button"
              onClick={() => setIsPanelMinimized(false)}
              className="inline-flex items-center gap-1 rounded-full bg-red-700/80 px-3 py-1 text-[12px] font-bold text-white hover:bg-red-800"
            >
              <Maximize2 size={12} /> Open Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-ink-950/75 backdrop-blur-md animate-fade-up"
          onClick={() => setIsPanelMinimized(true)}
        />

        {/* Emergency Window */}
        <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white shadow-lift animate-slide-up">
          {/* Header Banner */}
          <div className="bg-red-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-85" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-black tracking-wide uppercase">
                    SOS ACTIVATED
                  </h2>
                  <div className="text-[12px] font-semibold text-red-100">
                    Timer: {formatElapsed(elapsedSeconds)} · Emergency protocol active
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPanelMinimized(true)}
                  title="Minimize to view map"
                  aria-label="Minimize"
                  className="grid h-8 w-8 place-items-center rounded-full bg-red-700/80 text-white hover:bg-red-800"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Offline warning banner if device has no connection */}
          {!isOnline && (
            <div className="flex items-center gap-2 bg-amber-500 px-6 py-2 text-[12.5px] font-bold text-white">
              <WifiOff size={15} />
              <span>Internet connection unavailable. Cellular emergency calls (112) remain functional. Live location sharing may not work.</span>
            </div>
          )}

          {/* Emergency Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* 1. CALL ACTIONS: CALL 112 & CALL EMERGENCY CONTACT */}
            <div>
              <div className="font-display text-[12px] font-bold uppercase tracking-wider text-ink-400 mb-2">
                Emergency Calling
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="tel:112"
                  className="flex items-center justify-center gap-2.5 rounded-2xl bg-red-600 px-5 py-4 text-center font-display text-[15px] font-black text-white shadow-[0_6px_20px_rgba(220,38,38,0.4)] transition hover:bg-red-700 active:scale-98"
                >
                  <Phone size={20} className="shrink-0" />
                  <span>CALL 112</span>
                </a>

                {primaryContact ? (
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="flex items-center justify-center gap-2.5 rounded-2xl bg-ink-950 px-5 py-4 text-center font-display text-[15px] font-bold text-white shadow-lift transition hover:bg-ink-800 active:scale-98"
                  >
                    <Phone size={19} className="shrink-0 text-brand-400" />
                    <span className="truncate">CALL {primaryContact.name.toUpperCase()}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsContactsModalOpen(true)}
                    className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-ink-300 p-4 text-[13.5px] font-bold text-ink-700 hover:border-ink-400"
                  >
                    <Users size={18} /> Add Emergency Contact
                  </button>
                )}
              </div>

              {/* India Emergency Service Helplines */}
              <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11.5px] font-bold text-ink-500 uppercase tracking-wider shrink-0">India Helplines:</span>
                <a href="tel:100" className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[12px] font-bold text-ink-800 hover:bg-ink-100 shrink-0">
                  Police 100
                </a>
                <a href="tel:108" className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[12px] font-bold text-ink-800 hover:bg-ink-100 shrink-0">
                  Ambulance 108
                </a>
                <a href="tel:1091" className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[12px] font-bold text-ink-800 hover:bg-ink-100 shrink-0">
                  Women Helpline 1091
                </a>
                <a href="tel:1363" className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[12px] font-bold text-ink-800 hover:bg-ink-100 shrink-0">
                  Tourist 1363
                </a>
              </div>
            </div>

            {/* 2. CURRENT LOCATION STATUS & MAP INTEGRATION */}
            <div className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-950 text-white">
                    <MapPin size={16} />
                  </span>
                  <div>
                    <h4 className="text-[14px] font-bold text-ink-950">Current Location</h4>
                    <p className="text-[12px] text-ink-500">
                      {locationStatus === 'detected' ? 'Live location tracking active' : 'GPS status'}
                    </p>
                  </div>
                </div>

                {locationStatus === 'detecting' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-bold text-amber-800">
                    <RefreshCw size={12} className="animate-spin" /> Acquiring…
                  </span>
                ) : locationStatus === 'detected' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11.5px] font-bold text-emerald-800">
                    <Check size={13} strokeWidth={3} /> Location acquired
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={retryLocation}
                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11.5px] font-bold text-red-800 hover:bg-red-200"
                  >
                    <RefreshCw size={11} /> Retry GPS
                  </button>
                )}
              </div>

              {/* Coordinates display */}
              <div className="mt-3 text-[13px] text-ink-700">
                {coords ? (
                  <div className="space-y-1">
                    <div className="font-mono text-[13px] font-semibold text-ink-950">
                      {coords.latitude.toFixed(5)}° N, {coords.longitude.toFixed(5)}° E
                    </div>
                    <div className="text-[12px] text-ink-500">
                      Accuracy: ±{coords.accuracy ?? 15} meters · Live GPS updates active
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600 text-[12.5px] font-semibold">
                    {locationError || 'Unable to access location. Please enable location permissions.'}
                  </div>
                )}
              </div>

              {/* Map Actions */}
              <div className="mt-3 flex items-center justify-between border-t border-ink-200/80 pt-3">
                <button
                  type="button"
                  onClick={openMapWithLocation}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-600 hover:text-brand-700"
                >
                  <Compass size={15} /> View on Map →
                </button>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-500 hover:text-ink-800"
                  >
                    Google Maps link <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* 3. SOS CONTACT NOTIFICATION / SHARE ALERT */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-bold text-ink-950 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-red-600" />
                  Emergency Alert
                </h4>
                <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] font-bold text-leaf-700">
                  Your location is ready to share
                </span>
              </div>

              {/* Formatted emergency message */}
              <div className="rounded-xl bg-ink-50 p-3 font-mono text-[12px] leading-relaxed text-ink-800 select-all whitespace-pre-wrap border border-ink-100">
                {alertText}
              </div>

              <div className="text-[11.5px] text-ink-500">
                Dispatch this alert via supported device capabilities:
              </div>

              {/* Share & Dispatch Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {shareSupported ? (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink-950 px-3 text-[13px] font-bold text-white shadow-sm hover:bg-ink-800 transition"
                  >
                    <Share2 size={14} /> Share Alert
                  </button>
                ) : (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[13px] font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                )}

                <a
                  href={smsUrl}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 text-[13px] font-bold text-white shadow-sm hover:bg-sky-700 transition"
                >
                  <Phone size={14} /> Send SMS
                </a>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-bold text-ink-800 hover:bg-ink-50 transition"
                >
                  {copied ? <Check size={14} className="text-leaf-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Alert'}</span>
                </button>
              </div>
            </div>

            {/* 4. REAL NEARBY HELP (GOOGLE PLACES) */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[14px] font-bold text-ink-950 flex items-center gap-1.5">
                  <Building2 size={16} className="text-brand-600" />
                  Nearby Help
                </h4>
                {coords && (
                  <button
                    type="button"
                    onClick={refreshNearbyHelp}
                    disabled={isSearchingNearby}
                    className="text-[12px] font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={isSearchingNearby ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                )}
              </div>

              {isSearchingNearby ? (
                <div className="flex items-center justify-center py-4 text-[12.5px] text-ink-500 gap-2">
                  <RefreshCw size={14} className="animate-spin text-brand-500" />
                  <span>Searching for verified nearby emergency facilities…</span>
                </div>
              ) : nearbyFacilities.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {nearbyFacilities.map((fac) => (
                    <div
                      key={fac.id}
                      className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/60 p-2.5"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          {fac.type === 'hospital' ? (
                            <Building2 size={14} className="text-red-500 shrink-0" />
                          ) : (
                            <Shield size={14} className="text-sky2-500 shrink-0" />
                          )}
                          <span className="truncate text-[13px] font-bold text-ink-950">{fac.name}</span>
                        </div>
                        <div className="text-[11.5px] text-ink-500 mt-0.5">
                          {fac.type === 'hospital' ? 'Hospital' : 'Police Station'} ·{' '}
                          <span className="font-bold text-ink-700">{fac.distanceKm} km</span> away
                          {fac.address && ` · ${fac.address}`}
                        </div>
                      </div>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-ink-950 px-2.5 py-1 text-[11.5px] font-bold text-white hover:bg-ink-800 shrink-0"
                      >
                        GET DIRECTIONS
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-ink-50 p-3 text-[12px] text-ink-500">
                  {nearbyError || (coords ? 'No nearby hospitals or police stations returned by Google Places for this location.' : 'Acquiring GPS coordinates to query nearby emergency facilities…')}
                </div>
              )}
            </div>

            {/* 5. EMERGENCY CONTACTS SUMMARY */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[14px] font-bold text-ink-950 flex items-center gap-1.5">
                  <Users size={16} className="text-ink-600" />
                  Emergency Contacts ({contacts.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setIsContactsModalOpen(true)}
                  className="text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
                >
                  Configure Contacts
                </button>
              </div>

              <div className="space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 p-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-ink-950 truncate">{c.name}</span>
                        {c.isPrimary && (
                          <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-ink-500">
                        {c.phone} {c.relationship && `· ${c.relationship}`}
                      </div>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-ink-950 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-ink-800 shrink-0"
                    >
                      <Phone size={11} /> Call
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls: Cancel / I'M SAFE */}
          <div className="border-t border-ink-100 bg-white p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsPanelMinimized(true)}
              className="rounded-xl px-4 py-2 text-[13px] font-bold text-ink-600 hover:bg-ink-100"
            >
              Minimize Panel
            </button>

            {showSafeConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-ink-700">Are you safe?</span>
                <button
                  type="button"
                  onClick={() => {
                    resolveSOS();
                    setShowSafeConfirm(false);
                  }}
                  className="rounded-xl bg-leaf-600 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-leaf-700"
                >
                  Yes, I'm Safe (End SOS)
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeConfirm(false)}
                  className="rounded-xl px-2.5 py-2 text-[12px] font-semibold text-ink-500 hover:bg-ink-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSafeConfirm(true)}
                className="rounded-xl bg-leaf-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-leaf-700 transition active:scale-95"
              >
                I'M SAFE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contacts Management Modal */}
      <EmergencyContactsModal
        open={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
      />
    </>
  );
}
