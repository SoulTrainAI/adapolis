import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms of Service — ADApolis', description: 'The rules for using ADApolis, the Cardanathon game and DRep All-Star NFTs.' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="25 November 2026">
      <p>
        These terms cover your use of adapolis.net (&quot;ADApolis&quot;, &quot;we&quot;), including the Hall of Fame, DRep Match-maker, Hot Takes, the
        Cardanathon game and DRep All-Star NFTs. By using the site you agree to them. If you don&apos;t agree, please don&apos;t use the site.
      </p>

      <h2>1. What ADApolis is</h2>
      <p>
        ADApolis is an independent, open-source site that presents public Cardano governance data. It is not affiliated with Intersect, the
        Cardano Foundation, Input Output or EMURGO. Scores, rankings, summaries and matches are informational. They are not endorsements of
        any DRep and not advice about how to vote or delegate. AI-written summaries can contain mistakes; always check the linked sources.
      </p>

      <h2>2. Your wallet</h2>
      <ul>
        <li>You sign in by signing a message with your Cardano wallet. This is not a transaction and costs nothing.</li>
        <li>ADApolis never asks for your recovery phrase, password or private keys. Anyone who does is not us.</li>
        <li>You are responsible for your wallet and anything you sign. Blockchain transactions can&apos;t be reversed.</li>
      </ul>

      <h2>3. The Cardanathon game</h2>
      <ul>
        <li>The game is free to play. There are no entry fees, no paid tiers and no purchases needed to play.</li>
        <li>
          One team per wallet per season. Prizes (DRep All-Star NFTs and DRep All-Star Season Trophies) can only be won by global teams whose
          wallet delegates its vote (to any DRep, Abstain or No Confidence) since before the season&apos;s first epoch, with at least 100 ADA
          in the stake snapshot at the season&apos;s end. Holding ADA in your own wallet is not paid to anyone and is not an entry fee.
        </li>
        <li>
          Points come only from how DReps do the job (voting, explaining votes, voting early, consistency), never from which way they vote or
          whether a proposal passes. The full rules are on the <Link href="/methodology" className="text-violet-300">Methodology</Link> page.
        </li>
        <li>
          Leagues are for fun. Betting, wagers, buy-ins or prize pools on the game, in ADA, NFTs or anything else of value, are not allowed on
          ADApolis or its community channels, and ADApolis does not run or link to them.
        </li>
        <li>We may correct scoring errors, and may disqualify teams that use multiple wallets, automation or other abuse to gain an advantage.</li>
        <li>You must be old enough to form a binding agreement where you live, and you may not play where doing so is prohibited.</li>
      </ul>

      <h2>4. DRep All-Star NFTs and trophies</h2>
      <ul>
        <li>
          DRep All-Star NFTs and DRep All-Star Season Trophies are digital collectibles only. They pay nothing, share no revenue or royalties,
          carry no votes or say over ADApolis, and come with no promise of value. Buy, keep or trade them only because you like them.
        </li>
        <li>
          Winners may mint during the mint window, which opens 48 hours after a season ends and closes 3 epochs after it ends. Unclaimed copies
          are never minted. Claimers pay the Cardano network fee and minimum ADA; ADApolis charges nothing to mint.
        </li>
        <li>
          Team Test Mint: the first pressing of each card is minted by the ADApolis team to ensure quality. Test Pressing cards may be used or
          distributed for promotion or other business needs at the team&apos;s discretion. They are marked as test pressings and are in
          addition to the published supply.
        </li>
        <li>Resales carry a 5% creator royalty (CIP-27) to the ADApolis project wallet, which marketplaces honour voluntarily.</li>
        <li>Nothing on ADApolis is financial, legal or tax advice.</li>
      </ul>

      <h2>5. DRep profiles</h2>
      <ul>
        <li>
          DReps can claim their profile by signing with their DRep key and set their own art, bio and links. You confirm you have the right to
          use anything you upload.
        </li>
        <li>
          We may hide or reset profile content, team names or league names that are offensive, unlawful, impersonate someone or infringe
          others&apos; rights. Moderated content is marked as moderated, and every moderation action is logged.
        </li>
        <li>Statistics always come from the blockchain and can&apos;t be edited by anyone.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>
        Don&apos;t attack or overload the site, scrape it in ways that degrade it for others, impersonate others, or use it to break the law.
        The code is open source under the AGPL-3.0 license; the ADApolis name and logo are covered by our trademark policy.
      </p>

      <h2>7. No warranty; limits</h2>
      <p>
        ADApolis is provided &quot;as is&quot;, without warranties of any kind. Data comes from public sources (Koios, IPFS, DReps&apos; own
        documents) and may be late or wrong. To the extent the law allows, ADApolis is not liable for indirect or consequential losses, or for
        losses arising from your wallet, the blockchain, marketplaces or third-party sites.
      </p>

      <h2>8. Changes and law</h2>
      <p>
        We may update these terms; the date above shows the latest version, and continued use means you accept it. These terms are governed by
        the laws of the State of Hawaii, USA. Questions: reach us on our Discord or X (links in the footer).
      </p>
    </LegalPage>
  );
}
