"""Simulated ntfy.sh relay shared by the tests: POST, /json poll and /sse, comma-separated topics,
since=all | <N>s | <unix time> | <message id>."""
import json, time, itertools
from urllib.parse import urlparse, parse_qs

class Relay:
    def __init__(self):
        self.topics = {}            # topic -> [messages]
        self.fail = False
        self.seq = itertools.count(1)
        self.posts = 0

    def all(self):
        return sorted((m for ms in self.topics.values() for m in ms), key=lambda m: m['_n'])

    def _since(self, msgs, since):
        if since in ('', 'all'): return msgs
        if since.endswith('s') and since[:-1].isdigit(): return [m for m in msgs if m['time'] >= time.time() - int(since[:-1])]
        if since.isdigit(): return [m for m in msgs if m['time'] >= int(since)]
        ref = next((m for m in self.all() if m['id'] == since), None)
        return [m for m in msgs if ref is None or m['_n'] > ref['_n']]

    async def route(self, route):
        req = route.request
        if self.fail: return await route.fulfill(status=500, body='down')
        u = urlparse(req.url); parts = u.path.strip('/').split('/'); hdr = {'Access-Control-Allow-Origin': '*'}
        topics = parts[0].split(',')
        if req.method == 'POST':
            n = next(self.seq); self.posts += 1
            msg = {'id': f'm{n:06d}', '_n': n, 'time': int(time.time()), 'event': 'message', 'topic': topics[0], 'message': req.post_data}
            self.topics.setdefault(topics[0], []).append(msg)
            return await route.fulfill(status=200, headers=hdr, body=json.dumps({k: v for k, v in msg.items() if k != '_n'}))
        if len(parts) > 1 and parts[1] in ('sse', 'json'):
            since = parse_qs(u.query).get('since', ['all'])[0]
            msgs = sorted((m for t in topics for m in self.topics.get(t, [])), key=lambda m: m['_n'])
            msgs = [{k: v for k, v in m.items() if k != '_n'} for m in self._since(msgs, since)]
            if parts[1] == 'json':
                body = '\n'.join(json.dumps(m) for m in msgs)
                return await route.fulfill(status=200, headers=hdr, body=body + ('\n' if body else ''))
            body = 'retry: 300\n\n' + ''.join(f"id: {m['id']}\nevent: message\ndata: {json.dumps(m)}\n\n" for m in msgs)
            return await route.fulfill(status=200, headers={**hdr, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache'}, body=body)
        await route.fulfill(status=404, body='')
