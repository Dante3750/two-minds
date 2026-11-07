# Question file spec (Two Minds trivia)

Players: a couple in India, playing in English, QuizUp-style 10-second rounds.

For each topic you are assigned, write EXACTLY 40 multiple-choice questions to
/home/claude/two-minds/data/<topic_id>.json as a JSON array:

  {"q": "question text (max 110 chars)",
   "a": "the one correct answer (max 34 chars)",
   "w": ["wrong 1", "wrong 2", "wrong 3"],   // max 34 chars each
   "d": 1 | 2 | 3 }                          // difficulty

Mix: about 15 easy (d=1), 15 medium (d=2), 10 hard (d=3).

Rules (strict):
- Every fact must be one you are completely certain of, AND stable over time.
  No "current" office holders, no "latest"/"newest", no records likely to be broken,
  no counts that change (subscribers, box office rankings, population rankings, etc).
- Exactly one option is correct. Wrong options must be plausible, same kind/length
  as the answer, distinct from each other, and definitely wrong.
- No "all/none of the above", no trick wording, no negatives like "Which is NOT".
- The question must be readable and answerable within 10 seconds.
- Do not give away the answer in the question text.
- No duplicates within the topic. Family-friendly.
- Use plain ASCII quotes inside strings or escape them properly; output must be valid JSON.

Before finishing: re-read every question and verify the fact. Replace any you are
less than certain about. Then run:
  python3 -c "import json;d=json.load(open('PATH'));print(len(d));assert all(len(x['w'])==3 and len({x['a'],*x['w']})==4 for x in d)"
Fix until it prints 40 with no assertion error.

Only create your own topic files. Do not touch any other file.
Report back in a few lines: file paths, counts, anything you dropped or were unsure of.
