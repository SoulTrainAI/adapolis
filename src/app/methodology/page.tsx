/**
 * Methodology Page
 * Explains the ADApolis GovScore v1 scoring system
 * Target: DReps, researchers, delegators
 */

export const metadata = {
  title: 'Methodology — ADApolis',
  description: 'How ADApolis scores DReps: participation rates, quadratic ADA dampening, and scoring formulas.',
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">ADApolis Methodology</h1>
          <p className="text-base sm:text-lg text-slate-300">
            How we score DReps on participation, consistency, and accessibility to delegation.
          </p>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-400">
            <span>Last updated: June 2026</span>
            <span>•</span>
            <span>Phase 1: Participation Rate</span>
          </div>
        </div>

        {/* Section 1: Overview */}
        <section className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">1. Overview</h2>
          <p className="text-slate-300 leading-relaxed">
            ADApolis <strong>GovScore</strong> is a composite participation metric computed from on-chain Cardano
            governance data. It measures how actively and consistently a DRep participates in governance, adjusted
            to surface high-quality DReps who are under-delegated.
          </p>
          <p className="text-slate-300 leading-relaxed">
            In Phase 1, GovScore focuses on a single dimension: <strong>participation rate</strong> — the
            percentage of eligible governance proposals a DRep voted on. Future phases will add dimensions
            measuring rationale quality, consistency, delegator alignment, and more.
          </p>
          <p className="text-slate-300 leading-relaxed">
            All scores are computed from publicly available on-chain data and are fully auditable. The entire
            computation pipeline is deterministic and reproducible.
          </p>
        </section>

        {/* Section 2: Phase 1 Score */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">2. Phase 1 Score: Participation Rate</h2>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-slate-100">Formula</h3>
            <pre className="bg-slate-950 border border-slate-700 rounded p-4 overflow-x-auto text-sm font-mono text-slate-200">
{`Raw GovScore = (Votes Cast / Eligible Proposals) × 100`}
            </pre>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Definitions</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex gap-3">
                <span className="text-violet-400 flex-shrink-0">•</span>
                <span>
                  <strong>Votes Cast:</strong> The number of governance actions (proposals) a DRep voted on
                  (YES, NO, or ABSTAIN).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-violet-400 flex-shrink-0">•</span>
                <span>
                  <strong>Eligible Proposals:</strong> Any governance action that was active during an epoch
                  where the DRep was registered on-chain. A DRep that registered recently is measured only
                  against proposals since it joined, so a new DRep that has voted on everything scores 100.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-violet-400 flex-shrink-0">•</span>
                <span>
                  <strong>Proposals still open for voting</strong> count only once the DRep has voted on
                  them. A vote can&apos;t be missed until its voting window closes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-violet-400 flex-shrink-0">•</span>
                <span>
                  <strong>Raw GovScore:</strong> Participation rate scaled to 0–100.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Data Source</h3>
            <p className="text-slate-300">
              <strong>Koios API</strong> ({' '}
              <a href="https://api.koios.rest/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                api.koios.rest
              </a>
              ) — a decentralized, community-maintained Cardano chain indexer. All vote records, proposal
              metadata, and DRep registration status are fetched directly from the blockchain.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Worked Example</h3>
            <div className="bg-slate-900/30 border border-slate-700 rounded p-4">
              <p className="text-slate-300 font-mono text-sm">
                DRep registered in epochs 550–600<br />
                Eligible proposals during this period: 100<br />
                Proposals DRep voted on: 93<br />
                <br />
                <strong className="text-slate-100">Raw GovScore = (93 / 100) × 100 = 93.0</strong>
              </p>
            </div>
            <p className="text-slate-300">
              This DRep voted on 93% of governance actions they were eligible to vote on, earning a
              Raw GovScore of 93.0.
            </p>
          </div>
        </section>

        {/* Section 3: Quadratic ADA Dampening */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">3. Quadratic ADA-Power Dampening</h2>

          <p className="text-slate-300 leading-relaxed">
            A DRep&apos;s <strong>Adjusted GovScore</strong> is the Raw GovScore multiplied by a dampening factor
            based on how much ADA is delegated to them. This creates a gentle curve that surfaces high-quality,
            under-delegated DReps without punishing large DReps for receiving delegation.
          </p>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-slate-100">Formula</h3>
            <pre className="bg-slate-950 border border-slate-700 rounded p-4 overflow-x-auto text-sm font-mono text-slate-200">
{`Adjusted GovScore = Raw GovScore × D

where D = 1 / (1 + log₁₀(ADA_M + 1) / 4)
and ADA_M = ADA delegated in millions`}
            </pre>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Dampening Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-100">ADA Delegated</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-100">Dampening Factor</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-100">Example: Raw 90.0 → Adjusted</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-800 hover:bg-slate-900/30">
                    <td className="py-3 px-4 font-mono">0</td>
                    <td className="text-center py-3 px-4 font-mono">1.000</td>
                    <td className="text-center py-3 px-4 font-mono">90.0</td>
                  </tr>
                  <tr className="border-b border-slate-800 hover:bg-slate-900/30">
                    <td className="py-3 px-4 font-mono">100K</td>
                    <td className="text-center py-3 px-4 font-mono">0.941</td>
                    <td className="text-center py-3 px-4 font-mono">84.7</td>
                  </tr>
                  <tr className="border-b border-slate-800 hover:bg-slate-900/30">
                    <td className="py-3 px-4 font-mono">1M</td>
                    <td className="text-center py-3 px-4 font-mono">0.857</td>
                    <td className="text-center py-3 px-4 font-mono">77.1</td>
                  </tr>
                  <tr className="border-b border-slate-800 hover:bg-slate-900/30">
                    <td className="py-3 px-4 font-mono">10M</td>
                    <td className="text-center py-3 px-4 font-mono">0.750</td>
                    <td className="text-center py-3 px-4 font-mono">67.5</td>
                  </tr>
                  <tr className="hover:bg-slate-900/30">
                    <td className="py-3 px-4 font-mono">100M</td>
                    <td className="text-center py-3 px-4 font-mono">0.667</td>
                    <td className="text-center py-3 px-4 font-mono">60.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              All calculations use base-10 logarithm. The divisor of 4 was chosen to create a smooth,
              gentle curve that avoids discontinuities.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Design Rationale</h3>
            <p className="text-slate-300 leading-relaxed">
              <strong>Behavioral score (participation) always dominates.</strong> Dampening is a tiebreak mechanism,
              not a primary ranking criterion. A DRep with worse participation cannot outscore a better one purely
              through ADA dampening — the math prevents this.
            </p>

            <div className="bg-slate-900/30 border border-slate-700 rounded p-4 space-y-2">
              <p className="text-slate-200 font-semibold">Proof by Example:</p>
              <p className="text-slate-300 font-mono text-sm">
                DRep A: 93% participation, 100M ADA delegated<br />
                Adjusted Score = 93.0 × 0.667 = 62.0<br />
                <br />
                DRep B: 60% participation, 0 ADA delegated<br />
                Adjusted Score = 60.0 × 1.000 = 60.0<br />
                <br />
                <strong className="text-slate-100">DRep A still ranks higher despite the dampening.</strong>
              </p>
            </div>

            <p className="text-slate-300 leading-relaxed">
              <strong>Purpose:</strong> Distribute delegation toward high-quality DReps who haven&apos;t yet
              received community recognition. A 93%-participation DRep with 0 ADA delegated will rank above
              all except the most highly-participated-in large DReps. This creates a discovery mechanism for
              excellent under-delegated DReps.
            </p>
          </div>
        </section>

        {/* Section 4: What GovScore Does NOT Measure */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">4. What GovScore Does NOT Measure (Phase 1)</h2>

          <p className="text-slate-300 leading-relaxed">
            Be explicit about what this score is <em>not</em>. Clarity on limitations is essential to credibility.
          </p>

          <ul className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <span>
                <strong>Does not measure vote direction or outcomes.</strong> ADApolis does not care whether a
                DRep voted YES or NO on any proposal. Only whether they voted.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <span>
                <strong>Does not measure rationale quality.</strong> While a DRep may have published detailed
                reasoning for their votes (CIP-100 rationales), Phase 1 GovScore does not evaluate them.
                (Coming in Phase 2.)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <span>
                <strong>Does not measure cross-channel consistency.</strong> Whether a DRep&apos;s Forum posts,
                Twitter statements, and GitHub activity align with their votes. (Coming in Phase 2+.)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <span>
                <strong>Does not measure delegator alignment.</strong> Whether delegators agree with or are
                satisfied by a DRep&apos;s voting record. (Coming in Phase 2+.)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <span>
                <strong>Does not measure responsiveness or community engagement.</strong> How quickly or thoroughly
                a DRep responds to delegator questions. (Coming in Phase 2+.)
              </span>
            </li>
          </ul>

          <div className="bg-violet-950/30 border border-violet-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-violet-200 mb-3">The Cardinal Rule</h3>
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-violet-100">ADApolis never scores based on HOW a DRep votes — only WHETHER they vote.</strong>
            </p>
            <p className="text-slate-300 leading-relaxed mt-3">
              This is a deliberate design choice to preserve DRep independence and platform neutrality. ADApolis
              takes no position on policy outcomes, treasury allocation, or governance direction. We measure
              participation and transparency, not correctness.
            </p>
          </div>
        </section>

        {/* Section 5: Planned Expansions */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">5. Planned Score Expansions</h2>

          <p className="text-slate-300 leading-relaxed">
            Phase 1 is intentionally narrow. Future phases will add richer signals to GovScore, all while
            maintaining the Cardinal Rule above.
          </p>

          <div className="grid gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Phase 2 — Rationale Quality</h3>
              <p className="text-slate-300 text-sm">
                AI-scored analysis of CIP-100 rationales for clarity, evidence citation, reasoning depth,
                and novelty. Dimensions added to GovScore: rationale publication rate, rationale quality,
                consistency (voting aligned with stated positions).
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Phase 2+ — Delegator Alignment</h3>
              <p className="text-slate-300 text-sm">
                Match rate between DRep votes and aggregated pre-vote signals from delegators. Measures
                whether a DRep represents the values of their delegator base.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Phase 2+ — Growth Normalization</h3>
              <p className="text-slate-300 text-sm">
                Recent activity weighted higher; gentle decay for inactivity. Surfaces DReps who are currently
                active over those who participated historically but have gone dormant.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Phase 2+ — Forum & Social Consistency</h3>
              <p className="text-slate-300 text-sm">
                Cross-channel consistency score: do a DRep&apos;s Forum posts, Twitter statements, GitHub activity,
                and actual votes align? Penalizes opportunism and rewards intellectual coherence.
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-sm">
            All expansions will be published in advance with full transparency. Phase 1 scores will never be
            retroactively changed; new dimensions will be added as separate metrics.
          </p>
        </section>

        {/* Section 6: Data Sources */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">6. Data Sources and Transparency</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Primary Data Source</h3>
            <p className="text-slate-300">
              <strong>Koios API</strong> ({' '}
              <a href="https://api.koios.rest/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                api.koios.rest
              </a>
              ) — Community-maintained, decentralized Cardano chain indexer. Open source, auditable, no
              single point of failure.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Transparency Commitments</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex gap-3">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>
                  <strong>All underlying data is on-chain and publicly verifiable.</strong> Every vote, every
                  proposal, every DRep registration can be audited on the Cardano blockchain.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>
                  <strong>Open governance explorer:</strong> {' '}
                  <a href="https://gov.tools/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                    gov.tools
                  </a>
                  {' '} provides an independent view of all on-chain governance data.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>
                  <strong>Sync frequency:</strong> Daily (automated), with 1–2 block lag time before data
                  appears in Scoreboard.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>
                  <strong>Open API access:</strong> All computed scores will be available via ADApolis API
                  (launching Phase 2). No paywall, no rate limits beyond fair-use.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>
                  <strong>Code is open source:</strong> The entire ADApolis codebase is available on GitHub.
                  The scoring algorithm is not proprietary.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 7: Limitations */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">7. Limitations and Known Issues</h2>

          <p className="text-slate-300 leading-relaxed">
            Intellectual honesty requires naming the shortcomings of this approach.
          </p>

          <ul className="space-y-4">
            <li>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Phase 1 Scope</h3>
              <p className="text-slate-300">
                Participation rate alone is not a complete picture of DRep quality. A DRep could attend every
                vote but provide poor reasoning, miss nuance, or vote counter to delegator interests. Phase 1
                deliberately omits these dimensions. Do not interpret a high Raw GovScore as an endorsement
                of a DRep&apos;s wisdom — only their attendance.
              </p>
            </li>

            <li>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">DRep Metadata Coverage</h3>
              <p className="text-slate-300">
                DReps who have not published CIP-119 metadata appear on the Scoreboard with a generated avatar
                and no bio. This does not mean they are inactive — only that they haven&apos;t registered metadata
                on-chain.
              </p>
            </li>

            <li>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">New DReps</h3>
              <p className="text-slate-300">
                A newly-registered DRep may have excellent recent performance but rank lower than an old DRep
                with mediocre participation — because they had fewer eligible proposals to vote on. This bias
                favors seniority. Future phases will add &quot;growth normalization&quot; to weight recent activity higher.
              </p>
            </li>

            <li>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Koios API Lag</h3>
              <p className="text-slate-300">
                Koios is decentralized and community-maintained. Data may lag the chain by 1–2 blocks. In rare
                cases, if the Koios infrastructure experiences downtime, scores may not update on schedule.
              </p>
            </li>

            <li>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Proposal Timing</h3>
              <p className="text-slate-300">
                Governance actions do not occur on a fixed schedule. Some epochs have many proposals; others
                have none. A DRep in a quiet epoch may appear less active than one in a busy epoch, even if
                their consistency is identical. This is a feature of Cardano governance, not a measurement error.
              </p>
            </li>
          </ul>

          <div className="bg-yellow-950/30 border border-yellow-800 rounded-lg p-6">
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-yellow-100">Feedback on limitations?</strong> We take these issues seriously.
              If you find a bug, have a suggestion for improvement, or want to report a data anomaly, please open
              an issue on GitHub or reach out to the ADApolis team.
            </p>
          </div>
        </section>

        {/* Section 8: Find My DRep */}
        <section id="find-my-drep" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">8. How Find My DRep Matching Works</h2>
          <p className="text-slate-300 leading-relaxed">
            The <a href="/match" className="text-violet-400 hover:text-violet-300">Find My DRep</a> quiz compares your
            answers with how DReps have actually voted on-chain. Everything is computed by fixed rules from public data; no
            AI is involved. Your answers are scored in your browser and are never sent to us or stored.
          </p>
          <ul className="space-y-2 text-slate-300">
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Who can be matched:</strong> registered DReps with at least 3 votes and at least 50% participation, excluding DReps that set CIP-119 <code>doNotList</code> (they asked not to be promoted for delegation).</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Your answers:</strong> each statement is rated 1–10 for agreement and Not at all / A little / Somewhat / Very for importance (weights 0 / 1 / 2 / 3).</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>DRep positions:</strong> measured from votes on the relevant governance actions (e.g. treasury withdrawals), from rationale publication rate, or from delegated ADA. Treasury, protocol-change, transparency and size positions are ranked relative to other DReps.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Parameter topics</strong> (stake pool decentralization, staking rewards, fees) use parameter-change votes. Each change is classified by comparing the proposed values with the values in force when it was proposed; a Yes on a change that lowers the minimum pool fee, for example, counts as siding with small pools.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Thin records:</strong> each DRep&apos;s position is blended with the average DRep as if they had cast 3 extra average votes. A DRep with 3 votes can still match well, but one vote can&apos;t make them look extreme. Results label profiles with fewer than 10 votes as early.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Real-vote questions</strong> are recent proposals (last ~2 years) with their own title and summary, on which eligible DReps split most evenly. A DRep&apos;s Yes counts as 10, No as 1, Abstain or not voting as the midpoint. Answers near the middle count less, since they usually mean &quot;unsure&quot;.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Match %</strong> is the importance-weighted average agreement across every answered topic. &quot;My DRep should explain every vote&quot; only counts when you agree with it.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Decentralization boost:</strong> every ranking adds up to 5 points for the smallest DReps (scaled by delegated-ADA rank), so voting power spreads out. The boost is shown separately and never changes the match %. Exact ties go to the DRep with less delegated ADA.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Not yet measurable:</strong> some topics (e.g. DRep pay, treasury investing) haven&apos;t been voted on. The quiz asks them, but they don&apos;t affect matches until DReps publish positions.</span></li>
          </ul>
          <p className="text-slate-400 text-sm">
            Because about two-thirds of governance actions so far are treasury withdrawals, matches currently lean on treasury
            attitudes. Data refreshes every 6 hours.
          </p>
        </section>

        {/* Section 9: Stated positions */}
        <section id="stated-positions" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">9. What DReps Say: AI-Summarized Stated Positions</h2>
          <p className="text-slate-300 leading-relaxed">
            Alongside voting records, Find My DRep can show what each DRep has <em>said</em> about the quiz topics. These are
            kept separate from voting-record data and never change a match % based on votes, so you can compare what a DRep
            says with what it does.
          </p>
          <ul className="space-y-2 text-slate-300">
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Sources:</strong> only the DRep&apos;s own published words: its CIP-119 profile and up to its 40 most recent distinct vote rationales (CIP-100/136), each verified by Koios against its on-chain hash.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Summarizer:</strong> an AI model (Claude Haiku 5.5) records a 1–10 stance on a topic only when the DRep clearly states or clearly implies a general view. Objections to a single proposal don&apos;t count as a general view. Omitting a topic is preferred to guessing.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Every stance is quoted:</strong> each one must include a verbatim quote from the cited source. Quotes that can&apos;t be found word-for-word in the source are automatically discarded, along with their stance.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Says vs. does:</strong> when a DRep&apos;s stated stance and its voting record on the same topic (3+ votes) differ by half the scale or more, results flag it.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>&quot;What they say&quot; ranking</strong> uses only stated positions, needs at least 2 topics in common with your answers, and applies the same decentralization boost.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>DReps can override:</strong> once DRep-signed positions are available, a DRep&apos;s own signed answer replaces the AI summary for that topic.</span></li>
            <li className="flex gap-3"><span className="text-violet-400 flex-shrink-0">•</span><span><strong>Freshness:</strong> a DRep is re-summarized only when its profile or rationales change.</span></li>
          </ul>
          <p className="text-slate-400 text-sm">
            AI summaries can still misread nuance. Always check the quoted source before relying on a stated position.
          </p>
        </section>

        {/* Footer */}
        <section className="pt-8 border-t border-slate-800 space-y-4">
          <p className="text-slate-400 text-sm">
            <strong>Last updated:</strong> June 2026 | <strong>Phase:</strong> Phase 1 MVP
          </p>
          <p className="text-slate-400 text-sm">
            <strong>Citation:</strong> ADApolis GovScore v1 Methodology. ADApolis. 2026. Retrieved from
            adapolis.net/methodology
          </p>
        </section>
      </div>
    </div>
  );
}
