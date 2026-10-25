import {readFileSync} from 'node:fs';
import {assemble} from '../../src/content/loader.ts';
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const m=read('content/manifest.json');
export const extension=read('content/extensions/chronicle-next-three.json');
export const pack=assemble(read('content/'+m.base),[...m.extensions.map((path:string)=>read('content/'+path)),extension],m.regionPresentation,m.characterPresentation,m.regionRoutes);
