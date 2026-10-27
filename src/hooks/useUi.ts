import { useEffect, useRef, useState } from 'react';

/** Retorna o timestamp atual, atualizado periodicamente (para contadores de SLA em tempo real). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

let scrollLocks = 0;

/** Bloqueia o scroll do body enquanto um overlay (modal/drawer) estiver aberto. Suporta overlays aninhados. */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = '';
    };
  }, [active]);
}

/** Executa `handler` ao pressionar ESC enquanto `active` for verdadeiro. */
export function useEscapeKey(handler: () => void, active: boolean): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}
