'use client';

/**
 * The Cardanathon dashboard: a commentary bar plus two side-by-side panels
 * (the DRep race and the Team Leaderboard). Players can drag the divider to
 * resize, stretch the commentary and panels, drag a panel's header onto the
 * other to swap them, and move the commentary above or below. The layout is
 * remembered in this browser.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeftRight, ArrowUpDown, ChevronsDownUp, ChevronsUpDown, Flag, GripVertical, Radio, RotateCcw, Users } from 'lucide-react';

type PanelId = 'race' | 'teams';

export interface Layout {
  order: [PanelId, PanelId];
  /** Width of the first panel, as a fraction of the row */
  split: number;
  commentary: 'top' | 'bottom';
  commentaryHeight: number;
  panelsHeight: number;
}

const DEFAULT: Layout = { order: ['race', 'teams'], split: 0.66, commentary: 'top', commentaryHeight: 230, panelsHeight: 900 };
const KEY = 'adapolis:cardanathon-layout';
const PANEL_DRAG = 'application/x-adapolis-panel';
const COMMENTARY_DRAG = 'application/x-adapolis-commentary';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Layout state, saved to this browser (storage can be unavailable; then it just isn't remembered). */
export function useLayout(): [Layout, (next: Layout) => void] {
  const [layout, setLayoutState] = useState<Layout>(DEFAULT);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLayoutState({ ...DEFAULT, ...(JSON.parse(raw) as Partial<Layout>) });
    } catch {
      // ignore
    }
  }, []);
  const setLayout = useCallback((next: Layout) => {
    setLayoutState(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);
  return [layout, setLayout];
}

/** A vertical drag handle that reports how far the pointer moved. */
function useDrag(onMove: (dx: number, dy: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current) onMove(e.clientX - start.current.x, e.clientY - start.current.y);
    },
    onPointerUp: () => {
      start.current = null;
    },
  };
}

