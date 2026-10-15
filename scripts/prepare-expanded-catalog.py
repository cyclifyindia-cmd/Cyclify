"""Prepare Cyclify inventory from an order sheet and cached product facts.

Input reference files stay outside the published storefront. The output contains
original summaries, technical facts, local photos and order-sheet stock only.
"""
import argparse
import collections
import concurrent.futures
from decimal import Decimal
import hashlib
from functools import lru_cache
import html as html_text
import io
import json
from pathlib import Path
import re
import sys
import time
import urllib.request
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import zipfile
import xml.etree.ElementTree as ET

import openpyxl
from openpyxl.utils.cell import range_boundaries
from lxml import html
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--workbook', required=True)
parser.add_argument('--references', required=True)
parser.add_argument('--download-images', action='store_true')
args = parser.parse_args()
reference_root = Path(args.references)
targets = json.loads((reference_root/'wesnap-model-matches.json').read_text(encoding='utf-8'))
public_catalogue = json.loads((reference_root/'reference-catalog.json').read_text(encoding='utf-8'))
cache = reference_root/'product-reference-cache'
stock_rows = collections.defaultdict(list)
diagnostics = []

def text(value):
    value = re.sub(r'\s+', ' ', html_text.unescape(str(value or ''))).strip()
    return re.sub(r'Dura Ace\s+6270', 'Dura Ace', value, flags=re.I)

def norm(value):
    value = text(value).lower().replace('fevero','favero').replace('colour','color')
    return re.sub(r'[^a-z0-9]+','',value)

def size_norm(value):
    value=text(value).lower().replace('cm','').replace('mm','').strip()
    if re.fullmatch(r'\d+(?:\.\d+)?',value):
        number=Decimal(value)
        if 400 <= number <= 650: number/=10
        return format(number.normalize(),'f')
    return norm(value)

def same_model(brand, category, model):
    return next((t for t in targets if t['brand']==brand and t['category']==category and norm(t['model'])==norm(model)), None)

