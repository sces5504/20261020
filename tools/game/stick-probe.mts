// Review probe: phone floating joystick vs map pan vs tap-to-move (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
import {published as p} from '../../src/content/index.ts';
import {newSave} from '../../src/domain/model.ts';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const save=newSave(p,Date.now(),'stick');save.storySeen=p.quests.map(q=>q.id);save.quests=p.quests.filter(q=>!q.repeat).map(q=>q.id);
 const reg=p.regions.find(r=>r.id===save.region)!;save.x=reg.width/2;save.y=reg.height/2;
 const pack=structuredClone(p);for(const r of pack.regions) r.patrols=[];
 await page.goto(server.url+'gallery.html');await page.evaluate(async ({pack,save})=>{const r=indexedDB.open('stella-maiden-m1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');await new Promise(res=>r.onsuccess=res);const tx=r.result.transaction('records','readwrite');tx.objectStore('records').put(pack,'content:test');tx.objectStore('records').put(save,'save:test');await new Promise(res=>tx.oncomplete=res);r.result.close()},{pack,save});
 await page.goto(server.url+'#/test');await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(1500);
 const cdp=await context.newCDPSession(page);
 const touch=async(type:string,x?:number,y?:number)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:x===undefined?[]:[{x,y,id:1}]} as any);
 const pos=async()=>{await page.waitForTimeout(3300);return page.evaluate(async()=>{const r=indexedDB.open('stella-maiden-m1',1);await new Promise(res=>r.onsuccess=res);const q=r.result.transaction('records').objectStore('records').get('save:test');await new Promise(res=>q.onsuccess=res);r.result.close();const s=(q as any).result;return {x:Math.round(s.x),y:Math.round(s.y)}})};
 const a=await pos();console.log('start',a);
 // 1) drag in thumb zone = joystick (steer up)
 await touch('touchStart',90,620);for(let i=1;i<=5;i++){await touch('touchMove',90,620-i*12);await page.waitForTimeout(30);}
 console.log('joystick active class',await page.locator('#joystick.active').count());
 await page.screenshot({path:'.artifacts/stick-active.png'});
 await page.waitForTimeout(1500);await touch('touchEnd');
 const b=await pos();console.log('after stick',b,'dy',b.y-a.y);
 // 2) drag elsewhere = pan only (no flying)
 await touch('touchStart',300,300);for(let i=1;i<=6;i++){await touch('touchMove',300-i*20,300);await page.waitForTimeout(30);}await touch('touchEnd');
 const c=await pos();console.log('after pan',c,'moved',Math.hypot(c.x-b.x,c.y-b.y));
 // 3) quick tap in thumb zone = tap-to-move
 await touch('touchStart',60,700);await page.waitForTimeout(60);await touch('touchEnd');
 const d=await pos();console.log('after zone tap',d,'moved',Math.hypot(d.x-c.x,d.y-c.y));
}finally{await browser.close();await server.close();}
console.log('pageerrors',errors.length,errors.slice(0,3));
