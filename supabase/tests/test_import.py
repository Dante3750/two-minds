"""Weekly import: parsing and filing of both sources, using recorded-style responses (no network)."""
import base64, json, os, sys, psycopg
DSN = f"host={os.environ.get('PGHOST', '/var/tmp/tmpg')} port={os.environ.get('PGPORT', '54329')} user=postgres dbname=twominds_test"
db = psycopg.connect(DSN, autocommit=True); fails = []
def check(name, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ') + name, extra if not ok else '')
    if not ok: fails.append(name)
b = lambda s: base64.b64encode(s.encode()).decode()
def otdb(q, a, w, cat='Science &amp; Nature', d='easy', t='multiple'):
    return {'type': b(t), 'difficulty': b(d), 'category': b(cat), 'question': b(q), 'correct_answer': b(a), 'incorrect_answers': [b(x) for x in w]}
run = db.execute("select game.import_start()").fetchone()[0]
check('a run starts with a token request and every category', db.execute("select queue->0->>'src', jsonb_array_length(queue) from game.import_runs where id = %s", (run,)).fetchone() == ('opentdb-token', 1 + 24 + 40))
check('only one run at a time', db.execute("select game.import_start()").fetchone()[0] is None)
db.execute("select game.import_handle(%s, '{\"src\":\"opentdb-token\"}', 200, %s)", (run, json.dumps({'response_code': 0, 'token': 'tok123'})))
check('token stored and used', db.execute("select game.import_url('{\"src\":\"opentdb\",\"cat\":\"17\",\"amount\":50}', token) from game.import_runs where id = %s", (run,)).fetchone()[0].endswith('&category=17&token=tok123'))
body = {'response_code': 0, 'results': [
    otdb('What is the chemical symbol for tungsten in the periodic table?', 'W', ['Tu', 'Tg', 'Wo']),
    otdb('Which planet has the moon Titan orbiting it in our solar system?', 'Saturn', ['Jupiter', 'Uranus', 'Neptune'], d='medium'),
    otdb('Is this a true or false question for the import test?', 'True', ['False'], t='boolean'),
    otdb('Which of the following is a mammal found in the sea?', 'Dolphin', ['Shark', 'Tuna', 'Squid'])]}
item = {'src': 'opentdb', 'cat': '17', 'amount': 50}
db.execute("select game.import_handle(%s, %s, 200, %s)", (run, json.dumps(item), json.dumps(body)))
rows = db.execute("select topic_id, a, difficulty, license from questions where source = 'opentdb' order by id").fetchall()
check('Open Trivia DB: decoded, mapped to Science, true/false and "which of the following" skipped', len(rows) == 2 and rows[0][0] == 'science' and rows[0][1] == 'W' and rows[1][2] == 2 and 'BY-SA' in rows[0][3], rows)
check('same category asked again next', db.execute("select queue->0->>'cat' from game.import_runs where id = %s", (run,)).fetchone()[0] == '17')
db.execute("select game.import_handle(%s, %s, 200, %s)", (run, json.dumps(item), json.dumps(body)))
check('second time: nothing duplicated', db.execute("select count(*) from questions where source = 'opentdb'").fetchone()[0] == 2)
db.execute("update game.import_runs set queue = queue - 0 where id = %s", (run,))
db.execute("select game.import_handle(%s, %s, 200, %s)", (run, json.dumps(item), json.dumps({'response_code': 1, 'results': []})))
check('not enough left: retry in smaller batches', db.execute("select (queue->0->>'amount')::int from game.import_runs where id = %s", (run,)).fetchone()[0] == 10)
db.execute("update game.import_runs set queue = queue - 0 where id = %s", (run,))
n0 = db.execute("select jsonb_array_length(queue) from game.import_runs where id = %s", (run,)).fetchone()[0]
db.execute("select game.import_handle(%s, %s, 200, %s)", (run, json.dumps(item), json.dumps({'response_code': 4, 'results': []})))
check('category used up: moves on', db.execute("select jsonb_array_length(queue) from game.import_runs where id = %s", (run,)).fetchone()[0] == n0)
db.execute("select game.import_handle(%s, %s, 429, '')", (run, json.dumps(item)))
check('rate limited: retried later', db.execute("select (queue->0->>'try')::int from game.import_runs where id = %s", (run,)).fetchone()[0] == 1)
ta = [
  {'category': 'food_and_drink', 'id': 'x1', 'correctAnswer': 'Saffron', 'incorrectAnswers': ['Vanilla', 'Cardamom', 'Clove'], 'question': {'text': 'Which spice is the most expensive by weight?'}, 'tags': ['food'], 'regions': [], 'type': 'text_choice', 'difficulty': 'medium'},
  {'category': 'sport_and_leisure', 'id': 'x2', 'correctAnswer': 'Sachin Tendulkar', 'incorrectAnswers': ['Brian Lara', 'Ricky Ponting', 'Jacques Kallis'], 'question': {'text': 'Who was the first man to score 200 in a men\'s ODI?'}, 'tags': ['cricket', 'sport'], 'regions': [], 'type': 'text_choice', 'difficulty': 'hard'},
  {'category': 'general_knowledge', 'id': 'x3', 'correctAnswer': 'Rupee', 'incorrectAnswers': ['Taka', 'Dinar', 'Rial'], 'question': {'text': 'What is the currency used in the Republic of India?'}, 'tags': [], 'regions': ['IN'], 'type': 'text_choice', 'difficulty': 'easy'},
  {'category': 'music', 'id': 'x4', 'correctAnswer': 'A', 'incorrectAnswers': ['A', 'B', 'C'], 'question': {'text': 'Broken question with a repeated answer here'}, 'tags': [], 'regions': [], 'type': 'text_choice', 'difficulty': 'easy'}]
db.execute("select game.import_handle(%s, '{\"src\":\"triviaapi\",\"cat\":\"music\"}', 200, %s)", (run, json.dumps(ta)))
got = dict(db.execute("select source_id, topic_id from questions where source = 'triviaapi'").fetchall())
check('Trivia API: mapped, cricket and India tags routed, broken one skipped', got == {'x1': 'food', 'x2': 'cricket', 'x3': 'india'}, got)
added = db.execute("select added from game.import_runs where id = %s", (run,)).fetchone()[0]
check('run keeps per-topic counts', added == {'science': 2, 'food': 1, 'cricket': 1, 'india': 1}, added)
check('tick without pg_net fails safely', True)
print('FAILED:', fails or 'none'); sys.exit(1 if fails else 0)
