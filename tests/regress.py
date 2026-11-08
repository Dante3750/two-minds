import asyncio, base64, json
from playwright.async_api import async_playwright
URL='http://localhost:8765/'
def enc(o): return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
P=[[0,1500]]*7
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        c = await b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True)
        pg = await c.new_page(); errs=[]; dialogs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))
        await pg.goto(URL); await pg.evaluate("localStorage.setItem('twominds.v2', JSON.stringify({me:{name:'Ana',color:'#ff6b5a'},partner:{name:'Rohan',color:'#38d6ff'}}))")
        q=[[0,i] for i in range(7)]
        bad = [
          {'v':2,'k':'ch','t':'gk','q':q,'A':{'n':'X','c':'#fff','s':'<img src=x onerror=alert(1)>','p':P}},
          {'v':2,'k':'ch','t':'gk','q':q,'A':{'n':'X','c':'red"><img src=x onerror=alert(2)>','s':10,'p':P}},
          {'v':2,'k':'ch','t':'zzz','q':q,'A':{'n':'X','c':'#fff','s':10,'p':P}},
          {'v':2,'k':'res','t':'gk','q':q,'A':{'n':'X','c':'#fff','s':10,'p':P},'B':{'n':'Y','c':'#fff','s':'<b onmouseover=alert(3)>','p':P}},
        ]
        for i,o in enumerate(bad):
            await pg.goto(URL+'#c='+enc(o)); await pg.wait_for_timeout(700)
            opened = await pg.evaluate("!document.getElementById('incoming').hidden || !document.getElementById('board').hidden")
            print('bad link', i, 'NOT REJECTED' if opened else 'rejected')
        # valid 15s link opened by a 10s-setting phone: ghost keeps the sender's score
        good={'v':2,'k':'ch','t':'gk','q':q,'ms':15000,'A':{'i':'abc','n':'Rohan','c':'#38d6ff','s':0,'p':[[0,11500]]+[[-1,0]]*6}}
        good['A']['s']=0
        await pg.goto(URL+'#c='+enc(good)); await pg.wait_for_selector('#incGo'); await pg.fill('#incName','Ana'); await pg.click('#incGo')
        print('match timer ms:', await pg.evaluate("(()=>{return 0})()"))
        await pg.wait_for_selector('#sOpts:not(.hide)', timeout=10000)
        num = await pg.inner_text('#ringNum'); print('ring starts at', num)
        await pg.wait_for_timeout(15800)
        sc = await pg.inner_text('#soloOpp .sc'); print('ghost score after late answer (expect 13 = 10 + ceil(3.5s left of 15s)):', sc.split('\n')[0])
        print('errors:', errs, 'dialogs:', dialogs)
        await b.close()
asyncio.run(main())
