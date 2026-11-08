"""Live two-phone match with a simulated ntfy relay that also serves server-sent events."""
import asyncio, json, os, time
from urllib.parse import urlparse
from playwright.async_api import async_playwright
URL = 'http://localhost:8765/'; SHOTS = os.path.join(os.path.dirname(__file__), '..', 'shots')
RELAY = {}; errs = []; DROP = {'sam': False}
async def relay(route):
    req = route.request; u = urlparse(req.url); parts = u.path.strip('/').split('/'); topic = parts[0]
    hdr = {'Access-Control-Allow-Origin': '*'}
    if req.method == 'POST':
        msg = {'id': f'{topic}-{len(RELAY.get(topic, []))}', 'time': int(time.time()), 'event': 'message', 'topic': topic, 'message': req.post_data}
        RELAY.setdefault(topic, []).append(msg); return await route.fulfill(status=200, headers=hdr, body=json.dumps(msg))
    if len(parts) > 1 and parts[1] == 'sse':
        body = 'retry: 250\n\n' + ''.join(f"id: {m['id']}\nevent: message\ndata: {json.dumps(m)}\n\n" for m in RELAY.get(topic, []))
        return await route.fulfill(status=200, headers={**hdr, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache'}, body=body)
    if len(parts) > 1 and parts[1] == 'json':
        return await route.fulfill(status=200, headers=hdr, body='\n'.join(json.dumps(m) for m in RELAY.get(topic, [])))
    await route.fulfill(status=404, body='')
async def phone(b, tag, name):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    await c.route('https://ntfy.sh/**', relay)
    pg = await c.new_page()
    pg.on('pageerror', lambda e: errs.append(f'{tag}: {e}'))
    pg.on('console', lambda m: errs.append(f'{tag} console: {m.text}') if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'EventSource' not in m.text else None)
    await pg.goto(URL); await pg.wait_for_selector('#wName'); await pg.fill('#wName', name); await pg.click('#wGo')
    return c, pg
async def answer_rounds(pg, pick, wait_extra=0, rounds=7):
    for r in range(rounds):
        await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=20000)
        await pg.wait_for_timeout(200 + wait_extra)
        opts = await pg.query_selector_all('#sOpts .opt'); await opts[pick(r)].dispatch_event('pointerdown')
        await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=25000)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        _, him = await phone(b, 'him', 'Rohan'); _, her = await phone(b, 'her', 'Ananya')
        await him.click('#hmLive'); await him.click('#topics [data-topic="movies"]' if False else '#topics [data-topic="india"]'); await him.click('#tpLive')
        await him.wait_for_selector('#lobby:not([hidden])'); await him.click('#lbShare'); await him.wait_for_timeout(300)
        link = await him.input_value('#lurl'); await him.screenshot(path=f'{SHOTS}/lv_lobby.png')
        await her.goto(link); await her.wait_for_selector('#incGo'); await her.screenshot(path=f'{SHOTS}/lv_join.png')
        await her.click('#incGo')
        await him.wait_for_selector('#vs:not([hidden])', timeout=8000); await her.wait_for_selector('#vs:not([hidden])', timeout=8000)
        print('both reached VS')
        await him.wait_for_timeout(500); await him.screenshot(path=f'{SHOTS}/lv_vs.png')
        async def h(): await answer_rounds(him, lambda r: 0)
        async def a():
            await her.wait_for_selector('#sOpts:not(.hide) .opt', timeout=20000)
            await her.wait_for_timeout(1400); await her.screenshot(path=f'{SHOTS}/lv_her_wait.png')
            await answer_rounds(her, lambda r: 0 if r % 2 else 1, wait_extra=900)
        await asyncio.gather(h(), a())
        await him.wait_for_selector('#results:not([hidden])', timeout=15000); await her.wait_for_selector('#results:not([hidden])', timeout=15000)
        s_him = [await him.get_attribute('#results .board b >> nth=0','data-count'), await him.get_attribute('#results .board b >> nth=1','data-count')]
        s_her = [await her.get_attribute('#results .board b >> nth=0','data-count'), await her.get_attribute('#results .board b >> nth=1','data-count')]
        print('him sees', s_him, '| her sees', s_her, '| consistent:', s_him == s_her[::-1])
        await him.wait_for_timeout(600); await him.screenshot(path=f'{SHOTS}/lv_results.png')
        # rematch
        await her.click('#lvRe'); await him.wait_for_selector('#rmYes', timeout=8000); await him.screenshot(path=f'{SHOTS}/lv_offer.png')
        await him.click('#rmYes')
        await him.wait_for_selector('#vs:not([hidden])', timeout=8000); await her.wait_for_selector('#vs:not([hidden])', timeout=8000); print('rematch started on both')
        # she drops out mid-match: he must not get stuck
        await her.wait_for_selector('#sOpts:not(.hide) .opt', timeout=20000); await her.close()
        t0 = time.time(); await answer_rounds(him, lambda r: 0, rounds=7)
        await him.wait_for_selector('#results:not([hidden])', timeout=30000); print(f'finished alone after drop in {time.time()-t0:.0f}s')
        # a third phone joining a full room is told so
        await him.click('#lvHome'); await him.click('#hmLive'); await him.click('#topics [data-topic="gk"]'); await him.click('#tpLive')
        await him.click('#lbShare'); await him.wait_for_timeout(300); link2 = await him.input_value('#lurl')
        _, p2 = await phone(b, 'priya', 'Priya'); _, p3 = await phone(b, 'sam', 'Sam')
        await p2.goto(link2); await p2.click('#incGo'); await p2.wait_for_timeout(3000)
        print('host LV:', await him.evaluate("JSON.stringify({cur: (document.querySelector('section:not([hidden])')||{}).id, vs: !document.getElementById('vs').hidden})"))
        print('p2 state:', await p2.evaluate("(document.getElementById('joinState')||{}).textContent"), await p2.evaluate("(document.querySelector('section:not([hidden])')||{}).id"))
        topics = [t for t in RELAY if 'live' in t]; print('relay topics:', [(t[-6:], [json.loads(m['message'])['type'] for m in RELAY[t]]) for t in topics])
        assert await p2.evaluate("!document.getElementById('solo').hidden"), 'p2 should be in the match'
        await p3.goto(link2); await p3.click('#incGo'); await p3.wait_for_selector('#joinState.bad', timeout=8000)
        print('third phone:', await p3.inner_text('#joinState'))
        await b.close()
    print('ERRORS:', errs or 'none')
asyncio.run(main())
