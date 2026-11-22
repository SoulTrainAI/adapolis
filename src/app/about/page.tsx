/**
 * About ADApolis Page
 * Static page with platform information, mission, and principles
 */

import { X_HANDLE, X_URL } from '@/lib/site/social';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">About ADApolis</h1>
          <p className="text-base sm:text-lg text-slate-300">
            The civic engine for Cardano governance
          </p>
        </div>

        {/* What is ADApolis */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">What is ADApolis</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            ADApolis is a Cardano governance platform that gamifies DRep participation with fantasy-sports mechanics,
            structured deliberation, and reputation scoring. We turn governance from a chore into a sport, without
            sacrificing substance.
          </p>
          <p className="text-slate-300 leading-relaxed">
            DReps become recognizable figures with stats and seasons. Delegators move from not knowing what&apos;s
            happening to having their voice represented in under three minutes. Researchers and reformers get the open
            data that makes the next wave of governance reform possible.
          </p>
        </section>

        {/* What is a DRep */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">What is a DRep</h2>
          <p className="text-slate-300 leading-relaxed">
            A DRep (Delegated Representative) is a participant in Cardano&apos;s governance system who votes on
            governance actions on behalf of delegators. Defined in CIP-1694, DReps can be individuals, organizations,
            or smart contracts. Delegators transfer their voting power to DReps they trust, giving them a voice in
            Cardano&apos;s future without requiring them to vote directly on every proposal.
          </p>
        </section>

        {/* How GovScore Works */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">How GovScore Works</h2>
          <div className="space-y-3 text-slate-300">
            <p>
              <span className="text-slate-100 font-semibold">Participation Rate:</span> We measure the percentage of
              eligible proposals a DRep has voted on. More votes = higher participation.
            </p>
            <p>
              <span className="text-slate-100 font-semibold">Quadratic ADA Dampening:</span> Large ADA holdings can
              amplify influence. We apply a logarithmic dampening formula to prevent wealthy DReps from dominating the
              rankings, ensuring smaller DReps are visible.
            </p>
            <p>
              <span className="text-slate-100 font-semibold">Score Range:</span> Raw GovScores range from 0-100, with
              100 representing perfect participation. Adjusted scores account for ADA power dampening.
            </p>
            <p>
              <span className="text-slate-100 font-semibold">Updated Every Epoch:</span> Scores recalculate every
              Cardano epoch (~5 days), capturing the latest voting activity.
            </p>
          </div>
        </section>

        {/* Our Principles */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">Our Principles</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-1">•</span>
              <div>
                <p className="text-slate-100 font-semibold">Process Over Outcomes</p>
                <p className="text-slate-400">
                  Scores reward participation and voting consistency, never the direction of votes. We never incentivize
                  DReps to vote correctly — only to vote thoughtfully.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-1">•</span>
              <div>
                <p className="text-slate-100 font-semibold">Transparency</p>
                <p className="text-slate-400">
                  All data is on-chain and publicly verifiable. Our algorithms are documented. No hidden models or
                  proprietary scoring.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold mt-1">•</span>
              <div>
                <p className="text-slate-100 font-semibold">Accessibility</p>
                <p className="text-slate-400">
                  ADApolis is free for all participants. No subscriptions, no token locks, no pay-to-participate.
                  Governance should be open to everyone.
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* Built on Cardano */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">Built on Cardano</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            ADApolis is powered by the Koios API, which provides read-only access to Cardano&apos;s governance data. We
            sync DReps, proposals, and votes directly from the blockchain and make them queryable and analyzable.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Everything we build is open. Data is public. Algorithms are transparent. This is governance infrastructure,
            built in the open for the Cardano community.
          </p>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500">
            ADApolis is an open-source project building the next generation of governance infrastructure.
          </p>
          <div className="mt-6 flex gap-6 text-sm">
            <a href="/scoreboard" className="text-slate-400 hover:text-slate-300 transition-colors">
              Scoreboard
            </a>
            <a href={X_URL} target="_blank" rel="noopener noreferrer me" className="text-slate-400 hover:text-slate-300 transition-colors">
              𝕏 {X_HANDLE}
            </a>
            <a
              href="https://forum.cardano.org/c/governance/140"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Governance Forum
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
