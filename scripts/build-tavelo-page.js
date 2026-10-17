'use strict';

// Keep the approved design and website page in sync, without enabling payment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tavelo-arow-build-preview.html'), 'utf8');
const footerVersion = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/js/site-footer.js'))).digest('hex').slice(0, 10);
const canonical = 'https://cyclify.in/tavelo-arow.html';
const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Product', '@id': canonical + '#product', name: 'TAVELO Arow Carbon Aero Road Bike',
      url: canonical, brand: { '@type': 'Brand', name: 'TAVELO' }, model: 'Arow',
      description: 'Configure a TAVELO Arow carbon road bike with Shimano 105 Di2, Ultegra Di2 or Dura-Ace Di2, AVRO handlebars and Velove or Pertual wheels. Availability and delivery are confirmed by Cyclify before payment.',
      image: ['customer-reference-1.png', 'customer-reference-2.jpg', 'customer-reference-3.jpg'].map(file => 'https://cyclify.in/assets/products/tavelo-arow/' + file),
      // A custom-build enquiry, not an in-stock checkout Offer or feed item.
      offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: '390000', highPrice: '577000', offerCount: 12,
        seller: { '@type': 'Organization', '@id': 'https://cyclify.in/#organization', name: 'CYCLIFY INDIA', url: 'https://cyclify.in/' } }
    },
    { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: 'TAVELO Arow Build Studio',
      mainEntity: { '@id': canonical + '#product' }, isPartOf: { '@id': 'https://cyclify.in/#website' } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyclify.in/' },
      { '@type': 'ListItem', position: 2, name: 'Bikes & Frames', item: 'https://cyclify.in/bikes-frames.html' },
      { '@type': 'ListItem', position: 3, name: 'TAVELO Road Bikes', item: 'https://cyclify.in/tavelo-bikes.html' },
      { '@type': 'ListItem', position: 4, name: 'TAVELO Arow', item: canonical }
    ] }
  ]
};
const html = source
  .replace('<!-- Keep the unfinished local preview out of Google; production publication is a separate step. -->', '<!-- Custom-build enquiries are confirmed with Cyclify through WhatsApp. -->')
  .replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow,max-image-preview:large">\n<link rel="canonical" href="https://cyclify.in/tavelo-arow.html">\n<meta property="og:url" content="https://cyclify.in/tavelo-arow.html">')
  .replace('<span class="brand">TAVELO AROW / BUILD STUDIO</span>', '<h1 class="brand" style="margin-top:0;font-weight:600">TAVELO AROW / BUILD STUDIO</h1>')
  .replace('Sample configuration only. No stock or delivery promise is being made.', 'Confirm this configuration with Cyclify on WhatsApp. Stock and delivery lead time will be confirmed before payment.')
  .replace(/assets\/js\/site-footer\.js(?:\?v=[^"]+)?"/, `assets/js/site-footer.js?v=${footerVersion}"`)
  .replace('</head>', '<meta name="twitter:title" content="TAVELO Arow Aero Road Bike India | Cyclify">\n<meta name="twitter:description" content="Configure your TAVELO Arow road bike with Shimano Di2, AVRO handlebars and your choice of wheels. Builds start at ₹3,90,000.">\n<meta name="twitter:image" content="https://cyclify.in/assets/products/tavelo-arow/customer-reference-1.png">\n<script type="application/ld+json" id="cyclify-tavelo-schema">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n</head>');
const outputPath=path.join(root,'tavelo-arow.html');
if(!fs.existsSync(outputPath))fs.writeFileSync(outputPath,html);
else if(fs.readFileSync(outputPath,'utf8')!==html){const fd=fs.openSync(outputPath,'r+');try{fs.writeFileSync(fd,html);fs.ftruncateSync(fd,Buffer.byteLength(html));}finally{fs.closeSync(fd);}}
console.log('Prepared tavelo-arow.html: indexable, canonical and WhatsApp enquiry only.');
