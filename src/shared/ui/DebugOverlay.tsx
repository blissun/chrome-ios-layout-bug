'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

export type Metrics = {
  iw: number;
  ih: number;
  ch: number;
  vvH: number;
  vvTop: number;
  sy: number;
  sab: string;
  sat: string;
  dvh: number;
  svh: number;
  lvh: number;
  tb: number;
};

function format(m: Metrics | null): string {
  if (!m) return '(empty)';
  return (
    `iw:${m.iw} ih:${m.ih} ch:${m.ch} ` +
    `vv:${m.vvH}+${m.vvTop} sy:${m.sy} ` +
    `sab:${m.sab} sat:${m.sat} ` +
    `dvh:${m.dvh} svh:${m.svh} lvh:${m.lvh} tb:${m.tb}`
  );
}

function copyViaExecCommand(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function DebugOverlay({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [saved, setSaved] = useState<(Metrics | null)[]>([null, null, null, null]);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mkProbe = (cssValue: string, prop: 'height' | 'paddingTop' | 'paddingBottom') => {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;${prop}:${cssValue};`;
      document.body.appendChild(el);
      return el;
    };
    const dvhEl = mkProbe('100dvh', 'height');
    const svhEl = mkProbe('100svh', 'height');
    const lvhEl = mkProbe('100lvh', 'height');
    const satEl = mkProbe('env(safe-area-inset-top)', 'paddingTop');
    const sabEl = mkProbe('env(safe-area-inset-bottom)', 'paddingBottom');

    let rafId = 0;
    const read = () => {
      rafId = 0;
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vv = window.visualViewport;
      setMetrics({
        iw: window.innerWidth,
        ih: window.innerHeight,
        ch: document.documentElement.clientHeight,
        vvH: vv ? Math.round(vv.height * 10) / 10 : 0,
        vvTop: vv ? Math.round(vv.offsetTop * 10) / 10 : 0,
        sy: Math.round(window.scrollY),
        sab: getComputedStyle(sabEl).paddingBottom,
        sat: getComputedStyle(satEl).paddingTop,
        dvh: Math.round(dvhEl.getBoundingClientRect().height),
        svh: Math.round(svhEl.getBoundingClientRect().height),
        lvh: Math.round(lvhEl.getBoundingClientRect().height),
        tb: Math.round(rect.bottom * 10) / 10,
      });
    };
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    window.visualViewport?.addEventListener('resize', schedule);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      dvhEl.remove();
      svhEl.remove();
      lvhEl.remove();
      satEl.remove();
      sabEl.remove();
    };
  }, [targetRef]);

  const handleSave = useCallback(
    (i: number) => {
      if (!metrics) return;
      setSaved((prev) => {
        const next = [...prev];
        next[i] = metrics;
        return next;
      });
    },
    [metrics],
  );

  const handleCopy = useCallback(() => {
    const text = saved.map((m, i) => `[${i + 1}] ${format(m)}`).join('\n');
    const ok = copyViaExecCommand(text);
    setCopyStatus(ok ? 'copied!' : 'copy failed');
    window.setTimeout(() => setCopyStatus(''), 1500);
  }, [saved]);

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-black/90 text-white font-mono text-[10px] leading-snug px-3 py-2 rounded-lg shadow-2xl max-w-[90vw]">
      <div className="break-all whitespace-pre-wrap">
        {metrics ? format(metrics) : '(measuring...)'}
      </div>
      <div className="mt-1 flex gap-1 items-center">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSave(i)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${saved[i] ? 'bg-green-500' : 'bg-white/20'}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCopy}
          className="ml-1 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold"
        >
          copy
        </button>
        {copyStatus && <span className="ml-1 text-[10px]">{copyStatus}</span>}
      </div>
      {saved.some((m) => m !== null) && (
        <div className="mt-1 space-y-0.5">
          {saved.map((m, i) =>
            m ? (
              <div key={i} className="break-all whitespace-pre-wrap">
                <span className="text-yellow-300">[{i + 1}]</span> {format(m)}
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
