"""Quick match: strangers who pick the same topic get paired automatically."""
import asyncio, json, os, time
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright
URL='http://localhost:8765/'; SH=os.path.join(os.path.dirname(__file__),'..','shots')
RELAY={}; errs=[]
async def relay(route):
    req=route.request; u=urlparse(req.url); parts=u.path.strip('/').split('/'); topic=parts[0]; hdr={'Access-Control-Allow-Origin':'*'}
    if req.method=='POST':
        msg={'id':f'{topic}-{len(RELAY.get(topic,[]))}','time':int(time.time()),'event':'message','topic':topic,'message':req.post_data}
        RELAY.setdefault(topic,[]).append(msg); return await route.fulfill(status=200,headers=hdr,body=json.dumps(msg))
    if len(parts)>1 and parts[1] in ('sse','json'):
        since=parse_qs(u.query).get('since',['all'])[0]; msgs=RELAY.get(topic,[])
        if since.endswith('s') and since[:-1].isdigit(): msgs=[m for m in msgs if m['time']>=time.time()-int(since[:-1])]
        if parts[1]=='json': return await route.fulfill(status=200,headers=hdr,body='\n'.join(json.dumps(m) for m in msgs))
        body='retry: 300\n\n'+''.join(f"id: {m['id']}\nevent: message\ndata: {json.dumps(m)}\n\n" for m in msgs)
        return await route.fulfill(status=200,headers={**hdr,'Content-Type':'text/event-stream'},body=body)
    await route.fulfill(status=404,body='')
async def phone(b,name):
    c=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,is_mobile=True)
    await c.route('https://ntfy.sh/**',relay); pg=await c.new_page(); pg.on('pageerror',lambda e: errs.append(f'{name}: {e}'))
    await pg.goto(URL); await pg.fill('#wName',name); await pg.click('#wGo'); return pg
async def quick(pg, topic):
    await pg.click('#hmQuick'); await pg.click(f'#topics [data-topic="{topic}"]'); await pg.click('#tpQuick')
async def answer(pg, gap=200):
    for r in range(7):
        await pg.wait_for_selector('#sOpts:not(.hide) .opt',timeout=25000); await pg.wait_for_timeout(gap)
        o=await pg.query_selector_all('#sOpts .opt'); await o[r%4].dispatch_event('pointerdown')
        await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden",timeout=25000)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        a=await phone(b,'Rohan'); c=await phone(b,'Ananya')
        await a.screenshot(path=f'{SH}/q_home.png')
        await quick(a,'cricket'); await a.wait_for_timeout(1500); await a.screenshot(path=f'{SH}/q_search.png')
        await quick(c,'cricket')
        t0=time.time()
        await a.wait_for_selector('#solo:not([hidden])',timeout=15000); await c.wait_for_selector('#solo:not([hidden])',timeout=15000)
        print(f'matched automatically in {time.time()-t0:.1f}s')
        await a.wait_for_selector('#sOpts:not(.hide) .opt',timeout=15000); await a.wait_for_timeout(500); await a.screenshot(path=f'{SH}/q_round.png')
        await asyncio.gather(answer(a), answer(c, 600))
        await a.wait_for_selector('#results:not([hidden])',timeout=20000); await c.wait_for_selector('#results:not([hidden])',timeout=20000)
        sa=[await a.get_attribute('#results .board b >> nth=0','data-count'), await a.get_attribute('#results .board b >> nth=1','data-count')]
        sc=[await c.get_attribute('#results .board b >> nth=0','data-count'), await c.get_attribute('#results .board b >> nth=1','data-count')]
        print('scores consistent:', sa==sc[::-1], sa)
        await a.click('#lvHome'); await c.click('#lvHome')
        # three people search the same topic at once: two match, the third keeps searching
        p3=await phone(b,'Priya')
        await asyncio.gather(quick(a,'space'), quick(c,'space'), quick(p3,'space'))
        await a.wait_for_timeout(9000)
        states={}
        for nm,pg in (('Rohan',a),('Ananya',c),('Priya',p3)):
            states[nm]= 'playing' if await pg.evaluate("!document.getElementById('solo').hidden || !document.getElementById('vs').hidden") else 'searching'
        print('three searchers:', states, '| pairs formed:', list(states.values()).count('playing')//2)
        left=[pg for nm,pg in (('Rohan',a),('Ananya',c),('Priya',p3)) if states[nm]=='searching']
        if left:
            await left[0].wait_for_selector('#mmBot',timeout=30000); await left[0].screenshot(path=f'{SH}/q_offer.png'); print('no-one-around offer shown: yes')
            await left[0].click('#mmBot'); await left[0].wait_for_selector('#solo:not([hidden])',timeout=8000); print('fell back to bot: yes')
        # cancel leaves cleanly
        p4=await phone(b,'Sam'); await quick(p4,'books'); await p4.wait_for_timeout(800); await p4.click('#mmCancel')
        print('cancel returns home:', await p4.evaluate("!document.getElementById('home').hidden"))
        await b.close()
    print('ERRORS:', errs or 'none')
asyncio.run(main())
