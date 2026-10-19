const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const vm = require('node:vm');
const sharp = require('sharp');
const model = require('../assets/js/ride-studio-model');
const { renderRideStudio, renderStoreNote } = require('./render-ride-studio');
const root = path.resolve(__dirname,'..');
const expectedModels = {
  endurance: { name:'Specialized Roubaix SL8 Expert', brand:'Specialized', host:'www.specialized.com', photoHost:'resources.specialized.com', labels:['Full bike','Three-quarter','Cockpit'] },
  gravel: { name:'Canyon Grizl 7 ESC', brand:'Canyon', host:'www.canyon.com', photoHost:'dma.canyon.com', labels:['Full bike','Frame','Cockpit'] },
  aero: { name:'Cervélo S5', brand:'Cervélo', host:'www.cervelo.com', photoHost:'images.prismic.io', labels:['Full bike','Frame','Cockpit'] },
  mtb: { name:'Cannondale Bad Habit 1', brand:'Cannondale', host:'www.cannondale.com', photoHost:'embed.widencdn.net', labels:['Full bike','Three-quarter','Details'] }
};
function assertHttpsHost(value, host) {
  const url = new URL(value);
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,host);
}
async function main() {
  const $=cheerio.load(renderRideStudio());
  assert.equal($('#cyclify-ride-studio').length,1);
  assert.equal($('[data-rs-style]').length,4);
  assert.equal($('[data-rs-view]').length,3);
  assert.equal($('[data-rs-metric]').length,6);
  assert.equal($('[data-rs-colour],.rs-bike,[data-rs-part]').length,0,'No invented frames or paint controls');
  assert.equal($('button:not([type="button"])').length,0);
  assert.equal($('.rs-explain[open]').length,0);
  assert.equal($('.rs-credits').length,1);
  assert.equal($('.rs-credits[open]').length,0,'Attribution stays available without crowding the initial view');
  assert.equal($('.rs-credits > summary').text(),'About these reference bikes');
  assert.equal($('[data-rs-style][aria-pressed=true]').length,1);
  assert.equal($('[data-rs-photo]').attr('loading'),'lazy');
  assert.equal($('[data-rs-preview]').length,3);
  $('[data-rs-preview]').each((index,element)=>{
    const preview=$(element);
    assert.equal(preview.attr('alt'),'','The neighbouring button label names the view');
    assert.equal(preview.attr('loading'),'lazy');
    assert.equal(preview.attr('decoding'),'async');
    assert.equal(preview.attr('src'),model.styles.endurance.images[index].small);
    assert.equal(preview.parent().attr('data-rs-view'),String(index));
  });
  assert.equal($('[data-rs-photo-count]').text(),'01 / 03');
  assert.equal($('[data-rs-photo-credit]').text(),'Photos: '+model.styles.endurance.brand);
  assert.equal($('[data-rs-summary]').text(),'Reference size '+model.styles.endurance.size);
  assert.equal(new Set($('[id]').map((i,el)=>$(el).attr('id')).get()).size,$('[id]').length);
  assert.match($('.rs-reference-note').text(),/Actual photographs, not a rotatable 3D model/);
  assert.match($('.rs-reference-note').text(),/not Cyclify inventory/);
  assert.deepEqual(Object.keys(model.styles),Object.keys(expectedModels));
  let imageBytes=0;
  for(const [id,bike] of Object.entries(model.styles)) {
    const expected=expectedModels[id];
    assert.equal(bike.name,expected.name);
    assert.equal(bike.brand,expected.brand);
    assert.ok(fs.existsSync(path.join(root,bike.shop.split('?')[0])));
    assert.ok(bike.size && ['2025','2026','Current model'].includes(String(bike.year)));
    assertHttpsHost(bike.source,expected.host);
    assert.match(bike.note,/Size /);
    for(const metric of Object.keys(model.metrics)) assert.ok(bike.values[metric]);
    assert.equal(bike.images.length,3);
    assert.deepEqual(bike.images.map(photo=>photo.label),expected.labels);
    for(const photo of bike.images) {
      assertHttpsHost(photo.original,expected.photoHost);
      if(id==='aero') assert.match(new URL(photo.original).pathname,/^\/cervelo\//);
      if(id==='mtb') assert.match(new URL(photo.original).pathname,/^\/img\/dorelrl\//);
      assert.equal(photo.alt,bike.name+' — '+photo.label.toLowerCase());
      assert.ok(!photo.original.includes('crop='),'Do not request cropped manufacturer photography');
      assert.ok(!photo.original.includes('c_fill'),'Do not request fill-cropped manufacturer photography');
      for(const [asset,width,height] of [[photo.src,1536,960],[photo.small,640,400]]) {
        const file=path.join(root,asset),meta=await sharp(file).metadata();
        assert.equal(meta.format,'webp'); assert.equal(meta.width,width); assert.equal(meta.height,height);
        const bytes=fs.statSync(file).size; imageBytes+=bytes;
        assert.ok(bytes<400000,'Optimise photo payload');
      }
    }
    const diagram=await sharp(path.join(root,bike.diagram)).metadata();
    assert.equal(diagram.format,'webp');
    assert.ok(bike.diagramAlt && bike.diagramCaption,'Explain the geometry reference');
    if(bike.diagramSource) {
      assertHttpsHost(bike.diagramSource,id==='endurance' ? expected.photoHost : expected.host);
    } else {
      assert.equal(id,'aero');
      assert.equal(bike.diagram,bike.images[0].src,'Use the real side photograph when no manufacturer diagram is available');
      assert.match(bike.diagramAlt,/not a scale drawing/);
    }
  }
  assert.deepEqual(Object.values(model.styles).map(s=>s.values.stack),['605 mm','596 mm','565 mm','641 mm']);
  assert.equal(model.styles.aero.values.reach,'392 mm','Use frame reach, not reach to stem');
  assert.equal(model.styles.gravel.values.reach,'404 mm','Use frame reach, not effective cockpit reach');
  assert.equal(model.styles.mtb.values.reach,'455 mm');
  assert.equal(model.styles.mtb.values.steering,'64°');
  assert.equal(model.styles.mtb.values.wheelbase,'1,224 mm');
  assert.equal(model.styles.mtb.values.seat,'77.7°');
  assert.equal(model.styles.mtb.metricLabels.seat,'Effective seat angle');
  assert.doesNotMatch(model.styles.mtb.note,/low setting/i);
  const home=cheerio.load(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  assert.equal(home('#cyclify-ride-studio').length,1);
  assert.equal(home('#cyclify-ride-studio').next().attr('id'),'cyclify-browse-links');
  for(const asset of ['ride-studio-model.js','ride-studio.js']) assert.equal(home('script[src*="assets/js/'+asset+'"]').length,1);
  assert.equal(home('link[href*="assets/css/ride-studio.css"]').length,1);
  assert.equal(home('[data-rs-photo]').attr('src'),model.styles.endurance.images[0].src);
  const normaliseMarkup=html=>html.replace(/\r\n?/g,'\n').replace(/>\s+</g,'><').trim();
  assert.equal(normaliseMarkup(home('#cyclify-ride-studio').toString()),normaliseMarkup($('#cyclify-ride-studio').toString()),'Regenerate the homepage when the Ride Studio renderer or model changes');
  const store=cheerio.load(renderStoreNote());
  assert.equal(home('.cyclify-store-note').length,1);
  assert.equal(home('#cyclify-store-guide').length,1);
  assert.equal(home('#cyclify-browse-links').next().attr('class'),'cyclify-store-note');
  assert.equal(normaliseMarkup(home('.cyclify-store-note').toString()),normaliseMarkup(store('.cyclify-store-note').toString()),'Regenerate the homepage when its store-note renderer changes');
  assert.equal(home('.cyclify-store-note').attr('style'),undefined,'The store note uses scoped stylesheet rules');
  const css=fs.readFileSync(path.join(root,'assets/css/ride-studio.css'),'utf8');
  assert.match(css,/object-fit:contain/); assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/max-width:480px/); assert.match(css,/max-width:800px/);
  // Deterministic DOM adapter, including controlled async image completion.
  // This tests behaviour, not browser layout or visual rendering.
  const dom=cheerio.load(renderRideStudio()),cache=new WeakMap();
  function wrap(node) {
    if(!node)return null;
    if(cache.has(node))return cache.get(node);
    const el={node,style:{},listeners:{},
      setAttribute(k,v){dom(node).attr(k,String(v));},
      getAttribute(k){return dom(node).attr(k);},
      querySelector(s){return wrap(dom(node).find(s)[0]);},
      querySelectorAll(s){return dom(node).find(s).toArray().map(wrap);},
      addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},
      emit(k){(this.listeners[k]||[]).forEach(fn=>fn());},
      append(child){dom(node).append(child.node);},
      replaceChildren(...children){dom(node).empty();children.forEach(child=>this.append(child));}
    };
    Object.defineProperties(el,{
      textContent:{get(){return dom(node).text();},set(v){dom(node).text(v);}},
      href:{set(v){dom(node).attr('href',v);}},
      hidden:{get(){return dom(node).attr('hidden')!==undefined;},set(v){if(v)dom(node).attr('hidden','');else dom(node).removeAttr('hidden');}},
      open:{get(){return dom(node).attr('open')!==undefined;},set(v){if(v)dom(node).attr('open','');else dom(node).removeAttr('open');}}
    });
    el.dataset=new Proxy({}, {
      get(_,key){return dom(node).attr('data-'+String(key).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()));},
      set(_,key,value){dom(node).attr('data-'+String(key).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),String(value));return true;}
    });
    cache.set(node,el);return el;
  }
  let intervalId=0,timerId=0;
  const intervals=new Map(),timers=new Map(),pending=[],documentEvents={},windowEvents={},motionEvents={};
  const motion={matches:false,addEventListener:(name,fn)=>{motionEvents[name]=fn;}};
  const document={hidden:false,getElementById:id=>wrap(dom('#'+id)[0]),
    createElement:name=>wrap(dom('<'+name+'>')[0]),createTextNode:text=>wrap(new (require('domhandler').Text)(text)),
    addEventListener:(name,fn)=>{documentEvents[name]=fn;}};
  class FakeImage { set src(value){this.url=value;pending.push(this);} }
  const context={document,Image:FakeImage,
    window:{CyclifyRideModel:model,matchMedia:()=>motion,addEventListener:(name,fn)=>{windowEvents[name]=fn;}},
    setInterval:fn=>{intervals.set(++intervalId,fn);return intervalId;},clearInterval:id=>intervals.delete(id),
    setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
  const client=fs.readFileSync(path.join(root,'assets/js/ride-studio.js'),'utf8');
  vm.runInNewContext(client,context);
  const get=s=>wrap(dom(s)[0]),click=s=>get(s).emit('click');
  function loaded(){pending.pop().onload();}
  for(const [id,bike] of Object.entries(model.styles)) {
    click('[data-rs-style="'+id+'"]'); loaded();
    assert.equal(dom('#cyclify-ride-studio').attr('data-style'),id);
    assert.equal(dom('[data-rs-style][aria-pressed=true]').length,1);
    assert.equal(dom('[data-rs-name]').text(),bike.name);
    assert.equal(dom('[data-rs-shop]').attr('href'),bike.shop);
    assert.equal(dom('[data-rs-source]').attr('href'),bike.source);
    assert.equal(dom('[data-rs-source]').text(),'View '+bike.brand+'’s model specifications ↗');
    assert.equal(dom('[data-rs-photo-credit]').text(),'Photos: '+bike.brand);
    assert.equal(dom('[data-rs-diagram]').attr('src'),bike.diagram);
    assert.equal(dom('[data-rs-diagram]').attr('alt'),bike.diagramAlt);
    assert.equal(dom('[data-rs-diagram-caption]').text(),bike.diagramCaption);
    assert.equal(dom('[data-rs-diagram-source]').attr('href'),bike.diagramSource || bike.source);
    assert.equal(dom('[data-rs-diagram-source]').attr('target'),'_blank');
    assert.match(dom('[data-rs-diagram-source]').attr('rel'),/noopener/);
    assert.equal(dom('[data-rs-summary]').text(),'Reference size '+bike.size);
    assert.equal(dom('[data-rs-style-name]').text(),bike.year+' · '+bike.label.toUpperCase());
    assert.deepEqual(dom('[data-rs-view-label]').map((i,el)=>dom(el).text()).get(),bike.images.map(photo=>photo.label));
    assert.deepEqual(dom('[data-rs-preview]').map((i,el)=>dom(el).attr('src')).get(),bike.images.map(photo=>photo.small),'All thumbnails must switch with the chosen bike');
    assert.equal(dom('[data-rs-photo-count]').text(),'01 / 03','Changing bike resets the gallery counter');
    assert.equal(get('.rs-credits').open,false);
    dom('[data-rs-preview]').each((i,el)=>{
      assert.equal(dom(el).attr('alt'),'');
      assert.equal(dom(el).attr('loading'),'lazy');
    });
    for(let i=0;i<3;i++){
      click('[data-rs-view="'+i+'"]');loaded();
      assert.equal(dom('[data-rs-photo]').attr('src'),bike.images[i].src);
      assert.equal(dom('[data-rs-photo]').attr('alt'),bike.images[i].alt);
      assert.equal(dom('[data-rs-photo]').attr('srcset'),bike.images[i].small+' 640w, '+bike.images[i].src+' 1536w');
      assert.equal(dom('[data-rs-photo-count]').text(),String(i+1).padStart(2,'0')+' / 03');
      assert.equal(dom('[data-rs-view="'+i+'"] [data-rs-preview]').attr('src'),bike.images[i].small);
      assert.equal(get('[data-rs-view="'+i+'"]').hidden,false);
      assert.equal(dom('[data-rs-view][aria-pressed=true]').length,1);
      assert.equal(dom('[data-rs-stage]').attr('aria-busy'),'false');
      assert.equal(get('[data-rs-photo]').hidden,false);
    }
    for(const [key,metric] of Object.entries(model.metrics)){
      click('[data-rs-metric="'+key+'"]');
      assert.equal(dom('[data-rs-metric][aria-pressed=true]').length,1);
      const label=bike.metricLabels?.[key] || metric.label;
      assert.equal(dom('[data-rs-metric-label="'+key+'"]').text(),label);
      assert.equal(dom('[data-rs-lesson-value]').text(),label+' · '+bike.values[key]);
      assert.equal(dom('[data-rs-lesson-text]').text(),metric.text);
      assert.equal(dom('[data-rs-value="'+key+'"]').text(),bike.values[key]);
    }
  }
  // A model-specific label must change with the bike, including an active lesson.
  click('[data-rs-style=mtb]');loaded();click('[data-rs-metric=seat]');
  assert.equal(dom('[data-rs-metric-label=seat]').text(),'Effective seat angle');
  assert.equal(dom('[data-rs-lesson-value]').text(),'Effective seat angle · 77.7°');
  click('[data-rs-style=endurance]');loaded();
  assert.equal(dom('[data-rs-metric-label=seat]').text(),'Seat angle');
  assert.equal(dom('[data-rs-lesson-value]').text(),'Seat angle · 73.5°');
  click('[data-rs-style=mtb]');loaded();
  assert.equal(dom('[data-rs-lesson-value]').text(),'Effective seat angle · 77.7°');
  // Rapid selection must not display the previous model when it finishes late.
  click('[data-rs-style=gravel]');const oldImage=pending.pop();
  click('[data-rs-style=aero]');loaded();oldImage.onload();
  assert.equal(dom('[data-rs-photo]').attr('src'),model.styles.aero.images[0].src);
  click('[data-rs-view="2"]');pending.pop().onerror();
  assert.equal(get('[data-rs-photo-status]').hidden,false);
  assert.equal(get('[data-rs-photo]').hidden,true);
  click('[data-rs-view="2"]');loaded();
  assert.equal(get('[data-rs-photo-status]').hidden,true);
  click('[data-rs-view="1"]');const late=pending.pop();[...timers.values()][0]();late.onload();
  assert.equal(get('[data-rs-photo-status]').hidden,false,'Timeout cannot be reversed by late completion');
  click('[data-rs-tour]');loaded();assert.equal(intervals.size,1);
  [...intervals.values()][0]();loaded();
  get('.rs-explain').emit('toggle');assert.equal(intervals.size,0);
  click('[data-rs-tour]');loaded();document.hidden=true;documentEvents.visibilitychange();assert.equal(intervals.size,0);
  document.hidden=false;motion.matches=true;motionEvents.change();click('[data-rs-tour]');assert.equal(intervals.size,0);
  click('[data-rs-style=gravel]');loaded();
  const handlers=get('[data-rs-style=gravel]').listeners.click.length;
  vm.runInNewContext(client,context);assert.equal(get('[data-rs-style=gravel]').listeners.click.length,handlers);
  windowEvents.pagehide();assert.equal(timers.size,0);
  console.log('Ride studio passed: 4 requested models, 12 manufacturer photos, 24 responsive assets ('+Math.round(imageBytes/1024)+' KB total), thumbnail controls/counters, collapsed credits, source links, 6 metrics, effective seat-angle labels, image races/errors/retry, tour/pause, reduced motion, duplicate-init and generated homepage/store-note parity. Browser layout not covered.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
