import asyncio, os, json
from playwright.async_api import async_playwright
URL='http://localhost:8765/'; SH=os.path.join(os.path.dirname(__file__),'..','shots')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        c = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        await c.route('https://ntfy.sh/**', lambda r: r.fulfill(status=200, body=''))
        pg = await c.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.fill('#wName','Rohan'); await pg.click('#wGo')
        import datetime
        today = datetime.date.today(); wk = today - datetime.timedelta(days=today.weekday())
        await pg.evaluate("""([d, wk]) => { const S = JSON.parse(localStorage.getItem('twominds.v2'));
          S.streak = {cur: 9, best: 9, last: d}; S.season = {k: d.slice(0,7), p: 1460}; S.frames = ['bronze','silver','gold','flame']; S.me.frame = 'gold';
          S.friends = {aaaa1111: {i:'aaaa1111', n:'Ananya', c:'#38d6ff', code:'abcdef', at: Date.now()}, bbbb2222: {i:'bbbb2222', n:'Priya', c:'#c77dff', code:'ghijkl', at: Date.now()-1000}};
          S.rivals = {'id:aaaa1111': {n:'Ananya', c:'#38d6ff', w:4, l:5, d:0, at: Date.now()}, 'id:bbbb2222': {n:'Priya', c:'#c77dff', w:2, l:0, d:0, at: Date.now()}};
          S.week = {k: 'w' + wk, p: 640, g: 6}; S.fweek = {aaaa1111: {k: 'w' + wk, p: 720, g: 7}, bbbb2222: {k: 'w' + wk, p: 210, g: 2}};
          S.frameOf = {ananya: 'flame'}; S.lastWeek = {k:'w2026-11-02', board:[{n:'Ananya', p:910}]};
          localStorage.setItem('twominds.v2', JSON.stringify(S)); }""", [str(today), str(wk)])
        await pg.reload(); await pg.wait_for_timeout(600); await pg.screenshot(path=f'{SH}/r_home.png')
        await pg.click('.tab[data-go="friends"]'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'{SH}/r_friends.png')
        await pg.click('.tab[data-go="me"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('.season').scrollIntoView({block:'start'})"); await pg.wait_for_timeout(200)
        await pg.evaluate("document.getElementById('me').scrollTop -= 40"); await pg.screenshot(path=f'{SH}/r_season.png')
        for t, nm in [('emoji','r_emojiq'), ('flags','r_flagq'), ('mythology','r_mythq')]:
            await pg.click('.tab[data-go="topics"]'); await pg.click(f'#topics [data-topic="{t}"]'); await pg.click('#tpBot')
            await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=10000); await pg.wait_for_timeout(700); await pg.screenshot(path=f'{SH}/{nm}.png')
            await pg.click('#squit'); await pg.click('#squit'); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-go="topics"]'); await pg.wait_for_timeout(300); await pg.evaluate("document.getElementById('topics').scrollTop = 9999"); await pg.wait_for_timeout(200); await pg.screenshot(path=f'{SH}/r_topics.png')
        print('errors:', errs or 'none'); await b.close()
asyncio.run(main())