def identify(sheet, model, type_value=''):
    raw=text(model)
    lower=raw.lower()
    category='Complete bikes'
    brand='Basso' if sheet=='Basso Venta R' else sheet
    if sheet=='Colnago':
        category={'frame kit':'Framesets','bike':'Complete bikes','handlebar':'Components and tools'}.get(text(type_value).lower(),category)
        raw=re.sub(r'^Colnago\s+','',raw,flags=re.I)
    elif sheet=='Basso Venta R': raw='Venta R'
    elif sheet=='Basso':
        category='Framesets' if re.search(r'\bframe',lower) else category
        raw=re.sub(r'^Basso\s+(?:(?:Frame Kit|Frame)\s+)?','',raw,flags=re.I)
    elif sheet=='Cinelli': category='Framesets'
    elif sheet=='Pardus':
        category={'frame kit':'Framesets','bike':'Complete bikes','wheel':'Wheels'}.get(text(type_value).lower(),category)
        if category=='Wheels': raw='MVMT M-Bronze 50'
    elif sheet=='Gusto':
        category='Framesets' if lower.startswith('frame') else ('Components and tools' if 'handlebar' in lower else category)
        raw=re.sub(r'^(?:FRAME\s+)?(?:GUSTO\s+)?','',raw,flags=re.I)
        raw=re.sub(r'\s*\([^)]*\)','',raw).strip()
        if 'handlebar' in lower: raw='Attaque integrated carbon handlebar'
    elif sheet=='Felt':
        category='Framesets' if lower.endswith('frame') else category
        raw=re.sub(r'\|',' ',raw)
        raw=re.sub(r'\s+Frame$','',raw,flags=re.I)
        raw=raw.replace(', Rim Brake',' Rim Brake')
    elif sheet=='Orbea':
        category='Framesets' if 'frameset' in lower else category
        raw=re.sub(r'^ORBEA\s+','',raw,flags=re.I)
        raw=re.sub(r'\s*\(\s*Frameset\s*\)','',raw,flags=re.I)
        if norm(raw)=='orcam30i105di2': raw='Orca M30i 105 Di2'
    elif sheet=='Element':
        raw=re.sub(r'^ELEMENT\s+','',raw,flags=re.I)
        raw=re.sub(r'\s*\(\s*700C\s*\)|\s+NEW 2022','',raw,flags=re.I)
    elif sheet in ['Reynolds','Fulcrum','Vision']:
        category='Wheels'
        raw=re.sub(r'^(Reynolds|Fulcrum|Vision)\s+','',raw,flags=re.I)
        if sheet=='Vision' and raw=='XDR BODY': category='Components and tools';raw='XDR body'
    elif sheet=='Favero':
        category='Power-meter pedals'
        raw=re.sub(r'^(Favero|Fevero)\s+','',raw,flags=re.I)
    elif sheet=='Rudy Project':
        category='Helmets and eyewear'
        for t in sorted([t for t in targets if t['brand']==brand],key=lambda t:len(t['model']),reverse=True):
            if norm(t['model']) in norm(raw): return t
    elif sheet=='100%':
        for t in sorted([t for t in targets if t['brand']==brand],key=lambda t:len(t['model']),reverse=True):
            key=norm(t['model']).replace('cap','')
            if norm(raw).startswith(key): return t
    elif sheet=='Zone3':
        lower=lower.replace('zone3 ','')
        substitutions={
            'premium aerodome':'Premium Aerodome Elite 5/3mm buoyancy shorts',
            'buoyancy shorts originals':'Originals 5/3mm buoyancy shorts',
            'buoyancy shorts - the active':'The Active 3/2mm buoyancy shorts',
            'attack goggles':'Attack goggles','venator-x':'Venator-X goggles','volare':'Volare goggles',
            'silicone swim cap':'Silicone swim cap','race num':'Race number belt with gel loops',
            'elastic shoe laces':'Elastic shoe laces','swim safety buoy':'Swim safety buoy/dry bag 28L'}
        for key,value in substitutions.items():
            if key in lower: return same_model(brand,'Clothing, triathlon and swim',value)
        raw=re.sub(r'\s*(?:-\s*)?(?:XXS|XS|S-M|SM|ST|S|MT|ML|M|L|XL|XXL|28|30|32)$','',raw).strip()
        raw=re.sub(r'\s*\([^)]*\)','',raw)
        raw=raw.replace('Iconic Jammer','Iconic jammers')
        return same_model(brand,'Clothing, triathlon and swim',raw)
    elif sheet=='MB Wear':
        category='Clothing, triathlon and swim'
        raw='Comfort jersey' if lower.startswith('comfort') else ('UltraLight Smile jersey' if lower.startswith('ultralight') else ("Men's bib shorts" if 'man' in lower else "Women's bib shorts"))
    elif sheet=='Selle Italia':
        category='Components and tools'
        raw=re.sub(r'^Selle\s+','',raw,flags=re.I).replace('Watt SF BLK TI 316','Watt SF TI 316')
    elif sheet=='Control Tech':
        category='Components and tools'
        if 'rib bottle' in lower: raw='Rib bottle cage'
        elif 'tri power' in lower: raw='Tri Power Unit'
        elif 'cougar stem' in lower: raw='Cougar alloy stem'
        elif 'cougar fl4' in lower: raw='Cougar FL4 Alloy Handlebar RA-563'
        elif 'cls fl4' in lower: raw='CLS FL4 Compact Handlebar RA-544'
        elif 'sla compact' in lower: raw='SLA Compact Road Bar RA-513'
        elif 'falcon' in lower: raw='Falcon TT Bar J-Bend'
        else: raw='Time Zone Hydration System'
    elif sheet=='Scicon':
        category='Bike travel bags'
        raw='Triathlon AeroComfort 3.0' if 'triathlon' in lower else 'Road AeroComfort 3.0'
    elif sheet=='Giyo': category='Components and tools';raw='Tyre lever set'
    return same_model(brand,category,text(raw))

