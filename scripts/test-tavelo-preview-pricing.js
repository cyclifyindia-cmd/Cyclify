'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual preview script, without sending orders or payments.
class Element {
  constructor(value = '') {
    this.value = value;
    this.textContent = '';
    this.dataset = {};
    this.options = [];
    this.children = [];
    this.listeners = {};
    this.attributes = {};
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  replaceChildren(...children) {
    this.children = children;
    this.options = children;
    if (children.length && children[0].value !== undefined) this.value = children[0].value;
  }
  append(...children) { this.children.push(...children); }
  querySelector() { return new Element(); }
  showModal() {}
  close() {}
  change(value) { this.value = value; this.listeners.change(); }
  click() { this.listeners.click(); }
}

const html = fs.readFileSync(path.join(__dirname, '../tavelo-arow-build-preview.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const elements = {};
const get = id => elements[id] ||= new Element();
Object.entries({crank:'165', rings:'50 / 34', cassette:'11–34', cockpit:'AVRO Gen-1', wheelset:'Velove Glide 50D'}).forEach(([id, value]) => { get(id).value = value; });
get('cassette').options = [new Element('11–34'), new Element('11–36')];
const groupsets = ['105 Di2', 'Ultegra Di2', 'Dura-Ace Di2'].map(value => {
  const button = new Element();
  button.dataset.groupset = value;
  return button;
});
const selectors = {};
const document = {
  getElementById: get,
  createElement: () => new Element(),
  querySelector: selector => selectors[selector] ||= new Element(),
  querySelectorAll: selector => selector === '[data-groupset]' ? groupsets : [],
};
let whatsappUrl = '';
vm.runInNewContext(script, {document, Intl, window:{location:{assign(url){whatsappUrl=url;}}}, Option: function(text, value) { this.text = text; this.value = value; }});

assert.match(html, /id="buildPrice">Starts from ₹3,90,000<\/strong>/);
assert.match(html, /id="reviewBuild">Confirm my build/);
assert.equal(get('confirmPrice').textContent, '₹3,90,000');
assert.equal(get('drivetrain').hidden, true);
assert.equal(get('reviewBuild').disabled, true);
assert.doesNotMatch(html, /<details class="detail-photos"/);
assert.doesNotMatch(html, /<div class="preview-notice">/);
assert.match(html, /\.hero\{background:#fff;border:0;border-radius:0;box-shadow:none\}/);
const matrix = [
  ['AVRO Gen-1', 'Velove Glide 50D', [390000, 432000, 530000]],
  ['AVRO Gen-1', 'Pertual Sharp Pro 47/58', [430000, 472000, 570000]],
  ['AVRO RISE', 'Velove Glide 50D', [397000, 439000, 537000]],
  ['AVRO RISE', 'Pertual Sharp Pro 47/58', [437000, 479000, 577000]],
];
let checked = 0;
for (const [cockpit, wheels, prices] of matrix) {
  get('cockpit').change(cockpit);
  get('wheelset').change(wheels);
  groupsets.forEach((button, index) => {
    button.click();
    assert.equal(get('drivetrain').hidden, false);
    assert.equal(get('reviewBuild').disabled, false);
    assert.equal(button.attributes['aria-expanded'], 'true');
    const expected = '₹' + new Intl.NumberFormat('en-IN').format(prices[index]);
    assert.equal(get('confirmPrice').textContent, expected);
    assert.ok(get('barGroupset').textContent.startsWith(expected));
    for (const id of ['summary', 'dialogSummary']) {
      assert.equal(get(id).children.at(-1).children[1].textContent, expected);
    }
    checked++;
    get('reviewBuild').click();
    const destination = new URL(whatsappUrl);
    assert.equal(destination.origin + destination.pathname, 'https://wa.me/917418498045');
    const message = destination.searchParams.get('text');
    for(const value of [expected, cockpit, wheels, button.dataset.groupset, 'XS (420)', 'Dune', '165 mm', '50 / 34T']) assert.ok(message.includes(value));
  });
}
groupsets[0].click();
get('cassette').change('11–36');
groupsets[1].click();
assert.equal(get('cassette').value, '11–34');
assert.equal(get('cassette').options[1].disabled, true);
const visibleMarkup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
assert.doesNotMatch(visibleMarkup, /<(?:s|del)\b|>[^<]*(?:MRP|% OFF|Save ₹)/i);
assert.match(html, /id="wheelset"><option>Velove Glide 50D<\/option><option>Pertual Sharp Pro 47\/58<\/option>/);
const production = fs.readFileSync(path.join(__dirname, '../tavelo-arow.html'), 'utf8');
assert.match(production, /rel="canonical" href="https:\/\/cyclify.in\/tavelo-arow.html"/);
assert.doesNotMatch(production, /content="noindex/);
assert.equal(production.match(/<script>\s*([\s\S]*?)<\/script>/)[1], script);
for(const [, asset] of production.matchAll(/(?:src|href)="(assets\/[^"?]+)(?:\?[^"\s]*)?"/g)) assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), 'Missing asset: ' + asset);
console.log(`Passed: ${checked} build prices, Velove-first default, full WhatsApp messages, drivetrain reveal, cassette compatibility and no MRP display.`);
