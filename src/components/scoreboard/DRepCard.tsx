'use client';

/**
 * DRep Flip Card Component
 * Displays DRep info on front, flips to back on click
 * Uses framer-motion for smooth flip animation
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { getAvatarDataUri } from '@/lib/utils/avatar';

interface DRepCardProps {
  rank: number;
  drepId: string;
  displayName: string;
  adjustedScore: number | null;
  rawScore: number | null;
  participationRate: number | null;
  adaAmount: string;
  delegatorCount: number | null;
  isRegistered: boolean;
  votingStreak?: number;
}

function getMetalBadgeColor(rank: number): { label: string; ringClass: string } {
  if (rank === 1) return { label: 'Gold', ringClass: 'ring-yellow-500' };
  if (rank === 2) return { label: 'Silver', ringClass: 'ring-gray-300' };
  if (rank === 3) return { label: 'Bronze', ringClass: 'ring-orange-600' };
  return { label: '', ringClass: '' };
}

function CardFront({ props }: { props: DRepCardProps }) {
  const metalBadge = getMetalBadgeColor(props.rank);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700/50 p-4 justify-between">
      {/* Header: Avatar + Rank + Metal Badge */}
      <div className="flex items-start justify-between mb-4">
        {/* Avatar */}
        <Image
          src={getAvatarDataUri(props.drepId)}
          alt={`${props.displayName} avatar`}
          width={48}
          height={48}
          className={`rounded-full flex-shrink-0 border-2 ${
            props.rank <= 3 ? `ring-2 ${metalBadge.ringClass}` : 'border-slate-600'
          }`}
        />

        {/* Rank badge + Metal badge */}
        <div className="flex flex-col items-end gap-1">
          <div className="bg-slate-700/50 px-2 py-1 rounded text-sm font-bold text-slate-100">
            #{props.rank}
          </div>
          {props.rank <= 3 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded text-xs font-semibold text-yellow-300">
              <Award size={12} />
              {metalBadge.label}
            </div>
          )}
        </div>
      </div>

      {/* DRep Name */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-300 truncate">{props.displayName}</p>
        <p className="text-xs text-slate-500 font-mono truncate">{props.drepId.substring(0, 12)}...</p>
      </div>

      {/* Adjusted Score (prominent) */}
      <div className="mb-6 text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Adjusted Score</p>
        <p className="text-5xl font-bold text-white drop-shadow-lg">
          {props.adjustedScore !== null ? props.adjustedScore.toFixed(1) : '—'}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-700/30 rounded p-2 text-center">
          <p className="text-xs text-slate-500">Participation</p>
          <p className="text-sm font-semibold text-slate-100">
            {props.participationRate !== null ? `${(props.participationRate * 100).toFixed(0)}%` : '—'}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded p-2 text-center">
          <p className="text-xs text-slate-500">Raw Score</p>
          <p className="text-sm font-semibold text-slate-100">
            {props.rawScore !== null ? props.rawScore.toFixed(1) : '—'}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded p-2 text-center">
          <p className="text-xs text-slate-500">Delegated</p>
          <p className="text-sm font-semibold text-slate-100">{props.adaAmount}</p>
        </div>
        <div className="bg-slate-700/30 rounded p-2 text-center">
          <p className="text-xs text-slate-500">Delegators</p>
          <p className="text-sm font-semibold text-slate-100">{props.delegatorCount || '—'}</p>
        </div>
      </div>

      {/* Footer: Status + Hint */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-700/50">
        <span
          className={`px-2 py-1 rounded ${
            props.isRegistered ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
          }`}
        >
          {props.isRegistered ? 'Registered' : 'Inactive'}
        </span>
        <span className="text-slate-500 italic">Click to view</span>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700/50 p-4 justify-center items-center">
      <p className="text-slate-400 text-center">Back of card coming soon...</p>
      <p className="text-slate-500 text-sm mt-2">Click to flip back</p>
    </div>
  );
}

export function DRepCard({ props }: { props: DRepCardProps }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <motion.button
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={handleKeyDown}
      className="w-full focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-xl transition-all"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`${props.displayName} - Rank ${props.rank} - Score ${props.adjustedScore?.toFixed(1) || '-'} - Click to view profile`}
      aria-pressed={isFlipped}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: 'spring',
          stiffness: 80,
          damping: 15,
        }}
        style={{
          transformStyle: 'preserve-3d',
          perspective: 1200,
        }}
        className="w-full"
      >
        {/* Front */}
        <motion.div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="w-full aspect-[5/7]"
        >
          <CardFront props={props} />
        </motion.div>

        {/* Back */}
        <motion.div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            rotateY: 180,
          }}
          className="w-full aspect-[5/7] absolute inset-0"
        >
          <CardBack />
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
