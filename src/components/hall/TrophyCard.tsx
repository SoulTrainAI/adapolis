'use client';

/**
 * A DRep All-Star Season Trophy on the site, handled like a DRep All-Star
 * card: it tilts toward the pointer with a foil sheen, lifts on hover, and
 * tapping it lifts it out and flips it to the back (the season's record).
 * Front and back are the same images that get minted.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { Download, RotateCcw, X } from 'lucide-react';

interface TrophyCardProps {
  /** Front image URL; the back is the same URL with ?side=back. */
  src: string;
  label: string;
}

/** The foil sheen the top All-Star cards use, following the pointer. */
function Foil() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-color-dodge transition-opacity duration-300 group-hover:opacity-60"
      style={{
        backgroundImage:
          'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.55), transparent 45%), linear-gradient(125deg, #ff008080, #ffd60080 20%, #00ff9580 40%, #00c8ff80 60%, #b400ff80 80%, #ff008080)',
        backgroundSize: '100% 100%, 300% 300%',
        backgroundPosition: 'center, var(--mx, 50%) var(--my, 50%)',
      }}
    />
  );
}

function Face({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- generated PNG from our own API, same file that gets minted
    <img src={src} alt={alt} width={500} height={700} loading={eager ? 'eager' : 'lazy'} className="block aspect-[5/7] h-auto w-full select-none" draggable={false} />
  );
}

export function TrophyCard({ src, label }: TrophyCardProps) {
  const back = `${src}${src.includes('?') ? '&' : '?'}side=back`;
  const [open, setOpen] = useState(false);
  const [showBack, setShowBack] = useState(true);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const tiltX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    e.currentTarget.style.setProperty('--mx', `${Math.round(x * 100)}%`);
    e.currentTarget.style.setProperty('--my', `${Math.round(y * 100)}%`);
    if (reduceMotion) return;
    tiltX.set((0.5 - y) * 14);
    tiltY.set((x - 0.5) * 14);
  };
  const onPointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const control = 'inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-black/50 px-4 text-sm font-semibold text-white hover:bg-black/70';

  return (
    <div className="theme-dark">
      <motion.button
        type="button"
        onClick={() => {
          setShowBack(true);
          setOpen(true);
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="group relative block w-full overflow-hidden shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={`${label}. Open the trophy and see the season's record`}
        aria-haspopup="dialog"
      >
        <Face src={src} alt={label} />
        <Foil />
      </motion.button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="theme-dark fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/75 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={label}
                  style={{ width: 'min(92vw, calc(78vh * 5 / 7), 520px)', perspective: 1600 }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    className="relative"
                    style={{ transformStyle: 'preserve-3d' }}
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: showBack ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.3, 0.7, 0.2, 1] }}
                  >
                    <button type="button" className="group relative block w-full overflow-hidden" style={{ backfaceVisibility: 'hidden' }} onClick={() => setShowBack(true)} onPointerMove={onPointerMove} aria-label="Flip to the back">
                      <Face src={src} alt={label} eager />
                      <Foil />
                    </button>
                    <button type="button" className="absolute inset-0 block w-full" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} onClick={() => setShowBack(false)} aria-label="Flip to the front">
                      <Face src={back} alt={`${label}: the season's record`} eager />
                    </button>
                  </motion.div>
                </motion.div>
                <div className="flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className={control} onClick={() => setShowBack((b) => !b)}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Flip
                  </button>
                  <a className={control} href={`${showBack ? back : src}${(showBack ? back : src).includes('?') ? '&' : '?'}download=1`}>
                    <Download className="h-4 w-4" aria-hidden /> Save image
                  </a>
                  <button type="button" className={control} onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" aria-hidden /> Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
