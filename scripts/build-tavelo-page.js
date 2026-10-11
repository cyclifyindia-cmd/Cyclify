'use strict';

// Keep the approved design and website page in sync, without enabling payment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tavelo-arow-build-preview.html'), 'utf8');
const footerVersion = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/js/site-footer.js'))).digest('hex').slice(0, 10);
const html = source
  .replace('<!-- Keep the unfinished local preview out of Google; production publication is a separate step. -->', '<!-- Custom-build enquiries are confirmed with Cyclify through WhatsApp. -->')
  .replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow,max-image-preview:large">\n<link rel="canonical" href="https://cyclify.in/tavelo-arow.html">\n<meta property="og:url" content="https://cyclify.in/tavelo-arow.html">')
  .replace('<span class="brand">TAVELO ARROW / BUILD STUDIO</span>', '<h1 class="brand" style="margin-top:0;font-weight:600">TAVELO ARROW / BUILD STUDIO</h1>')
  .replace('Sample configuration only. No stock or delivery promise is being made.', 'Confirm this configuration with Cyclify on WhatsApp. Stock and delivery lead time will be confirmed before payment.')
  .replace('assets/js/site-footer.js"', `assets/js/site-footer.js?v=${footerVersion}"`);
fs.writeFileSync(path.join(root, 'tavelo-arow.html'), html);
console.log('Prepared tavelo-arow.html: indexable, canonical and WhatsApp enquiry only.');
