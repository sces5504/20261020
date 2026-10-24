"""Package TC glyphs used by the current content/UI; new glyphs fall back to system CJK."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import hashlib, json
out = Path('art/ui/interface-suite-v1/fonts'); out.mkdir(exist_ok=True)
texts = [Path('content/generated/runtime.json').read_text()]
texts += [p.read_text() for p in Path('src/presentation').glob('*.ts')]
texts += [Path('src/style.css').read_text()]
chars = set(''.join(texts)) | {chr(i) for i in range(32, 256)}
chars |= set('★☆✧◆◇←→↑↓✓＋－／，。！？：「」『』（）・…%0123456789')
records=[]
for weight, label in [(400,'Regular'),(700,'Bold')]:
 source=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-'+label+'.ttc')
 font=TTFont(source, fontNumber=3)
 assert font['name'].getDebugName(1)=='Noto Sans CJK TC'
 options=subset.Options(); options.flavor='woff'; options.layout_features=['*']
 worker=subset.Subsetter(options=options); worker.populate(text=''.join(sorted(chars))); worker.subset(font)
 for entry in font['name'].names:
  names={1:'Galaxy UI TC',2:label,3:'GalaxyUITC-'+label+'-Subset',4:'Galaxy UI TC '+label,6:'GalaxyUITC-'+label,16:'Galaxy UI TC',17:label}
  if entry.nameID in names: entry.string=names[entry.nameID].encode(entry.getEncoding(),errors='replace')
 font.flavor='woff'; path=out/('galaxy-tc-'+str(weight)+'.woff'); font.save(path)
 records.append({'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'weight':weight,'source':'Noto Sans CJK TC '+label+'; installed noto-cjk TTC index 3','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'license':'SIL Open Font License 1.1','glyphPolicy':'Current content and UI subset; missing future characters use system TC fallback','format':'WOFF1'})
license_text=Path('/usr/share/doc/fonts-noto-cjk/copyright').read_text()
a=license_text.index('License: SIL-1.1\n', license_text.index('License: SIL-1.1\n')+1)
b=license_text.index('\nLicense: GPL-3+', a)
(out/'LICENSE.txt').write_text('Noto Sans CJK TC\nCopyright 2014-2021 Adobe (http://www.adobe.com/). Copyright 2010-2012 Google Corporation (distribution notices).\nSource: https://github.com/notofonts/noto-cjk\nSubset derivative for Galaxy Angel; family renamed Galaxy UI TC. Original copyright and license metadata retained.\n\n'+license_text[a:b]+'\n')
(out/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print('Packaged two self-hosted TC font subsets')
