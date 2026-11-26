import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy — ADApolis', description: 'What ADApolis stores about you, why, and how to have it removed.' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="25 November 2026">
      <p>
        ADApolis is built to need as little about you as possible. You can browse every page without signing in. We don&apos;t run advertising
        or third-party tracking, and we never sell data.
      </p>

      <h2>What we store, and why</h2>
      <ul>
        <li>
          <strong>Your stake address</strong>, when you sign in with your wallet, kept in a signed session cookie so you stay signed in. A stake
          address is already public on the Cardano blockchain.
        </li>
        <li>
          <strong>Your game data</strong>: your team, team name, league memberships, and whether your wallet qualifies for prizes (delegation and
          100 ADA at the season snapshot, read from the public chain). Team names are public; the wallet behind a team is never shown.
        </li>
        <li>
          <strong>DRep Match-maker answers</strong> stay in your browser by default. They are saved to your wallet on our server only if you choose
          to, and you can delete them.
        </li>
        <li>
          <strong>Discord link</strong>: if you link Discord to get roles, we store your Discord user ID and username with your stake address.
        </li>
        <li>
          <strong>DRep profile edits</strong>, when a DRep claims their profile, and the signatures that prove they made them.
        </li>
        <li>
          <strong>Notification and email preferences</strong>, and your email address only if you give it to us for updates. Every email has an
          unsubscribe link.
        </li>
        <li>
          <strong>Server logs</strong> (IP address, pages requested, errors), kept by our host for security and debugging and deleted on a rolling
          basis.
        </li>
      </ul>

      <h2>Stored only in your browser</h2>
      <p>Light or dark theme, onboarding progress, and quiz answers you haven&apos;t saved. Clearing your browser data removes them.</p>

      <h2>Public data about DReps</h2>
      <p>
        DRep pages show public on-chain records and what DReps have published themselves (profiles, vote rationales, and posts on public forums
        linked to their verified accounts). AI summaries of that public material are labelled and link to their sources, and DReps can report
        errors and publish a response. Ordinary forum users are not profiled.
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Railway (hosting) and Supabase (database).</li>
        <li>Koios and public IPFS gateways (reading public chain data and documents).</li>
        <li>Anthropic (AI summaries of DReps&apos; public statements; no visitor data is sent).</li>
        <li>Discord (only if you link it), and an email provider (only if you sign up for email).</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Sign out at any time; the session cookie is removed.</li>
        <li>Delete saved quiz answers from the DRep Match-maker.</li>
        <li>
          Ask us to delete your team, links and preferences by messaging us on Discord or X from the footer. On-chain records can&apos;t be deleted
          by anyone.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>We&apos;ll update the date above when this policy changes.</p>
    </LegalPage>
  );
}
