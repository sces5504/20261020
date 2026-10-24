// Review captures: exploration wedge while flying, idle and after zoom (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
const out=process.argv.find((a,i)=>i>1&&!a.startsWith('--'))??'.artifacts/flock';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const save=newSave(p,Date.now(),'flock');save.storySeen=p.quests.map(q=>q.id);save.quests=p.quests.filter(q=>!q.repeat).map(q=>q.id);
 const extra=p.characters.filter(c=>!save.roster.some(o=>o.definition===c.id)).slice(0,1);
 extra.forEach((c,i)=>save.roster.push({id:'flock-'+i,definition:c.id,level:1,hp:400,resonance:0} as any));
 save.team=save.roster.slice(0,4).map(o=>o.id);
 const reg=p.regions.find(r=>r.id===save.region)!;if(!process.argv.includes('--battle')){save.x=reg.width-260;save.y=reg.height-260;}
 await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack:p,save});
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(1500);
 console.log('zoom key at start', await page.evaluate(()=>localStorage.getItem('stella:explore-zoom')));
 await page.locator('#space').screenshot({path:`${out}/idle.png`});
 const box=(await page.locator('#joystick').boundingBox())!;
 const cx=box.x+box.width/2,cy=box.y+box.height/2;
 await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(process.argv.includes('--battle')?cx+50:cx-30,process.argv.includes('--battle')?cy-10:cy-45,{steps:4});
 for(const k of [1,2,3]){await page.waitForTimeout(700);await page.locator('#space').screenshot({path:`${out}/fly-${k}.png`});}
 await page.mouse.move(cx-10,cy+50,{steps:4});await page.waitForTimeout(600);await page.locator('#space').screenshot({path:`${out}/turn.png`});
 await page.mouse.up();await page.waitForTimeout(1800);await page.locator('#space').screenshot({path:`${out}/settle.png`});
 await page.evaluate(()=>localStorage.setItem('stella:explore-zoom','1.4'));await page.reload();await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(1500);
 console.log('zoom after reload', await page.evaluate(()=>localStorage.getItem('stella:explore-zoom')));
 await page.locator('#space').screenshot({path:`${out}/kept-zoom.png`});
 await context.close();
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
