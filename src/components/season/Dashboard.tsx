'use client';

/**
 * The Cardanathon dashboard: the DRep race in a wide column, and a narrow
 * column with the commentary above the Team Leaderboard. Players can drag the
 * divider to resize, stretch the commentary and panels, swap the columns, and
 * move the commentary below the teams. The layout is remembered in this browser.
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

const DEFAULT: Layout = { order: ['race', 'teams'], split: 0.68, commentary: 'top', commentaryHeight: 320, panelsHeight: 900 };
// v2: the commentary moved into the teams column, so older saved layouts don't apply.
const KEY = 'adapolis:cardanathon-layout-v2';
const PANEL_DRAG = 'application/x-adapolis-panel';
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
      e.preventDefault();
      start.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      // Don't select page text while resizing.
      document.body.style.userSelect = 'none';
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current) onMove(e.clientX - start.current.x, e.clientY - start.current.y);
    },
    onPointerUp: () => {
      start.current = null;
      document.body.style.userSelect = '';
    },
  };
}

function PanelHeader({ id, title, icon, onSwap }: { id: PanelId; title: string; icon: ReactNode; onSwap?: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(PANEL_DRAG, id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="flex cursor-grab items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2 active:cursor-grabbing"
      title="Drag onto the other column to swap sides"
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
  const [over, setOver] = useState<PanelId | null>(null);
  const expanded = layout.commentaryHeight > 420;

  const swap = () => setLayout({ ...layout, order: [layout.order[1], layout.order[0]], split: 1 - layout.split });
  const begin = () => {
    base.current = layout;
  };

  const divider = useDrag((dx) => {
    const width = row.current?.getBoundingClientRect().width ?? 1;
    setLayout({ ...base.current, split: clamp(base.current.split + dx / width, 0.3, 0.8) });
  });
  const commentaryHandle = useDrag((_, dy) =>
    setLayout({ ...base.current, commentaryHeight: clamp(base.current.commentaryHeight + (base.current.commentary === 'top' ? dy : -dy), 120, 760) })
  );
  const panelsHandle = useDrag((_, dy) => setLayout({ ...base.current, panelsHeight: clamp(base.current.panelsHeight + dy, 480, 1600) }));

  const dropTarget = (id: PanelId) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(PANEL_DRAG)) return;
      e.preventDefault();
      setOver(id);
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => {
      const from = e.dataTransfer.getData(PANEL_DRAG) as PanelId;
      setOver(null);
      if (from && from !== id) swap();
    },
  });
  const basis = (id: PanelId) => ({ ['--basis' as string]: `${(id === layout.order[0] ? layout.split : 1 - layout.split) * 100}%` });
  const box = (id: PanelId) => `overflow-hidden rounded-2xl border bg-slate-900/60 ${over === id ? 'border-amber-400' : 'border-slate-800'}`;

  const raceColumn = (
    <section
      key="race"
      {...dropTarget('race')}
      className={`flex max-h-[80vh] min-h-0 min-w-0 flex-col lg:max-h-none lg:basis-[var(--basis)] ${box('race')}`}
      style={basis('race')}
    >
      <PanelHeader id="race" title="DRep race" icon={<Flag className="h-4 w-4 text-amber-300" />} onSwap={swap} />
      <div className="min-h-0 flex-1">{race}</div>
    </section>
  );

  const commentaryBox = (
    <section className="flex flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70" style={{ height: layout.commentaryHeight }}>
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-1.5">
        <Radio className="h-4 w-4 text-rose-400" />
        <span className="font-display text-sm font-bold text-white">Commentary</span>
        <span className="text-xs text-slate-500">{commentaryCount} calls</span>
        <span className="ml-auto flex items-center gap-3 text-slate-400">
          <button
            type="button"
            onClick={() => setLayout({ ...layout, commentary: layout.commentary === 'top' ? 'bottom' : 'top' })}
            className="hover:text-white"
            title={layout.commentary === 'top' ? 'Move below the teams' : 'Move above the teams'}
            aria-label="Move commentary"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setLayout({ ...layout, commentaryHeight: expanded ? DEFAULT.commentaryHeight : 560 })}
            className="hover:text-white"
            title={expanded ? 'Show the latest few' : 'Open taller'}
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
      className="mx-auto my-0.5 h-2 w-20 flex-shrink-0 cursor-row-resize touch-none rounded-full bg-slate-700/60 hover:bg-amber-400/70"
      title="Drag to resize the commentary"
    />
  );
  const teamsPanel = (
    <section className={`flex max-h-[80vh] min-h-0 flex-1 flex-col lg:max-h-none ${box('teams')}`}>
      <PanelHeader id="teams" title="Team Leaderboard" icon={<Users className="h-4 w-4 text-sky-300" />} onSwap={swap} />
      <div className="min-h-0 flex-1">{teams}</div>
    </section>
  );
  const sideColumn = (
    <div key="teams" {...dropTarget('teams')} className="flex min-h-0 min-w-0 flex-col lg:basis-[var(--basis)]" style={basis('teams')}>
      {layout.commentary === 'top' ? (
        <>
          {commentaryBox}
          {commentaryResize}
          {teamsPanel}
        </>
      ) : (
        <>
          {teamsPanel}
          {commentaryResize}
          {commentaryBox}
        </>
      )}
    </div>
  );
  const column = (id: PanelId) => (id === 'race' ? raceColumn : sideColumn);

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-3 text-xs text-slate-500">
        <span className="hidden sm:inline">Drag the handles to resize; drag a header across to swap sides.</span>
        <button type="button" onClick={() => setLayout(DEFAULT)} className="flex items-center gap-1 hover:text-white" title="Reset the layout">
          <RotateCcw className="h-3.5 w-3.5" /> Reset layout
        </button>
      </div>
      <div
        ref={row}
        className="flex flex-col gap-3 lg:h-[var(--panels-h)] lg:flex-row lg:gap-0"
        style={{ ['--panels-h' as string]: `${layout.panelsHeight}px` }}
      >
        {column(layout.order[0])}
        <div
          {...divider}
          onPointerDownCapture={begin}
          className="hidden w-3 flex-shrink-0 cursor-col-resize touch-none items-center justify-center lg:flex"
          title="Drag to resize"
        >
          <div className="h-16 w-1 rounded-full bg-slate-700 hover:bg-amber-400" />
        </div>
        {column(layout.order[1])}
      </div>
      <div
        {...panelsHandle}
        onPointerDownCapture={begin}
        className="mx-auto mt-1 hidden h-3 w-24 cursor-row-resize touch-none rounded-full bg-slate-700/60 hover:bg-amber-400/70 lg:block"
        title="Drag to make the dashboard taller or shorter"
      />
    </div>
  );
}
