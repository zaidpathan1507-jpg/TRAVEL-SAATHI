import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useSOS } from './SOSContext';
import { cx } from '../../lib/format';

interface SOSButtonProps {
  className?: string;
  variant?: 'header' | 'floating' | 'banner';
}

export function SOSButton({ className, variant = 'header' }: SOSButtonProps) {
  const { sosStage, triggerSOSPrompt, setIsPanelMinimized, elapsedSeconds } = useSOS();

  const isActive = sosStage === 'active';
  const isCountingDown = sosStage === 'countdown';

  const handleClick = () => {
    if (isActive || isCountingDown) {
      setIsPanelMinimized(false);
    } else {
      triggerSOSPrompt();
    }
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={isActive ? 'SOS Emergency Active - Open Panel' : 'Trigger SOS Emergency Help'}
        className={cx(
          'fixed z-40 flex items-center justify-center rounded-full text-white shadow-[0_8px_25px_rgba(220,38,38,0.45)] transition-all active:scale-95',
          isActive
            ? 'bottom-20 right-4 h-14 px-4 bg-red-600 ring-4 ring-red-300 animate-pulse lg:bottom-6 lg:right-6'
            : 'bottom-20 right-4 h-12 px-3.5 bg-red-600 hover:bg-red-700 hover:scale-105 lg:hidden',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
          <span className="font-display font-black text-[13px] tracking-wider uppercase">
            {isActive ? `SOS Active (${formatElapsed(elapsedSeconds)})` : 'SOS'}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isActive ? 'SOS Emergency Active - Click to view emergency panel' : 'SOS Emergency Help'}
      title="Emergency Assistance & Safety SOS"
      className={cx(
        'group relative inline-flex items-center gap-2 rounded-full font-bold transition-all active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        isActive
          ? 'bg-red-600 text-white px-3.5 py-1.5 ring-4 ring-red-400/40 animate-pulse shadow-[0_4px_20px_rgba(220,38,38,0.55)]'
          : isCountingDown
          ? 'bg-red-500 text-white px-3.5 py-1.5 shadow-[0_4px_16px_rgba(239,68,68,0.4)]'
          : 'bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 shadow-[0_3px_14px_rgba(220,38,38,0.35)] hover:shadow-[0_4px_18px_rgba(220,38,38,0.45)] hover:scale-[1.02]',
        className
      )}
    >
      {/* Subtle pulsing indicator aura */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          className={cx(
            'absolute inline-flex h-full w-full rounded-full bg-white',
            isActive ? 'animate-ping opacity-90' : 'animate-ping opacity-65'
          )}
        />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>

      {/* Button Icons & Text */}
      <div className="flex items-center gap-1.5">
        <ShieldAlert size={14} className="shrink-0 text-white" />
        <span className="font-display font-black text-[12.5px] tracking-wider leading-none">
          {isActive ? 'SOS ACTIVE' : 'SOS'}
        </span>
        <span className="hidden sm:inline-block text-[11px] font-medium text-red-100 opacity-90 pl-0.5">
          {isActive ? formatElapsed(elapsedSeconds) : 'Emergency Help'}
        </span>
      </div>
    </button>
  );
}
