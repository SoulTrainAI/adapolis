'use client';

/**
 * DRep Flip Card Component
 * Displays DRep info on front, flips to back on click
 * Uses framer-motion for smooth flip animation
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Award, ExternalLink, Code, Globe, MessageSquare } from 'lucide-react';
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
  bio?: string | null;
  voteSummary?: { yes: number; no: number; abstain: number };
  recentVotes?: Array<{ proposal_title: string; vote: string; proposal_id: string }>;
  socialLinks?: { website?: string; twitter?: string; github?: string; forum?: string };
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
      <div className="mb-6 text-center group relative">
        <div className="relative inline-block">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 cursor-help">Adjusted Score</p>
          <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-slate-800 text-white text-xs rounded p-2 z-10 whitespace-normal">
            GovScore adjusted for ADA-power dampening. Rewards high participation from under-delegated DReps.
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
          </div>
        </div>
        <p className="text-5xl font-bold text-white drop-shadow-lg">
          {props.adjustedScore !== null ? props.adjustedScore.toFixed(1) : '—'}
        </p>
      </div>

      {/* Voting Streak */}
      {props.votingStreak && props.votingStreak > 1 && (
        <div className="mb-4 text-center">
          <p className="text-lg font-semibold text-orange-400">🔥 {props.votingStreak} epoch streak</p>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-700/30 rounded p-2 text-center group relative">
          <p className="text-xs text-slate-500 cursor-help">Participation</p>
          <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white text-xs rounded p-2 z-10 whitespace-normal">
            % of eligible governance proposals voted on.
          </div>
          <p className="text-sm font-semibold text-slate-100">
            {props.participationRate !== null ? `${(props.participationRate * 100).toFixed(0)}%` : '—'}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded p-2 text-center group relative">
          <p className="text-xs text-slate-500 cursor-help">Raw Score</p>
          <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white text-xs rounded p-2 z-10 whitespace-normal">
            Participation rate × 100, before ADA dampening.
          </div>
          <p className="text-sm font-semibold text-slate-100">
            {props.rawScore !== null ? props.rawScore.toFixed(1) : '—'}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded p-2 text-center group relative">
          <p className="text-xs text-slate-500 cursor-help">Delegated</p>
          <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white text-xs rounded p-2 z-10 whitespace-normal">
            Total ADA delegated to this DRep.
          </div>
          <p className="text-sm font-semibold text-slate-100">{props.adaAmount}</p>
        </div>
        <div className="bg-slate-700/30 rounded p-2 text-center group relative">
          <p className="text-xs text-slate-500 cursor-help">Delegators</p>
          <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white text-xs rounded p-2 z-10 whitespace-normal">
            Number of wallets delegating to this DRep.
          </div>
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

function CardBack({ props }: { props: DRepCardProps }) {
  const voteSummary = props.voteSummary || { yes: 0, no: 0, abstain: 0 };
  const recentVotes = props.recentVotes || [];
  const socialLinks = props.socialLinks || {};
  const bio = props.bio || 'No bio provided';

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700/50 p-4 overflow-y-auto">
      {/* Bio Section */}
      <div className="mb-4 pb-3 border-b border-slate-700/50">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Bio</p>
        <p className="text-sm text-slate-300 line-clamp-3">{bio}</p>
      </div>

      {/* Voting History Summary */}
      <div className="mb-4 pb-3 border-b border-slate-700/50">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Voting History</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-700/30 rounded p-2 text-center">
            <p className="text-xs text-slate-500">Yes</p>
            <p className="text-lg font-bold text-green-400">{voteSummary.yes}</p>
          </div>
          <div className="bg-slate-700/30 rounded p-2 text-center">
            <p className="text-xs text-slate-500">No</p>
            <p className="text-lg font-bold text-red-400">{voteSummary.no}</p>
          </div>
          <div className="bg-slate-700/30 rounded p-2 text-center">
            <p className="text-xs text-slate-500">Abstain</p>
            <p className="text-lg font-bold text-yellow-400">{voteSummary.abstain}</p>
          </div>
        </div>
      </div>

      {/* Recent Votes */}
      {recentVotes.length > 0 && (
        <div className="mb-4 pb-3 border-b border-slate-700/50">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recent Votes</p>
          <div className="space-y-1">
            {recentVotes.map((vote, idx) => (
              <a
                key={idx}
                href={`https://gov.tools/governance_actions/${vote.proposal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className={`font-semibold ${
                  vote.vote === 'yes' ? 'text-green-400' :
                  vote.vote === 'no' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {vote.vote.toUpperCase()}
                </span>
                <span className="truncate underline-offset-2 hover:underline">
                  {vote.proposal_title || `Proposal ${vote.proposal_id.substring(0, 8)}`}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Career Legacy Score */}
      <div className="mb-4 pb-3 border-b border-slate-700/50">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Career Legacy Score</p>
        <p className="text-sm font-semibold text-slate-300">—</p>
      </div>

      {/* Social Links */}
      {(socialLinks.website || socialLinks.twitter || socialLinks.github || socialLinks.forum) && (
        <div className="mb-4 pb-3 border-b border-slate-700/50">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Links</p>
          <div className="flex gap-2 flex-wrap">
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                title="Website"
              >
                <Globe size={14} className="text-slate-300" />
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                title="Twitter"
              >
                <span className="text-slate-300 text-xs font-bold">𝕏</span>
              </a>
            )}
            {socialLinks.github && (
              <a
                href={socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                title="GitHub"
              >
                <Code size={14} className="text-slate-300" />
              </a>
            )}
            {socialLinks.forum && (
              <a
                href={socialLinks.forum}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                title="Forum"
              >
                <MessageSquare size={14} className="text-slate-300" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Delegate Button */}
      <div className="mt-auto pt-3">
        <a
          href={`https://gov.tools/connected/drep_directory/${props.drepId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
        >
          Delegate via GovTool
          <ExternalLink size={14} />
        </a>
      </div>

      <p className="text-xs text-slate-600 text-center mt-3">Click to flip back</p>
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
        className="w-full h-full"
      >
        {/* Front */}
        <motion.div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="w-full h-full"
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
          className="w-full h-full absolute inset-0"
        >
          <CardBack props={props} />
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
