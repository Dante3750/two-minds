import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:8765/'; OUT=sys.argv[1] if len(sys.argv)>1 else 'look'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        c = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await c.new_page()
        await pg.goto(URL); await pg.wait_for_selector('#mdMe')
        await pg.screenshot(path=f'../shots/{OUT}_0names.png')
        await pg.fill('#mdMe','Rohan'); await pg.fill('#mdPa','Ananya'); await pg.click('#mdGo'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'../shots/{OUT}_1home.png')
        await pg.click('.tab[data-go="topics"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{OUT}_2topics.png')
        await pg.click('#topics [data-topic="cricket"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{OUT}_3topic.png')
        await pg.click('#tpLink'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'../shots/{OUT}_4vs.png')
        await pg.wait_for_selector('#sOpts:not(.hide)', timeout=10000); await pg.wait_for_timeout(1200); await pg.screenshot(path=f'../shots/{OUT}_5solo.png')
        await pg.dispatch_event('#sOpts .opt >> nth=0','pointerdown'); await pg.wait_for_timeout(500); await pg.screenshot(path=f'../shots/{OUT}_6reveal.png')
        for r in range(6):
            await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=15000); await pg.wait_for_timeout(200)
            await pg.dispatch_event('#sOpts .opt >> nth=1','pointerdown')
            await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=15000)
        await pg.wait_for_selector('#results:not([hidden])'); await pg.wait_for_timeout(1200); await pg.screenshot(path=f'../shots/{OUT}_7results.png')
        await pg.click('#results [data-go="home"]'); await pg.click('#hmDuel'); await pg.click('#topics [data-topic="bollywood"]'); await pg.click('#tpDuel')
        await pg.wait_for_selector('#h0 .opts:not(.hide)', timeout=10000); await pg.wait_for_timeout(300)
        await pg.dispatch_event('#h0 .opt[data-i="0"]','pointerdown'); await pg.screenshot(path=f'../shots/{OUT}_8duel.png')
        await pg.dispatch_event('#h1 .opt[data-i="1"]','pointerdown'); await pg.wait_for_timeout(600); await pg.screenshot(path=f'../shots/{OUT}_9duelrev.png')
        await pg.click('#quitBtn'); await pg.click('#quitBtn'); await pg.wait_for_timeout(300)
        await pg.click('.tab[data-go="couple"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{OUT}_10couple.png')
        await pg.click('#cKnow'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'../shots/{OUT}_11cover.png')
        await pg.click('#cvGo'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'../shots/{OUT}_12know.png')
        await pg.click('#cplay .opt >> nth=0'); await pg.click('#cvQuit')
        await pg.click('.tab[data-go="me"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{OUT}_13me.png', full_page=False)
        await b.close()
asyncio.run(main())