layouts={
    'Colnago':dict(model=1,type=0,colour=4,size=5,status=6,groupset=2,wheels=3),
    'Basso Venta R':dict(model=0,colour=1,size=4,status=5,groupset=2,wheels=3),
    'Cinelli':dict(model=2,type=1,colour=3,size=4,status=6),
    'Basso':dict(model=0,colour=1,size=2,status=3),
    'Pardus':dict(model=1,type=0,colour=2,size=5,status=6,groupset=3,wheels=4),
    'Gusto':dict(model=0,size=3,status=4,groupset=1,wheels=2),
    'Felt':dict(model=0,colour=1,size=2,status=3),
    'Orbea':dict(model=0,colour=1,size=2,status=3),
    'Reynolds':dict(model=1,status=2), 'Fulcrum':dict(model=0,status=2),
    'Vision':dict(model=0,status=2),'Element':dict(model=0,colour=1,size=2,status=3),
    'Favero':dict(model=1,status=2),'Rudy Project':dict(model=0,status=1),
    '100%':dict(model=0,status=1),'Zone3':dict(model=0,status=1),
    'MB Wear':dict(model=0,status=1),'Selle Italia':dict(model=0,status=1),
    'Control Tech':dict(model=2,size=3,status=7),'Scicon':dict(model=0,status=1),
    'Giyo':dict(model=1,status=2)}
