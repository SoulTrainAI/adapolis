'use client';

import { Crown, Trophy } from 'lucide-react';
import { TradingCard, cardName } from '@/components/cards/TradingCard';
import { placeholderCard } from '@/components/cards/useCards';
import type { HallOfFame } from '@/lib/season/hall-of-fame';

const MEDAL = ['text-amber-300', 'text-slate-200', 'text-orange-300'];
const PLACE = ['Gold', 'Silver', 'Bronze'];

/** Last finished season's top 10 DReps and the six trophy winners. */
export function HallOfFameView({ hall, seasonName, compact = false }: { hall: HallOfFame; seasonName: string; compact?: boolean }) {
  const cards = hall.champions.map((c) => ({ ...c, card: c.card ?? placeholderCard({ drep_id: c.drep_id, name: null, image: null }) }));
  const podium = cards.slice(0, 3);
  return (
    <div className="space-y-8">
      {!compact && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
              <Crown className="h-5 w-5 text-amber-300" aria-hidden /> DRep All-Star {seasonName} Trophies: DReps
            </h2>
            <ol className="space-y-2">
              {podium.map((c, i) => (
                <li key={c.drep_id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Trophy className={`h-4 w-4 flex-shrink-0 ${MEDAL[i]}`} aria-hidden />
                    <span className="text-slate-400">{PLACE[i]}</span>
                    <span className="truncate font-semibold text-white">{cardName(c.card)}</span>
                  </span>
                  <span className="font-mono text-slate-300">{c.season_points} pts</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
              <Crown className="h-5 w-5 text-violet-300" aria-hidden /> DRep All-Star {seasonName} Trophies: Teams
            </h2>
            {hall.teams.length === 0 ? (
              <p className="text-sm text-slate-400">No prize-eligible teams finished this season.</p>
            ) : (
              <ol className="space-y-2">
                {hall.teams.map((t) => (
                  <li key={t.place} className="text-sm">
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <Trophy className={`h-4 w-4 flex-shrink-0 ${MEDAL[t.place - 1]}`} aria-hidden />
                        <span className="text-slate-400">{PLACE[t.place - 1]}</span>
                        <span className="truncate font-semibold text-white">{t.team_name}</span>
                      </span>
                      <span className="font-mono text-slate-300">{t.points} pts</span>
                    </span>
                    <span className="block truncate pl-6 text-xs text-slate-500">{t.picks.map((p) => p.name ?? p.drep_id.slice(0, 12)).join(' · ')}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold text-white">{seasonName} DRep All-Stars: the top 10</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {cards.map((c) => (
            <TradingCard key={c.drep_id} card={c.card} variant="season" />
          ))}
        </div>
      </section>
    </div>
  );
}
