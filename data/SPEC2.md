# Round 2 question spec (Two Minds)

Read /home/claude/two-minds/data/SPEC.md first: every rule there still applies
(exact JSON shape {"q","a","w":[3],"d"}, length limits q<=110, answers<=34, stable facts only,
one correct answer, plausible distinct wrong answers, no trick wording, family-friendly, valid JSON).

EXTRA rules for round 2:
- For an EXISTING topic <t>, first read /home/claude/two-minds/data/<t>.json and write 40 NEW
  questions to /home/claude/two-minds/data/<t>_2.json. None may repeat a fact already asked in
  <t>.json (or in any other /home/claude/two-minds/data/*.json you can grep). Same 15/15/10 difficulty mix.
- For a NEW topic, write the number of questions you are told to /home/claude/two-minds/data/<t>.json
  with roughly 37% easy, 37% medium, 26% hard.
- Validate each file: python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d));assert all(len(x['w'])==3 and len({x['a'],*x['w']})==4 and len(x['q'])<=110 and max(map(len,[x['a'],*x['w']]))<=34 for x in d)" FILE
- Check duplicates across all files with grep on key words before finalising.
- Only create your own files. Report: file paths, counts, anything uncertain.
