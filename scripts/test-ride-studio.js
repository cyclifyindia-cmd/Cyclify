const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const vm = require('node:vm');
const model = require('../assets/js/ride-studio-model');
const { renderRideStudio } = require('./render-ride-studio');
const root = path.resolve(__dirname,'..');
const $ = cheerio.load(renderRideStudio(), { xmlMode: false });
assert.equal($('#cyclify-ride-studio').length,1);
assert.equal($('[data-rs-style]').length,4);
assert.equal($('[data-rs-colour]').length,4);
assert.equal($('[data-rs-metric]').length,6);
assert.equal($('[data-rs-overlay]').length,6);
assert.equal($('button:not([type="button"])').length,0);
assert.equal($('.rs-explain[open]').length,0);
assert.equal($('[data-rs-overlay][visibility="hidden"]').length,6);
assert.equal($('[data-rs-style][aria-pressed="true"]').length,1);
assert.equal(new Set($('[id]').map((i,el)=>$(el).attr('id')).get()).size,$('[id]').length);
for (const style of Object.values(model.styles)) {
  assert.ok(fs.existsSync(path.join(root,style.shop.split('?')[0])),style.shop);
  for (const other of Object.values(model.styles)) {
    for (let step=0;step<=10;step++) {
      const g={};
      for (const key of Object.keys(style.geometry)) g[key]=style.geometry[key]+(other.geometry[key]-style.geometry[key])*step/10;
      assert.ok(g.front>g.rear && g.by>g.sy && g.ly>g.hy);
      assert.ok(g.rear-g.radius-g.tyre/2>0 && g.front+g.radius+g.tyre/2<900);
      const parts=model.parts(g);
      assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(parts)));
      for (const id of Object.keys(parts)) assert.equal($(`[data-rs-part="${id}"]`).length,1,id);
    }
  }
}
for (const metric of Object.values(model.metrics)) for (const key of Object.keys(model.styles)) assert.ok(metric.tips[key]);
// Keep the trail concept's steep seat angle distinct from its slack steering axis.
const trail=model.styles.mtb.geometry;
const seatAngle=Math.atan2(trail.by-trail.sy,trail.bx-trail.sx)*180/Math.PI;
const headAngle=Math.atan2(trail.ly-trail.hy,trail.lx-trail.hx)*180/Math.PI;
assert.ok(seatAngle>74 && seatAngle<78 && headAngle>62 && headAngle<67);
const home=cheerio.load(fs.readFileSync(path.join(root,'index.html'),'utf8'));
assert.equal(home('#cyclify-ride-studio').length,1);
assert.equal(home('#cyclify-ride-studio').next().attr('id'),'cyclify-browse-links');
for (const asset of ['ride-studio-model.js','ride-studio.js']) assert.equal(home(`script[src*="assets/js/${asset}"]`).length,1);
assert.equal(home('link[href*="assets/css/ride-studio.css"]').length,1);
// Deterministic DOM adapter: exercise client events and animation completion without a browser.
// Layout and real-browser rendering are intentionally not claimed by this test.
const dom=cheerio.load(renderRideStudio());
const cache=new WeakMap();
function wrap(node){
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
    innerHTML:{set(v){dom(node).html(v);}},
    href:{set(v){dom(node).attr('href',v);}},
    open:{get(){return dom(node).attr('open')!==undefined;},set(v){if(v)dom(node).attr('open','');else dom(node).removeAttr('open');}}
  });
  el.dataset=new Proxy({}, {get(_,key){return dom(node).attr('data-'+String(key).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()));},set(_,key,value){dom(node).attr('data-'+String(key).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),String(value));return true;}});
  cache.set(node,el);return el;
}
let intervalId=0,rafId=0;
const intervals=new Map(),frames=new Map(),documentEvents={},windowEvents={},motionEvents={};
const motion={matches:false,addEventListener:(name,fn)=>{motionEvents[name]=fn;}};
const document={hidden:false,getElementById:id=>wrap(dom('#'+id)[0]),createElement:name=>wrap(dom('<'+name+'>')[0]),createTextNode:text=>wrap(new (require('domhandler').Text)(text)),addEventListener:(name,fn)=>{documentEvents[name]=fn;}};
const context={document,window:{CyclifyRideModel:model,matchMedia:()=>motion,addEventListener:(name,fn)=>{windowEvents[name]=fn;}},performance:{now:()=>0},setInterval:fn=>{intervals.set(++intervalId,fn);return intervalId;},clearInterval:id=>intervals.delete(id),requestAnimationFrame:fn=>{frames.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>frames.delete(id)};
const client=fs.readFileSync(path.join(root,'assets/js/ride-studio.js'),'utf8');
vm.runInNewContext(client,context);
const get=s=>wrap(dom(s)[0]);
function click(s){get(s).emit('click');}
function settle(){const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn(1000));}
for(const [id,style] of Object.entries(model.styles)){
  click(`[data-rs-style="${id}"]`);settle();
  assert.equal(dom('#cyclify-ride-studio').attr('data-style'),id);
  assert.equal(dom('[data-rs-style][aria-pressed=true]').length,1);
  assert.equal(dom('[data-rs-heading]').text(),style.title);
  assert.equal(dom('[data-rs-shop]').attr('href'),style.shop);
  assert.equal(get('.rs-tyre').style.strokeWidth,style.geometry.tyre);
  assert.equal(get('.rs-rim').style.strokeWidth,style.geometry.rim);
}
for(let i=0;i<model.colours.length;i++){
  click(`[data-rs-colour="${i}"]`);
  assert.equal(dom('.rs-paint-main').attr('stop-color'),model.colours[i].value);
  assert.equal(dom('[data-rs-colour][aria-pressed=true]').length,1);
}
const details=get('.rs-explain');details.open=true;details.emit('toggle');
for(const [id,metric] of Object.entries(model.metrics)){
  click(`[data-rs-metric="${id}"]`);
  assert.equal(dom('[data-rs-overlay][visibility=visible]').length,1);
  assert.equal(dom('[data-rs-overlay][visibility=visible]').attr('data-rs-overlay'),id);
  assert.equal(dom('[data-rs-lesson-text]').text(),metric.text);
}
details.open=false;details.emit('toggle');assert.equal(dom('[data-rs-overlay][visibility=visible]').length,0);
click('[data-rs-tour]');assert.equal(intervals.size,1);[...intervals.values()][0]();settle();
click('[data-rs-style=aero]');settle();assert.equal(intervals.size,0);
click('[data-rs-tour]');document.hidden=true;documentEvents.visibilitychange();assert.equal(intervals.size,0);
document.hidden=false;motion.matches=true;motionEvents.change();click('[data-rs-style=gravel]');assert.equal(frames.size,0);
click('[data-rs-tour]');assert.equal(intervals.size,0);
const handlerCount=get('[data-rs-style=gravel]').listeners.click.length;vm.runInNewContext(client,context);assert.equal(get('[data-rs-style=gravel]').listeners.click.length,handlerCount);
console.log('Ride studio passed: 4 styles, 4 colours, 6 geometry controls, 176 morph poses, tour/pause, reduced motion, duplicate-init safety and homepage placement. Browser layout not covered.');
