# Two Minds

Head-to-head trivia for two, made for a couple who miss QuizUp.

**Play:** https://dante3750.github.io/two-minds/

## How it plays
- 7 rounds, the same question for both players, 10 seconds each (15 s option).
- A faster correct answer scores more: 11 to 20 points. Round 7 is the bonus round and counts double.
- After each round you see the right answer and what the other player picked.

## Modes
- **Duel on this phone**: the screen splits in two; face to face, the top half turns around for the other player. Race to tap.
- **Challenge by link**: play 7 questions, send the link (WhatsApp, copy, share). The other person plays the same questions against your ghost: they see when you answered, and your pick is revealed after theirs. They can send the result back or challenge you with new questions.
- **Daily Duel**: 7 mixed questions, the same for everyone that day.
- **Practice vs bot**: Easy, Normal or Hard.
- **Couple corner**: "How well do you know me?" and "Who's more likely to…", pass-the-phone games.
- **Us Two**: write your own questions about your story, play them as a duel or send them by link.

## Content
18 topics × 40 fact-checked questions (720 total): General Knowledge, Brain Teasers, History, Science, Space, Animals, Tech & Internet, Bollywood, Hollywood, Music, Love & Romance, Geography, Capitals & Flags, India, Food & Drink, Cricket, Sports, Video Games. Plus Mixed Bag, 60 "know me" prompts and 40 "more likely" prompts.

## Progress
Levels and titles per topic, overall level, 24 badges, head-to-head record, match history, stats. Everything is stored on the phone (localStorage). Installable as an app (Add to Home screen) and works offline.

## Project layout
- `index.html`, `sw.js`, `manifest.webmanifest`, icons: the built site GitHub Pages serves.
- `src/`: source (`app.js`, `style.css`, `index.html` template, service worker, manifest).
- `data/`: question files (`<topic>.json`) and `couple.json`; `data/SPEC.md` is the writing guide.
- `build.py`: run `python3 build.py` to rebuild `index.html` from `src/` and `data/`.
- `tests/e2e.py`: end-to-end test with Playwright.
