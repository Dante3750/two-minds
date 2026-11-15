"""A stand-in for Supabase during the emulator test: email-code sign-in (the code is always 123456)
and /rest/v1 forwarded to a local PostgREST. Never used outside CI."""
import base64, hashlib, hmac, json, os, time, uuid, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import psycopg

SECRET = os.environ.get('JWT_SECRET', 'e2e-secret-e2e-secret-e2e-secret-123')
DB = os.environ.get('DB_DSN', 'host=localhost user=postgres password=postgres dbname=twominds_test')
REST = 'http://127.0.0.1:3000'
refresh = {}

def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def jwt(sub, email):
    h = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    p = b64(json.dumps({'sub': sub, 'email': email, 'role': 'authenticated', 'aud': 'authenticated', 'exp': int(time.time()) + 3600}).encode())
    return f'{h}.{p}.' + b64(hmac.new(SECRET.encode(), f'{h}.{p}'.encode(), hashlib.sha256).digest())

def session(email):
    with psycopg.connect(DB, autocommit=True) as c:
        row = c.execute("insert into auth.users (email) values (%s) on conflict (email) do update set email = excluded.email returning id", (email,)).fetchone()
    uid = str(row[0]); rt = uuid.uuid4().hex; refresh[rt] = (uid, email)
    return {'access_token': jwt(uid, email), 'refresh_token': rt, 'expires_in': 3600, 'token_type': 'bearer', 'user': {'id': uid, 'email': email}}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, code, body, ctype='application/json'):
        b = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def body(self):
        n = int(self.headers.get('Content-Length') or 0); return self.rfile.read(n) if n else b''
    def proxy(self, method):
        data = self.body() if method == 'POST' else None
        req = urllib.request.Request(REST + self.path[len('/rest/v1'):], data=data, method=method)
        for k in ('Authorization', 'Content-Type', 'Accept', 'Prefer'):
            if self.headers.get(k): req.add_header(k, self.headers[k])
        try:
            with urllib.request.urlopen(req, timeout=20) as r: self.send(r.status, r.read(), r.headers.get('Content-Type', 'application/json'))
        except urllib.error.HTTPError as e: self.send(e.code, e.read(), e.headers.get('Content-Type', 'application/json'))
    def do_GET(self):
        if self.path.startswith('/rest/v1'): return self.proxy('GET')
        self.send(404, {'message': 'not found'})
    def do_POST(self):
        if self.path.startswith('/rest/v1'): return self.proxy('POST')
        b = json.loads(self.body() or b'{}')
        if self.path.startswith('/auth/v1/otp'): return self.send(200, {})
        if self.path.startswith('/auth/v1/verify'):
            if b.get('token') != '123456': return self.send(400, {'msg': 'Token has expired or is invalid'})
            return self.send(200, session(b['email']))
        if self.path.startswith('/auth/v1/token'):
            r = refresh.get(b.get('refresh_token'))
            return self.send(200, session(r[1])) if r else self.send(400, {'msg': 'Invalid Refresh Token'})
        self.send(404, {'message': 'not found'})

if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', 8000), H).serve_forever()
