# ADApolis Discord

The ADApolis Discord is where the four groups the site serves meet: people learning governance, delegators choosing a DRep, fantasy players, and card collectors. It also gives DReps a place to be questioned in public and to talk among themselves in private.

The server is declared in code (`src/lib/discord/server-config.ts`) and built by one command. Change the file, rerun setup, and the live server follows.

## Design principles

1. **Everyone lands somewhere useful in one click.** Discord's onboarding asks "What brings you here?" and "Which alerts do you want?". Each answer hands out a role and opens the matching channels, so newcomers don't scroll past 25 channels.
2. **The chain drives the conversation.** Every new governance action automatically gets its own forum post, a feed announcement and a last-epoch reminder. Discussion clusters around real proposals instead of scattering.
3. **DReps are accountable in public and candid in private.** The public **#ask-a-drep** forum is for interviews; verified DReps get a gold role and a private lounge.
4. **Neutral, like the rest of ADApolis.** Feeds report what is up for a vote and who is showing up, never which side is winning (Cardinal Rule).
5. **No extra hosting.** Setup and feeds use Discord's REST API and webhooks from the existing app and cron. There is no always-on bot process to pay for or babysit.
6. **Scam-hardened from day one.** Crypto Discords are drainer magnets. AutoMod blocks the usual phrases ("seed phrase", "validate your wallet", "support ticket"), the rules say no one will DM first, and mods get every alert in #mod-log.

## Roles

| Role | Who | How they get it |
|---|---|---|
| Moderator | Mods | Given by hand |
| Verified DRep (gold) | Registered DReps | After verification in #drep-verify (wallet signing later) |
| Card Holder (violet) | ADApolis NFT holders | Wallet verification, once the Genesis set exists |
| DRep (unverified) | DReps waiting for verification | Onboarding: "I'm a DRep" |
| Delegator, Player, Collector, Learner, Builder | Interest roles | Onboarding answers, changeable any time |
| Governance Alerts, Season Alerts, AMA Alerts | Opt-in pings | Onboarding answers |

## Channels

**📜 START HERE**
- #welcome: read-only, with a pinned guide to the server.
- #rules: read-only.
- #announcements: announcement channel that other servers can follow.
- #introductions: 60-second slowmode.

**🏛️ THE FORUM** (governance)
- #governance-feed: automatic. New actions and deadlines, with a ping to Governance Alerts.
- #governance-actions: forum. One post per on-chain action, opened by the bot and tagged by type. Members reply but can't start posts.
- #ask-a-drep: forum. One question per post, tagged by topic. DReps answer, and the asker adds the Answered tag. AMA posts are tagged AMA.
- #hot-topics-chat, #learn-governance.
- #governance-guides: forum with 5 starter guides. Members can ask follow-up questions inside each guide.

**🏟️ THE ARENA** (fantasy)
- #season-feed: automatic. Standings every epoch, draft open and 24-hour lock reminders.
- #draft-talk, #arena-chat.

**🃏 THE VAULT** (collectors)
- #card-of-the-day: automatic. One active DRep card per day, picked deterministically by date.
- #collectors-chat.
- #holders-lounge: Card Holder only.

**🗳️ DREP CHAMBER**
- #drep-verify: visible to DRep roles only; instructions pinned.
- #drep-lounge: Verified DRep only, off the record.
- DRep Chamber: private voice channel.

**🎙️ STAGE**
- Town Hall: stage channel for AMAs.
- Agora: open voice channel.

**🛠️ ADAPOLIS**
- #feedback, #bug-reports.

**🛡️ MODS**
- #mod-log: AutoMod alerts and Discord's community updates.

## Automation

| What | Where | When |
|---|---|---|
| New governance action → forum post plus announcement (pings Governance Alerts) | #governance-actions, #governance-feed | Next cron run after the action appears |
| Last-epoch reminder, showing turnout and rationales only | #governance-feed | Once, when ≤1 epoch is left |
| Epoch standings, top 5 | #season-feed | Once per epoch |
| Draft open, rosters lock in 24 h (pings Season Alerts) | #season-feed | Once each per season |
| Card of the day | #card-of-the-day | Once per UTC day |
| Scam, mention-spam, spam and slur filters | Whole server | Always (Discord AutoMod) |

- **No duplicates:** every post is recorded in `discord_posts`, so nothing posts twice.
- **Switching feeds on:** feeds run on the 6-hourly cron when `DISCORD_FEEDS=on`. You can also preview or trigger them through `/api/admin/discord/feeds`.

## Running Ask a DRep

- **Async:** anyone opens a post in #ask-a-drep. Verified DReps answer in their own time, and their gold role makes the answers easy to spot.
- **Live AMAs:** schedule a Discord Event on the Town Hall stage, e.g. a weekly "DRep Office Hours" with one or two DReps. Ping AMA Alerts when it starts. Collect questions beforehand in an #ask-a-drep post tagged AMA, and link that post in the event description.
- **Recruiting DReps:** the ones with high GovScores and Scholar abilities make the best first guests.

## Phase 2: wallet-verified roles

A "Link Discord" page on adapolis.net combines Discord sign-in (OAuth, `identify` scope) with the wallet sign-in the site already has. The server then gives roles through the REST API:

- **Player:** the wallet has a saved fantasy roster.
- **Delegator:** the wallet delegates to any DRep.
- **Card Holder:** the wallet holds an ADApolis policy asset.
- **Verified DRep:** the user signs with their DRep key (CIP-95), and the derived `drep1…` ID is registered.

This needs `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`, and a nightly re-check so roles follow the wallet. Until then, DRep verification is manual in #drep-verify.

## Operating notes

- Rerun setup any time. It only creates what is missing and fixes what drifted. It never deletes channels, roles or messages.
- Renaming a channel or role in Discord makes setup create a new one with the configured name. Rename in the config file, not in Discord.
- To change a seeded message (welcome, rules, guides): edit `src/lib/discord/content.ts`, delete the old message in Discord, delete its `seed:` row from `discord_posts`, and rerun setup.