function PanelHeader({ id, title, icon, onSwap }: { id: PanelId | 'commentary'; title: string; icon: ReactNode; onSwap?: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(id === 'commentary' ? COMMENTARY_DRAG : PANEL_DRAG, id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="flex cursor-grab items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2 active:cursor-grabbing"
      title="Drag to move this section"
    >
      <GripVertical className="h-4 w-4 text-slate-500" />
      {icon}
      <span className="font-display text-sm font-bold text-white">{title}</span>
      {onSwap && (
        <button type="button" onClick={onSwap} className="ml-auto text-slate-400 hover:text-white" title="Swap sides" aria-label="Swap sides">
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Dashboard({
  layout,
  setLayout,
  commentary,
  commentaryCount,
  race,
  teams,
}: {
  layout: Layout;
  setLayout: (l: Layout) => void;
  commentary: ReactNode;
  commentaryCount: number;
  race: ReactNode;
  teams: ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const base = useRef(layout);
  const [over, setOver] = useState<PanelId | 'top' | 'bottom' | null>(null);
  const expanded = layout.commentaryHeight > 300;

  const swap = () => setLayout({ ...layout, order: [layout.order[1], layout.order[0]], split: 1 - layout.split });
  const begin = () => {
    base.current = layout;
  };

  const divider = useDrag((dx) => {
    const width = row.current?.getBoundingClientRect().width ?? 1;
    setLayout({ ...base.current, split: clamp(base.current.split + dx / width, 0.3, 0.8) });
  });
  const commentaryHandle = useDrag((_, dy) =>
    setLayout({ ...base.current, commentaryHeight: clamp(base.current.commentaryHeight + (base.current.commentary === 'top' ? dy : -dy), 90, 700) })
  );
  const panelsHandle = useDrag((_, dy) => setLayout({ ...base.current, panelsHeight: clamp(base.current.panelsHeight + dy, 360, 1600) }));

  const panel = (id: PanelId) => (
    <section
      key={id}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(PANEL_DRAG)) return;
        e.preventDefault();
        setOver(id);
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        const from = e.dataTransfer.getData(PANEL_DRAG) as PanelId;
        setOver(null);
        if (from && from !== id) swap();
      }}
      className={`flex max-h-[80vh] min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-slate-900/60 lg:max-h-none lg:basis-[var(--basis)] ${over === id ? 'border-amber-400' : 'border-slate-800'}`}
      style={{ ['--basis' as string]: `${(id === layout.order[0] ? layout.split : 1 - layout.split) * 100}%` }}
    >
      {id === 'race' ? (
        <PanelHeader id="race" title="DRep race" icon={<Flag className="h-4 w-4 text-amber-300" />} onSwap={swap} />
      ) : (
        <PanelHeader id="teams" title="Team Leaderboard" icon={<Users className="h-4 w-4 text-sky-300" />} onSwap={swap} />
      )}
      <div className="min-h-0 flex-1">{id === 'race' ? race : teams}</div>
    </section>
  );

  const commentaryBar = (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 ${layout.commentary === 'bottom' ? 'mt-3' : 'mb-3'}`}
      style={{ height: layout.commentaryHeight }}
    >
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-1.5">
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(COMMENTARY_DRAG, 'commentary');
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="flex cursor-grab items-center gap-2"
          title="Drag above or below the race to move the commentary"
        >
          <GripVertical className="h-4 w-4 text-slate-500" />
          <Radio className="h-4 w-4 text-rose-400" />
          <span className="font-display text-sm font-bold text-white">Commentary</span>
          <span className="text-xs text-slate-500">{commentaryCount} calls</span>
        </div>
        <span className="ml-auto flex items-center gap-3 text-slate-400">
          <button
            type="button"
            onClick={() => setLayout({ ...layout, commentary: layout.commentary === 'top' ? 'bottom' : 'top' })}
            className="hover:text-white"
            title={layout.commentary === 'top' ? 'Move below the race' : 'Move above the race'}
            aria-label="Move commentary"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setLayout({ ...layout, commentaryHeight: expanded ? DEFAULT.commentaryHeight : 480 })}
            className="hover:text-white"
            title={expanded ? 'Show the latest few' : 'Open wider'}
            aria-label={expanded ? 'Collapse commentary' : 'Expand commentary'}
          >
            {expanded ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </button>
        </span>
      </div>
      <div className="min-h-0 flex-1">{commentary}</div>
    </section>
  );
  const commentaryResize = (
    <div
      {...commentaryHandle}
      onPointerDownCapture={begin}
      className="mx-auto -my-2 h-3 w-24 cursor-row-resize touch-none rounded-full bg-slate-700/60 hover:bg-amber-400/70"
      title="Drag to resize the commentary"
    />
  );

  const dropZone = (where: 'top' | 'bottom') => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(COMMENTARY_DRAG)) return;
      e.preventDefault();
      setOver(where);
    },
    onDragLeave: () => setOver(null),
    onDrop: () => {
      setOver(null);
      setLayout({ ...layout, commentary: where });
    },
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-3 text-xs text-slate-500">
        <span className="hidden sm:inline">Drag headers to move sections, and the handles to resize.</span>
        <button type="button" onClick={() => setLayout(DEFAULT)} className="flex items-center gap-1 hover:text-white" title="Reset the layout">
          <RotateCcw className="h-3.5 w-3.5" /> Reset layout
        </button>
      </div>
      <div {...dropZone('top')} className={`rounded-2xl ${over === 'top' ? 'outline outline-2 outline-dashed outline-amber-400/70' : ''}`}>
        {layout.commentary === 'top' ? (
          <>
            {commentaryBar}
            {commentaryResize}
          </>
        ) : (
          <div className="h-2" />
        )}
      </div>
      <div
        ref={row}
        className="flex flex-col gap-3 lg:h-[var(--panels-h)] lg:flex-row lg:gap-0"
        style={{ ['--panels-h' as string]: `${layout.panelsHeight}px` }}
      >
        {panel(layout.order[0])}
        <div
          {...divider}
          onPointerDownCapture={begin}
          className="hidden w-3 flex-shrink-0 cursor-col-resize touch-none items-center justify-center lg:flex"
          title="Drag to resize"
        >
          <div className="h-16 w-1 rounded-full bg-slate-700 hover:bg-amber-400" />
        </div>
        {panel(layout.order[1])}
      </div>
      <div
        {...panelsHandle}
        onPointerDownCapture={begin}
        className="mx-auto mt-1 hidden h-3 w-24 cursor-row-resize touch-none rounded-full bg-slate-700/60 hover:bg-amber-400/70 lg:block"
        title="Drag to make the race and teams taller or shorter"
      />
      <div {...dropZone('bottom')} className={`rounded-2xl ${over === 'bottom' ? 'outline outline-2 outline-dashed outline-amber-400/70' : ''}`}>
        {layout.commentary === 'bottom' ? (
          <>
            {commentaryResize}
            {commentaryBar}
          </>
        ) : (
          <div className="h-2" />
        )}
      </div>
    </div>
  );
}
