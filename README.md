# Two Minds

Head-to-head trivia for two, made for a couple who miss QuizUp.

**Play:** https://dante3750.github.io/two-minds/

## How it plays
- 7 rounds, the same question for both players, 10 seconds each (15 s option).
- A faster correct answer scores more: 11 to 20 points. Round 7 is the bonus round and counts double.
- After each round you see the right answer and what the other player picked.

## Getting in
No account or password. On first open you type your name and pick a colour; that's it.
People you play are remembered automatically under Rivals with your win–loss record.

## Modes
- **Duel on this phone**: the screen splits in two; face to face, the top half turns around for the other player. Race to tap.
- **Challenge by link**: play 7 questions and share the link (WhatsApp, copy, share). Anyone who opens it types their name once and plays the same questions against your ghost. Their score comes back to your phone automatically and shows on a live leaderboard (via the free ntfy.sh relay, which keeps messages for about 12 hours; a "send result link" button is the fallback).
- **Daily Duel**: 7 mixed questions, the same for everyone that day.
- **Practice vs bot**: Easy, Normal or Hard.
- **Couple corner**: "How well do you know me?" and "Who's more likely to…", pass-the-phone games.
- **Us Two**: write your own questions about your story, play them as a duel or send them by link.

## Content
18 topics × 40 fact-checked questions (720 total): General Knowledge, Brain Teasers, History, Science, Space, Animals, Tech & Internet, Bollywood, Hollywood, Music, Love & Romance, Geography, Capitals & Flags, India, Food & Drink, Cricket, Sports, Video Games. Plus Mixed Bag, 60 "know me" prompts and 40 "more likely" prompts.

## Look
Four themes in Profile: Velvet (default), Midnight, Lagoon and Blush (light).

## Progress
Levels and titles per topic, overall level, 24 badges, head-to-head record, match history, stats. Everything is stored on the phone (localStorage). Installable as an app (Add to Home screen) and works offline.

## Project layout
- `index.html`, `sw.js`, `manifest.webmanifest`, icons: the built site GitHub Pages serves.
- `src/`: source (`app.js`, `style.css`, `index.html` template, service worker, manifest).
- `data/`: question files (`<topic>.json`) and `couple.json`; `data/SPEC.md` is the writing guide.
- `build.py`: run `python3 build.py` to rebuild `index.html` from `src/` and `data/`.
- `tests/e2e.py`: end-to-end test with Playwright.
