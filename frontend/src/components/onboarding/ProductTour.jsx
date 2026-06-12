import React, { useState, useEffect, useLayoutEffect } from 'react';

const PADDING = 8;

const ProductTour = ({ steps, onFinish, onNavigate }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (step?.view && onNavigate) onNavigate(step.view, step.viewParams || {});
  }, [stepIndex]);

  useLayoutEffect(() => {
    let raf;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    };
    // Esperar un frame para que la vista (navegación) se renderice antes de medir
    const t = setTimeout(() => { raf = requestAnimationFrame(measure); }, 50);
    return () => { clearTimeout(t); if (raf) cancelAnimationFrame(raf); };
  }, [stepIndex, step]);

  const goNext = () => {
    if (isLast) { onFinish(); return; }
    setStepIndex(i => i + 1);
  };
  const goPrev = () => setStepIndex(i => Math.max(0, i - 1));

  const highlightStyle = rect ? {
    position: 'fixed',
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
    borderRadius: '0.75rem',
    boxShadow: '0 0 0 4px var(--accent), 0 0 0 9999px rgba(0,0,0,0.6)',
    zIndex: 10001,
    pointerEvents: 'none',
    transition: 'all 0.25s ease',
  } : {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10001, pointerEvents: 'none',
  };

  // Posicionar el tooltip cerca del elemento resaltado, o centrado si no hay elemento
  let tooltipStyle = {
    position: 'fixed', zIndex: 10002, maxWidth: 360, width: '90%',
  };
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow > 220 || spaceBelow > rect.top) {
      tooltipStyle.top = rect.bottom + PADDING + 12;
    } else {
      tooltipStyle.bottom = window.innerHeight - rect.top + PADDING + 12;
    }
    let left = rect.left;
    if (left + 360 > window.innerWidth) left = Math.max(12, window.innerWidth - 372);
    tooltipStyle.left = left;
  } else {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <>
      <div style={highlightStyle} />
      <div className="glass-panel" style={{ ...tooltipStyle, padding: '1.25rem', border: '1px solid var(--accent)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
          PASO {stepIndex + 1} DE {steps.length}
        </div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>{step.title}</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.content}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
          <button onClick={onFinish} className="btn-primary outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
            Saltar tour
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {stepIndex > 0 && (
              <button onClick={goPrev} className="btn-primary outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                ← Atrás
              </button>
            )}
            <button onClick={goNext} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
              {isLast ? 'Finalizar' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductTour;