book=openpyxl.load_workbook(args.workbook,read_only=True,data_only=True)
archive=zipfile.ZipFile(args.workbook)
namespace={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for sheet_index,sheet in enumerate(book,1):
    if sheet.title not in layouts: continue
    matrix=[list(row) for row in sheet.iter_rows(values_only=True)]
    worksheet=ET.fromstring(archive.read(f'xl/worksheets/sheet{sheet_index}.xml'))
    for merged in worksheet.findall('x:mergeCells/x:mergeCell',namespace):
        c1,r1,c2,r2=range_boundaries(merged.attrib['ref'])
        value=matrix[r1-1][c1-1]
        for row in range(r1-1,r2):
            for column in range(c1-1,c2): matrix[row][column]=value
    layout=layouts[sheet.title]
    for number,row in enumerate(matrix,1):
        model=row[layout['model']]
        status=text(row[layout['status']])
        if not model or status not in ['Available','Coming Soon','Contact for More Info']: continue
        target=identify(sheet.title,model,row[layout['type']] if 'type' in layout else '')
        if not target:
            diagnostics.append(dict(sheet=sheet.title,row=number,error='Model mapping missing',model=text(model)))
            continue
        record={key:text(row[column]) for key,column in layout.items()}
        record['row']=number
        record['sheet']=sheet.title
        for key in ['size','colour','groupset','wheels']: record.setdefault(key,'')
        if sheet.title=='Gusto':
            match=re.search(r'\(([^)]+)\)',text(model));record['colour']=match.group(1).title() if match else ''
        if sheet.title in ['Rudy Project','100%','Zone3','MB Wear']:
            record['variantLabel']=text(model)
            match=re.search(r'(?:\s+-\s+|\s+)(XS|S-M|SM|ST|S|MT|ML|M|L|XL|XXL|28|30|32)$',text(model))
            if match: record['size']=match.group(1)
        if sheet.title=='MB Wear':
            record['colour']=re.sub(r'^(Comfort|UltraLight Smile|Bib Short Man|Bib Short Women)\s+','',text(model),flags=re.I)
            record['colour']=re.sub(r'\s+(XS|S|M|L|XL)$','',record['colour'])
        if sheet.title=='Zone3' and not record['size']:
            if 'One Size' in text(model): record['size']='One Size'
        stock_rows[(target['brand'],target['category'],target['model'])].append(record)

def product_json(handle):
    cached=cache/(handle+'.json')
    if cached.exists(): return json.loads(cached.read_text(encoding='utf-8'))['product']
    if args.download_images: raise ValueError('Product photos and details not cached: '+handle)
    return next(p for p in public_catalogue if p['handle']==handle)

def reference_products(target):
    handle=target['url'].rsplit('/',1)[1]
    handles={handle}
    prefixes={
        ('Colnago','V4'):['colnago-v4-105-','colnago-v4-ultegra-'],
        ('Colnago','C68 Road'):['colnago-c68-road-'],
        ('Pardus','Spark Sport'):['pardus-spark-105-'],
        ('Pardus','Super AL 105'):['pardus-super-al-105-'],
        ('Pardus','Gomera Ultra'):['pardus-gomera-ultra-105-'],
        ('Pardus','Super Sport Gen2-105'):['pardus-super-sport-gen2-'],
        ('Gusto','Duro Evo DB'):['gusto-duro-evo-db-105-di2-','gusto-duro-evo-105-di2-'],
        ('Basso','Venta R'):['basso-venta-r-105-']}
    if target['category']=='Complete bikes':
        for p in public_catalogue:
            if any(p['handle'].startswith(prefix) for prefix in prefixes.get((target['brand'],target['model']),[])) and 'frameset' not in p['handle']:
                handles.add(p['handle'])
    for addition in {
        ('Rudy Project','Wingdream'):['rudy-project-wingdream-team-bahrain-victorious-helmet'],
        ('Rudy Project','Nytron'):['rudy-project-nytron-team-bahrain-victorious-helmet']}.get((target['brand'],target['model']),[]):
        if (cache/(addition+'.json')).exists(): handles.add(addition)
    return [product_json(h) for h in sorted(handles)]

def build_norm(value):
    value=text(value).lower()
    value=re.sub(r'\b(?:shimano|sram|fulcrum|vision|campagnolo|pardus|carbon|aero|road|bicycle|bike|pw|wheelset|wheels)\b','',value)
    value=re.sub(r'\b(?:6270|9270|8170)\b','',value)
    value=value.replace('12 speed','12s').replace('11 speed','11s').replace('12-speed','12s').replace('11-speed','11s')
    return norm(value)

def variant_dimensions(p,variant):
    values={text(o['name']).lower():text(variant.get('option'+str(o['position']))) for o in p.get('options',[])}
    size=next((value for key,value in values.items() if re.search(r'size|width|length|capacity|volume',key)), '')
    colour=next((value for key,value in values.items() if re.search(r'colou?r|frame|style|pattern',key) and 'size' not in key), '')
    parts=[value for key,value in values.items() if re.search(r'groupset|wheel',key)]
    return values,size,colour,' · '.join(parts)

def choose_reference(target,row,references):
    candidates=[]
    for p in references:
        for v in p['variants']:
            if row.get('_referenceVariantId') and row['_referenceVariantId']!=v['id']: continue
            values,size,colour,build=variant_dimensions(p,v)
            combined=' '.join([p['title'],v['title']])
            if not any(re.search(r'groupset|wheel',key) for key in values):
                factual,_=technical_data(p['handle'])
                combined+=' '+' '.join(spec for spec in factual if re.match(r'(?:groupset|wheelset|wheels|shifters|derailleur)\s*:',spec,re.I))
            groupset=row.get('groupset','')
            wheels=row.get('wheels','')
            if groupset and norm(groupset) not in ['na'] and build_norm(groupset) not in build_norm(combined): continue
            if wheels and norm(wheels) not in ['na']:
                required=build_norm(wheels)
                if required not in build_norm(combined) and required.replace('db','') not in build_norm(combined): continue
            special='special edition' in p['title'].lower() or 'special-edition' in p['handle']
            if row['colour']=='Special Edition' and not special: continue
            if row['colour']!='Special Edition' and special: continue
            score=0
            if row['size'] and size:
                score+=10 if size_norm(row['size'])==size_norm(size) else -5
            colour_value=row['colour']
            colour_aliases={'VDRD':'Red','VDBL':'Blue','VDDK':'Grey','Black':'Magma Black','White':'Pearl White'}
            if target['brand']=='Colnago': colour_value=colour_aliases.get(colour_value,colour_value)
            if colour_value and colour:
                reference_match=colour_aliases.get(colour,colour) if target['brand']=='Colnago' else colour
                one,two=norm(colour_value),norm(reference_match)
                score+=10 if one==two else (6 if one in two or two in one else -2)
            if row.get('variantLabel'):
                words=lambda s:set(re.findall(r'[a-z0-9]+',s.lower()))-{'one','size','os','the','lens','s','m','l','xl','xs'}
                wanted=words(row['variantLabel'])
                got=words(combined)
                score+=20*len(wanted&got)/max(1,len(wanted))
            if groupset: score+=3
            if wheels: score+=3
            candidates.append((score,p,v,values,size,colour,build))
    if not candidates:
        diagnostics.append(dict(brand=target['brand'],model=target['model'],row=row.get('row'),error='Build price not found',groupset=row.get('groupset'),wheels=row.get('wheels')))
        return None
    candidates.sort(key=lambda x:x[0],reverse=True)
    best=candidates[0]
    if len({v[2]['price'] for v in candidates})>1 and best[0] < 4:
        diagnostics.append(dict(brand=target['brand'],model=target['model'],row=row.get('row'),error='Ambiguous variant price'))
        return None
    return best

@lru_cache(maxsize=None)
def technical_data(handle):
    cached=cache/(handle+'.html')
    if not cached.exists():
        if args.download_images: raise ValueError('Technical page not cached: '+handle)
        return [],[]
    source=cached.read_text(encoding='utf-8')
    document=html.fromstring(source)
    specs=[]
    charts=[]
    for table in document.xpath('//main//table'):
        rows=[]
        for tr in table.xpath('.//tr'):
            values=[text(c.text_content()) for c in tr.xpath('./td|./th')]
            if any(values): rows.append(values)
        is_size_chart=rows and any(re.search(r'height|chest|inseam|waist|rider|size',cell,re.I) for cell in rows[0]) and len(rows)>2
        if len(rows)>2 and is_size_chart:
            charts.append(dict(headers=rows[0],rows=rows[1:]))
            continue
        for values in rows:
            if len(values)==2: label,value=values
            elif len(values)==1 and ':' in values[0]: label,value=values[0].split(':',1)
            else: continue
            if len(label)>75 or len(value)>600 or re.search(r'return|shipping|delivery|refund|contact|payment|warranty',label,re.I): continue
            if re.search(r'the\s*bike\s*affair|thebikeaffair|wesnap',label+' '+value,re.I): continue
            if label and value: specs.append(text(label)+': '+text(value))
    return list(dict.fromkeys(specs)), charts

def category_for(target):
    name=(target['brand']+' '+target['model']).lower()
    category=target['category']
    if category in ['Complete bikes','Framesets']:
        return 'bikes-frames.html',norm(target['brand']),'framesets' if category=='Framesets' else 'complete-bikes'
    if category=='Wheels': return 'wheels-tyres.html','wheels','alloy' if 'racing' in name else 'carbon'
    if category=='Power-meter pedals': return 'electronics.html','power-meter','power-meter-pedals'
    if category=='Helmets and eyewear':
        return 'wearables.html','helmets' if target['brand']=='Rudy Project' and target['model'] in ['Wingdream','Nytron','Spectrum','Volantis','Venger','Strym'] else 'eyewear',''
    if category=='Clothing, triathlon and swim':
        return 'wearables.html','swim-triathlon' if target['brand']=='Zone3' else ('headwear' if target['brand']=='100%' else 'jersey-shorts'),''
    if category=='Bike travel bags': return 'accessories.html','bags','travel-bags'
    if target['brand']=='Selle Italia': return ('accessories.html','tapes','bar-tape') if 'tape' in name else ('components.html','saddles','')
    if target['brand']=='Control Tech':
        if 'cage' in name or 'hydration' in name: return 'accessories.html','bottle-cages',''
        if 'tri power' in name: return 'accessories.html','bags',''
        return 'components.html','cockpit','stems' if 'stem' in name else ('aerobars' if 'falcon' in name else 'handlebars')
    if target['brand']=='Vision': return 'wheels-tyres.html','freehub-body',''
    if target['brand']=='Tripeak':
        if 'EMA-TT-' in target['model'] or 'EMA-GS52' in target['model']: return 'components.html','maintenance','tools'
        if 'EMA-CC' in target['model']: return 'components.html','bearings',''
        if 'EMA-DISC' in target['model']: return 'components.html','brakes','rotor-lockrings'
        return 'components.html','bottom-brackets',''
    raise ValueError('Unmapped category '+name)

image_jobs={}
def image_path(src):
    if not src: return ''
    src=src.replace('http:','https:')
    if src.startswith('//'): src='https:'+src
    digest=hashlib.sha256(src.encode()).hexdigest()[:18]
    local='assets/products/expanded/'+digest+'.webp'
    image_jobs[src]=local
    return local

def variant_image(p,v):
    images=p.get('images',[])
    return next((i['src'] for i in images if i.get('id')==v.get('image_id') or v['id'] in i.get('variant_ids',[])), images[0]['src'] if images else '')

products=[]
for index,target in enumerate(targets):
    if not target['matched']: continue
    product_id=900001+index
    key=(target['brand'],target['category'],target['model'])
    references=reference_products(target)
    reference=next(p for p in references if p['handle']==target['url'].rsplit('/',1)[1])
    rows=stock_rows[key]
    if target['brand']=='Tripeak':
        prefixes=[target['model']] if target['model']!='EMA-GS52' else ['EMA-GS52-']
        rows=[dict(size='',colour='',groupset='',wheels='',status='Available',variantLabel=v['title'],sku=v.get('sku',''),_referenceVariantId=v['id']) for p in references for v in p['variants'] if any(str(v.get('sku','')).startswith(prefix) for prefix in prefixes)]
    if not rows:
        diagnostics.append(dict(brand=target['brand'],model=target['model'],error='No stock rows'))
        continue
    if len(rows)==1 and not any(rows[0].get(k) for k in ['size','colour','groupset','wheels','variantLabel']):
        rows=[{**rows[0],'_referenceVariantId':v['id']} for p in references for v in p['variants']]
    expanded_rows=[]
    for row in rows:
        if row.get('size') or row.get('_referenceVariantId'):
            expanded_rows.append(row)
            continue
        selected=choose_reference(target,row,references)
        if selected is None: continue
        _,p,v,values,_,_,_=selected
        size_keys=[key for key in values if re.search(r'size|width|length|capacity|volume',key)]
        choices=[]
        for candidate in p['variants']:
            candidate_values,_,_,_=variant_dimensions(p,candidate)
            if size_keys and all(candidate_values.get(key)==value for key,value in values.items() if key not in size_keys):
                choices.append({**row,'_referenceVariantId':candidate['id']})
        expanded_rows.extend(choices or [row])
    rows=expanded_rows
    purchase_variants={}
    used_references={}
    used_variant_images=set()
    spec_sets={}
    for row in rows:
        selected=choose_reference(target,row,references)
        if selected is None: continue
        score,p,v,values,reference_size,reference_colour,reference_build=selected
        used_references[p['handle']]=p
        used_variant_images.add(v.get('image_id'))
        size=row['size'] or reference_size
        if 'contact' in size.lower(): size=''
        colour=row['colour'] or reference_colour
        if target['brand']=='Colnago': colour={'VDRD':'Red','VDBL':'Blue','VDDK':'Grey'}.get(colour,colour)
        if row.get('variantLabel') and target['brand'] in ['Rudy Project','100%']:
            colour=reference_colour or text(v['title'])
        build=' · '.join(text(row[k]) for k in ['groupset','wheels'] if row.get(k) and norm(row[k])!='na')
        if not build: build=reference_build
        if not size and not colour and not build and text(v['title']) not in ['Default Title','']:
            size=text(v['title'])
        price=int(Decimal(v['price']))
        mrp=int(Decimal(v['compare_at_price'])) if v.get('compare_at_price') else 0
        identifier=hashlib.sha256(json.dumps([product_id,size,colour,build],ensure_ascii=False).encode()).hexdigest()[:16]
        spec_key=hashlib.sha256((p['handle']+'|'+reference_build).encode()).hexdigest()[:10]
        selected_specs=technical_data(p['handle'])[0].copy()
        selected_specs=[spec for spec in selected_specs if not re.match(r'(?:colou?r|sizes?)\s*:',spec,re.I)]
        group_choice=next((value for key,value in values.items() if 'groupset' in key),'')
        wheel_choice=next((value for key,value in values.items() if 'wheel' in key),'')
        if group_choice:
            selected_specs=[spec for spec in selected_specs if not re.match(r'(?:groupset|shifting|shifters|front derailleur|rear derailleur|crankset|cassette|chain|brakes|brake lever|weight)\b',spec,re.I)]
            selected_specs.append('Groupset: '+group_choice)
        if wheel_choice:
            selected_specs=[spec for spec in selected_specs if not re.match(r'(?:wheelset|wheels|rim |rim:|hubs|spokes|weight)\b',spec,re.I)]
            selected_specs.append('Wheelset: '+wheel_choice)
        if target['category']=='Complete bikes' and row.get('wheels') and norm(row['wheels'])!='na':
            selected_specs=[spec for spec in selected_specs if not re.match(r'(?:wheelset|wheels|rim\b|hubs?\b|spokes?\b|internal channel|material\s*:)',spec,re.I)]
            selected_specs.append('Wheelset: '+text(row['wheels']))
        spec_sets[spec_key]=selected_specs
        variant=dict(key=identifier,size=size,colour=colour,build=build,price=price,mrp=mrp,specSet=spec_key,
            available=row['status']=='Available',stockStatus='available' if row['status']=='Available' else ('coming-soon' if row['status']=='Coming Soon' else 'contact'),
            image=image_path(variant_image(p,v)))
        existing=purchase_variants.get(identifier)
        if existing and existing['price']!=price:
            diagnostics.append(dict(brand=target['brand'],model=target['model'],error='Conflicting variant price',key=identifier))
        if not existing or variant['available']: purchase_variants[identifier]=variant
    if not purchase_variants:
        diagnostics.append(dict(brand=target['brand'],model=target['model'],error='No resolved purchase variants'))
        continue
    variants=sorted(purchase_variants.values(),key=lambda v:(not v['available'],v['price'],v['build'],v['size'],v['colour']))
    default=variants[0]
    associated_images={v.get('image_id') for p in references for v in p['variants'] if v.get('image_id')}
    images=list(dict.fromkeys([default['image']]+[image_path(i['src']) for p in used_references.values() for i in p.get('images',[]) if i.get('id') not in associated_images or i.get('id') in used_variant_images]))
    specs=spec_sets[default['specSet']].copy()
    _,charts=technical_data(reference['handle'])
    specs=[s for s in specs if not re.match(r'(?:model|colou?r|sizes?)\s*:',s,re.I)]
    specs.insert(0,'Model: '+target['brand']+' '+target['model'])
    configurations=list(dict.fromkeys(v['build'] for v in variants if v['build']))
    if configurations: specs.append('Build options: '+'; '.join(configurations))
    sizes=list(dict.fromkeys(v['size'] for v in variants if v['size']))
    colours=list(dict.fromkeys(v['colour'] for v in variants if v['colour']))
    if sizes: specs.append('Sizes: '+', '.join(sizes))
    if colours: specs.append('Colours: '+', '.join(colours))
    page,main,sub=category_for(target)
    name=reference['title']
    if target['category']=='Complete bikes':
        suffix='Triathlon Bike' if any(word in name.lower() for word in ['triathlon','time trial']) else ('Gravel Bike' if 'gravel' in name.lower() else ('Bike' if re.search(r'\broad\b',target['model'],re.I) else 'Road Bike'))
        name=target['brand']+' '+target['model']+' '+suffix
        if 'hybrid' in reference['title'].lower(): name=target['brand']+' '+target['model']+' Hybrid Bike'
    if target['brand']=='Zone3': name='Zone3 '+target['model']
    features=[s for s in specs if re.match(r'(?:frame|fork|material|weight|rim|brake|shifter|power|lens|uv|capacity|rail|bearing)',s,re.I)][:5]
    category_description={
        'Complete bikes':'Choose the build, frame size and colour that suit your ride. Review the component specifications below before checkout.',
        'Framesets':'Start your next bike build with this frameset. Check frame size, brake mounts, axle standards and bottom-bracket compatibility before choosing your components.',
        'Wheels':'Compare the rim, hub, brake and freehub specifications with your current bike before choosing your wheelset.',
        'Power-meter pedals':'Review the pedal system and power-meter specifications, then choose the version that fits your bike and training setup.',
        'Helmets and eyewear':'Choose your preferred size and colour, and check the fit and material specifications below.',
        'Clothing, triathlon and swim':'Choose your size and preferred design. The size guide and product specifications help you compare the available options.',
        'Bike travel bags':'Review the dimensions, bike compatibility and included protection before planning your next journey.',
        'Components and tools':'Check the dimensions and compatibility details before selecting this component for your bike.'}
    description=name+' is available from Cyclify India. '+category_description[target['category']]
    summary=' '.join(features[:3])
    if summary and len(configurations)<=1: description+=' '+summary
    status='available' if any(v['available'] for v in variants) else ('coming-soon' if all(v['stockStatus']=='coming-soon' for v in variants) else 'contact')
    option_names=[text(option['name']) for p in used_references.values() for option in p.get('options',[]) if re.search(r'size|width|length|capacity|volume|type',option['name'],re.I)]
    primary_label='Select '+(option_names[0] if option_names else 'Option')
    products.append(dict(id=product_id,name=name,brand=target['brand'],inventoryGroup='expanded',primaryLabel=primary_label,
        categoryPage=page,categoryLabel={'bikes-frames.html':'Bikes & Frames','wearables.html':'Wearables','wheels-tyres.html':'Wheels & Tyres','electronics.html':'Electronics','components.html':'Components','accessories.html':'Accessories'}[page],
        mainCategory=main,subCategory=sub,price=default['price'],mrp=default['mrp'],available=status=='available',stockStatus=status,
        image=default['image'],images=images,sizes=sizes,secondaryLabel='Select Colour' if colours else '',secondaryOptions=colours,
        purchaseVariants=variants,defaultVariantKey=default['key'],description=description,specSummary=description,specs=specs,
        productFeatures=features,specSets=spec_sets,sizeGuideTables=charts,keywords=name+' '+target['brand']+' India '+target['model'],
        stockUpdatedAt='2026-10-14',stockSource='cyclify-order-sheet'))

(reference_root/'expanded-import-diagnostics.json').write_text(json.dumps(diagnostics,ensure_ascii=False,indent=2),encoding='utf-8')
errors=[d for d in diagnostics if d['error'] not in ['Model mapping missing','Build price not found']]
print('Prepared models:',len(products),'Expected: 165')
print('Images:',len(image_jobs),'Variants:',sum(len(p['purchaseVariants']) for p in products))
print('Stock:',dict(collections.Counter(p['stockStatus'] for p in products)))
print('Unresolved mappings:',len(diagnostics),'Critical:',len(errors))
if errors or len(products)!=165:
    for issue in errors[:35]: print(issue)
    raise SystemExit('Resolve stock and price mappings before writing the storefront catalogue.')

def download_image(job):
    src,local=job
    destination=ROOT/local
    thumbnail=destination.parent/'thumbs'/destination.name
    if destination.exists() and thumbnail.exists(): return
    parsed=urlsplit(src)
    query=dict(parse_qsl(parsed.query));query['width']='1800'
    request=urllib.request.Request(urlunsplit((parsed.scheme,parsed.netloc,parsed.path,urlencode(query),'')),headers={'User-Agent':'Mozilla/5.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request,timeout=45) as response: payload=response.read()
            image=Image.open(io.BytesIO(payload))
            image.thumbnail((1800,1800),Image.Resampling.LANCZOS)
            destination.parent.mkdir(parents=True,exist_ok=True)
            image.save(destination,'WEBP',quality=90,method=6)
            thumbnail=destination.parent/'thumbs'/destination.name
            thumbnail.parent.mkdir(exist_ok=True)
            image.thumbnail((240,240),Image.Resampling.LANCZOS)
            image.save(thumbnail,'WEBP',quality=84,method=5)
            return
        except Exception:
            if attempt==2: raise
            time.sleep(2+attempt)

if args.download_images:
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i,_ in enumerate(pool.map(download_image,image_jobs.items()),1):
            if i%25==0 or i==len(image_jobs): print(f'Product photos saved: {i}/{len(image_jobs)}',flush=True)
    missing=[local for local in image_jobs.values() if not (ROOT/local).exists()]
    if missing: raise SystemExit('Product photos missing: '+str(len(missing)))
    (ROOT/'assets/data/expanded-products.json').write_text(json.dumps(dict(version=1,products=products),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    deferred=[{k:t[k] for k in ['brand','category','model']} for t in targets if not t['matched']]
    deferred_variants=list({json.dumps({k:d[k] for k in ['brand','model','groupset','wheels'] if k in d},sort_keys=True):{k:d[k] for k in ['brand','model','groupset','wheels'] if k in d} for d in diagnostics if d['error']=='Build price not found'}.values())
    (ROOT/'assets/data/deferred-products.json').write_text(json.dumps(dict(version=1,reason='Reference listing or exact model not confirmed',products=deferred,variants=deferred_variants),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Wrote Cyclify inventory and 57 deferred models.')
else:
    (reference_root/'expanded-products-draft.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Draft prepared; image download and storefront write require --download-images.')
