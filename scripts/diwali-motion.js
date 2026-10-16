'use strict';
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../assets/css/diwali-motion.css'),'utf8');

function diyaScene(){
 const lamps=[['translate(43 97) scale(.65)','-.9s'],['translate(112 94) scale(.95)','-.35s'],['translate(181 97) scale(.65)','-1.5s']].map(([transform,delay])=>`<g transform="${transform}" style="--lamp-delay:${delay}"><ellipse class="diwali-lamp-glow" cy="-13" rx="47" ry="53" fill="url(#diwali-lamp-halo)"/><ellipse cy="29" rx="40" ry="4" fill="#060c12" opacity=".3"/><path d="M-43 5Q0 49 43 5Q0-4-43 5Z" fill="url(#diwali-lamp-bowl)"/><path d="M-36 12Q0 39 36 12" fill="none" stroke="#eac380" stroke-opacity=".65" stroke-width="1.4"/><ellipse cy="5" rx="43" ry="8" fill="#edc780"/><ellipse cy="5" rx="37" ry="5.3" fill="#7d3e14"/><path d="M0 6Q-3-4 0-15" fill="none" stroke="#f4dfaa" stroke-width="2.5" stroke-linecap="round"/><g class="diwali-lamp-flame"><path d="M0-60C-4-44-20-34-12-20C-6-8 9-10 14-22C20-37 5-46 0-60Z" fill="url(#diwali-lamp-fire)"/><path d="M0-42C-3-32-10-26-5-18C-2-11 7-14 7-22C7-30 2-33 0-42Z" fill="#fff7d4"/></g></g>`).join('');
 return `<div class="diwali-lamps" aria-hidden="true" data-motion-active="false"><svg viewBox="0 0 224 135" width="224" height="135" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="diwali-lamp-bowl" x2="0" y2="1"><stop stop-color="#d99b47"/><stop offset="1" stop-color="#6c3218"/></linearGradient><linearGradient id="diwali-lamp-fire" x2="0" y2="1"><stop stop-color="#fff5ca"/><stop offset=".55" stop-color="#ffc45e"/><stop offset="1" stop-color="#ed701e"/></linearGradient><radialGradient id="diwali-lamp-halo"><stop stop-color="#ffd07a" stop-opacity=".42"/><stop offset="1" stop-color="#ffd07a" stop-opacity="0"/></radialGradient></defs>${lamps}<circle class="diwali-lamp-spark" style="--lamp-delay:-1s" cx="72" cy="29" r="1.6" fill="#ffd895"/><circle class="diwali-lamp-spark" style="--lamp-delay:-2.1s" cx="153" cy="22" r="1.3" fill="#ffd895"/></svg></div>`;
}

function addDiwaliMotion($,{home=false}={}){
 $('#diwaliMotionStyles').remove();
 $('head').append('<style id="diwaliMotionStyles">'+css+'</style>');
 if(home){
  const eyebrow=$('.diwali-home-copy .diwali-home-eyebrow').first();
  if(!eyebrow.parent().hasClass('diwali-home-intro'))eyebrow.wrap('<div class="diwali-home-intro"></div>');
  eyebrow.parent().find('.diwali-lamps').remove();
  eyebrow.parent().append(diyaScene());
  // Hidden legacy banners should not compete with the visible offer's first image.
  $('.home-hero img,.legacy-mobile-home>.offer img').attr('loading','lazy').attr('fetchpriority','low').attr('decoding','async');
 }else{
  $('.diwali-hero>.diwali-lamps').remove();
  $('.diwali-hero').append(diyaScene());
 }
}
module.exports={addDiwaliMotion};
