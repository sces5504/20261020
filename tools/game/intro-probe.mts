// Review probe: what a brand-new player sees on first load (not a release gate).
import {chromium} from '../node_modules/playwright/index.mjs';
import {serveBuilt} from './serve-built.mjs';
const server=await serveBuilt(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.goto(server.url);await page.waitForSelector('canvas',{timeout:60000});
 for(let i=0;i<4;i++){
  await page.waitForTimeout(1500);
  console.log(i, await page.evaluate(()=>({scene:!!document.querySelector('.story-scene'),line:document.querySelector('.story-line')?.textContent?.slice(0,40),speaker:document.querySelector('.story-speaker, .story-name')?.textContent,skip:!!document.querySelector('[data-action="story-skip"]'),wallet:document.querySelector('.resources, #resources')?.textContent?.slice(0,80)})));
 }
 await page.screenshot({path:'.artifacts/intro-probe.png'});
}finally{await browser.close();await server.close();}
