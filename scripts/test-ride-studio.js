const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const vm = require('node:vm');
const sharp = require('sharp');
const model = require('../assets/js/ride-studio-model');
const { renderRideStudio } = require('./render-ride-studio');
const root = path.resolve(__dirname,'..');
async function main() {
  const $=cheerio.load(renderRideStudio());
  assert.equal($('#cyclify-ride-studio').length,1);
  assert.equal($('[data-rs-style]').length,4);
  assert.equal($('[data-rs-view]').length,3);
  assert.equal($('[data-rs-metric]').length,6);
  assert.equal($('[data-rs-colour],.rs-bike,[data-rs-part]').length,0,'No invented frames or paint controls');
  assert.equal($('button:not([type="button"])').length,0);
  assert.equal($('.rs-explain[open]').length,0);
  assert.equal($('[data-rs-style][aria-pressed=true]').length,1);
  assert.equal($('[data-rs-photo]').attr('loading'),'lazy');
  assert.equal(new Set($('[id]').map((i,el)=>$(el).attr('id')).get()).size,$('[id]').length);
  let imageBytes=0;
  for(const bike of Object.values(model.styles)) {
    assert.ok(fs.existsSync(path.join(root,bike.shop.split('?')[0])));
    assert.ok(bike.size && /^202[34]$/.test(bike.year));
    assert.match(bike.source,/^https:\/\/www.specialized.com\//);
    assert.match(bike.note,/Size /);
    for(const metric of Object.keys(model.metrics)) assert.ok(bike.values[metric]);
    for(const photo of bike.images) {
      assert.match(photo.original,/^https:\/\/resources.specialized.com\/image\//);
      assert.ok(!photo.original.includes('crop='),'Do not request cropped manufacturer photography');
      for(const [asset,width,height] of [[photo.src,1536,960],[photo.small,640,400]]) {
        const file=path.join(root,asset),meta=await sharp(file).metadata();
        assert.equal(meta.format,'webp'); assert.equal(meta.width,width); assert.equal(meta.height,height);
        const bytes=fs.statSync(file).size; imageBytes+=bytes;
        assert.ok(bytes<400000,'Optimise photo payload');
      }
    }
    const diagram=await sharp(path.join(root,bike.diagram)).metadata();
    assert.equal(diagram.format,'webp');
  }
  assert.deepEqual(Object.values(model.styles).map(s=>s.values.stack),['605 mm','609 mm','565 mm','598 mm']);
  assert.equal(model.styles.aero.values.reach,'395 mm','Use frame reach, not reach to stem');
  assert.equal(model.styles.mtb.values.steering,'65.9°');
  assert.match(model.styles.mtb.note,/low setting/);
  const home=cheerio.load(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  assert.equal(home('#cyclify-ride-studio').length,1);
  assert.equal(home('#cyclify-ride-studio').next().attr('id'),'cyclify-browse-links');
  for(const asset of ['ride-studio-model.js','ride-studio.js']) assert.equal(home('script[src*="assets/js/'+asset+'"]').length,1);
  assert.equal(home('link[href*="assets/css/ride-studio.css"]').length,1);
  assert.equal(home('[data-rs-photo]').attr('src'),model.styles.endurance.images[0].src);
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
    assert.equal(dom('[data-rs-diagram]').attr('src'),bike.diagram);
    assert.match(dom('[data-rs-summary]').text(),new RegExp('Size '+bike.size));
    for(let i=0;i<3;i++){
      click('[data-rs-view="'+i+'"]');loaded();
      assert.equal(dom('[data-rs-photo]').attr('src'),bike.images[i].src);
      assert.equal(dom('[data-rs-photo]').attr('alt'),bike.images[i].alt);
      assert.equal(dom('[data-rs-view][aria-pressed=true]').length,1);
      assert.equal(dom('[data-rs-stage]').attr('aria-busy'),'false');
      assert.equal(get('[data-rs-photo]').hidden,false);
    }
    for(const [key,metric] of Object.entries(model.metrics)){
      click('[data-rs-metric="'+key+'"]');
      assert.equal(dom('[data-rs-metric][aria-pressed=true]').length,1);
      assert.equal(dom('[data-rs-lesson-value]').text(),metric.label+' · '+bike.values[key]);
      assert.equal(dom('[data-rs-lesson-text]').text(),metric.text);
      assert.equal(dom('[data-rs-value="'+key+'"]').text(),bike.values[key]);
    }
  }
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
  console.log('Ride studio passed: 4 verified models, 12 photos, 24 responsive assets ('+Math.round(imageBytes/1024)+' KB total), 6 metrics, image races/errors/retry, tour/pause, reduced motion, duplicate-init and homepage placement. Browser layout not covered.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
