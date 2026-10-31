import React, { useEffect, useRef } from 'react';

export function ModalFrame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = ref.current!;
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]')).filter(el => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
    (focusable()[0] || root).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); root.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    root.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = overflow; root.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return <div ref={ref} className="modal show d-block" role="dialog" aria-modal="true" aria-label="Record details" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>{children}</div>;
}
