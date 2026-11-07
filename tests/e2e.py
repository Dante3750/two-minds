import asyncio, re, sys
from playwright.async_api import async_playwright
URL='http://localhost:8765/'
async def play_solo(pg, pick=lambda i: 0, label=''):
    for r in range(7):
        await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=15000)
        await pg.wait_for_timeout(250)
        opts = await pg.query_selector_all('#sOpts .opt')
        await opts[pick(r)].dispatch_event('pointerdown')
        await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=15000)
async def main():
    errs=[]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        def mk(ctx_errs, tag):
            async def f():
                c = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
                pg = await c.new_page(); pg.on('pageerror', lambda e: ctx_errs.append(f'{tag}: {e}'))
                pg.on('console', lambda m: ctx_errs.append(f'{tag} console: {m.text}') if m.type=='error' and 'fonts' not in m.text else None)
                return c, pg
            return f
        # --- him: names + duel on one phone
        c1, him = await mk(errs,'him')()
        await him.goto(URL); await him.wait_for_selector('#mdMe', timeout=5000)
        await him.fill('#mdMe','Rohan'); await him.fill('#mdPa','Ananya'); await him.click('#mdGo')
        await him.screenshot(path='shots/home.png')
        await him.click('#hmDuel'); await him.wait_for_selector('#topics:not([hidden])')
        await him.screenshot(path='shots/topics.png', full_page=False)
        await him.click('#topics [data-topic="bollywood"]'); await him.wait_for_selector('#tpDuel')
        await him.screenshot(path='shots/topic.png')
        await him.click('#tpDuel')
        await him.wait_for_timeout(600); await him.screenshot(path='shots/vs.png')
        for r in range(7):
            await him.wait_for_selector('#h0 .opts:not(.hide)', timeout=15000)
            await him.wait_for_timeout(200)
            await him.dispatch_event('#h0 .opt[data-i="0"]','pointerdown')
            await him.wait_for_timeout(300)
            await him.dispatch_event('#h1 .opt[data-i="1"]','pointerdown')
            if r==6: await him.wait_for_timeout(400); await him.screenshot(path='shots/duel_bonus.png')
            await him.wait_for_function("document.querySelector('#h0 .opts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=15000)
        await him.wait_for_selector('#results:not([hidden])'); await him.wait_for_timeout(900)
        await him.screenshot(path='shots/duel_results.png', full_page=True)
        print('duel winner:', await him.inner_text('.winner'))
        # --- him: link challenge in cricket
        await him.click('#results [data-go="home"]')
        await him.click('#hmLink'); await him.click('#topics [data-topic="cricket"]'); await him.click('#tpLink')
        await him.wait_for_timeout(800); 
        await play_solo(him, lambda i: 0)
        await him.wait_for_selector('#results:not([hidden])'); await him.wait_for_timeout(500)
        await him.screenshot(path='shots/link_sent.png', full_page=True)
        await him.click('#rShare'); await him.wait_for_timeout(400)
        link = await him.input_value('#lurl'); print('link length', len(link))
        # --- her: separate phone opens link
        c2, her = await mk(errs,'her')()
        await her.goto(link); await her.wait_for_selector('#incGo', timeout=5000)
        await her.screenshot(path='shots/incoming.png')
        await her.fill('#incName','Ananya'); await her.click('#incGo')
        await her.wait_for_timeout(2600); await her.wait_for_selector('#sOpts:not(.hide)', timeout=10000)
        await her.wait_for_timeout(1500); await her.screenshot(path='shots/her_round.png')
        await play_solo(her, lambda i: 0)
        await her.wait_for_selector('#results:not([hidden])'); await her.wait_for_timeout(600)
        await her.screenshot(path='shots/her_results.png', full_page=True)
        print('her result:', await her.inner_text('.winner'))
        await her.click('#rShare'); await her.wait_for_timeout(400)
        rlink = await her.input_value('#lurl')
        # --- him opens result
        await him.goto(rlink); await him.wait_for_selector('#incoming:not([hidden]) .winner', timeout=5000)
        print('him sees:', await him.inner_text('#incoming .winner'))
        await him.screenshot(path='shots/final_result.png', full_page=True)
        # --- couple: know me
        await him.goto(URL); await him.click('.tab[data-go="couple"]'); await him.click('#cKnow')
        for k in range(10):
            await him.click('#cvGo'); await him.click('#cplay .opt >> nth=1')
            await him.click('#cvGo'); 
            if k==0: await him.screenshot(path='shots/know_guess.png')
            await him.click('#cplay .opt >> nth=1' if k%2 else '#cplay .opt >> nth=2'); await him.click('#kNext')
        await him.wait_for_selector('#coupleRes:not([hidden])'); print('know pct', await him.inner_text('.big-pct'))
        await him.screenshot(path='shots/know_res.png')
        await him.click('#crAgain') ; await him.click('#cvQuit')
        await him.click('#cLikely')
        for k in range(10):
            await him.click('#cvGo'); await him.click('#cplay [data-v="0"]'); await him.click('#cvGo'); await him.click(f'#cplay [data-v="{k%2}"]')
            if k==0: await him.screenshot(path='shots/likely_reveal.png')
            await him.click('#lNext')
        print('likely pct', await him.inner_text('.big-pct'))
        # --- daily + bot quick
        await him.goto(URL); await him.click('#hmDaily'); await play_solo(him, lambda i: i%4)
        await him.wait_for_selector('#results:not([hidden])'); print('daily:', await him.inner_text('.winner'))
        await him.goto(URL); await him.click('.tab[data-go="me"]'); await him.wait_for_timeout(300)
        await him.screenshot(path='shots/profile.png', full_page=True)
        await b.close()
    print('ERRORS:', errs if errs else 'none')
import os; os.makedirs('shots', exist_ok=True)
asyncio.run(main())
