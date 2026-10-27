// Review probe: first-load request breakdown for a fresh player (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const rows:[string,number,number][]=[];const t0=Date.now();
 page.on('response',async r=>{try{const b=await r.body();rows.push([r.url().replace(server.url,''),b.length,Date.now()-t0]);}catch{}});
 await page.goto(server.url);await page.waitForSelector('canvas',{timeout:60000});
 console.log('canvas at',Date.now()-t0,'ms');
 await page.waitForTimeout(Number(process.env.WAIT??4000));
 rows.sort((a,b)=>b[1]-a[1]);
 const total=rows.reduce((s,r)=>s+r[1],0);
 console.log('requests',rows.length,'total MiB',(total/2**20).toFixed(2));
 for(const r of rows.slice(0,Number(process.env.TOP??25)))console.log((r[1]/1024).toFixed(0).padStart(6),'KiB',String(r[2]).padStart(5),'ms',r[0].slice(0,110));
}finally{await browser.close();await server.close();}
