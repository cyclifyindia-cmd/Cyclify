'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');
const root = path.resolve(__dirname, '..');

// Run the store's own filters and card renderer at build time so Google and
// customers without JavaScript receive the same catalogue as the browser.
function renderCatalogSeo(source, { file, catalogue, category, sub, heading, description, productNames, manualProducts = [] }) {
  const $ = cheerio.load(source);
  const nodes = {};
  const document = { getElementById(id) {
    return nodes[id] || (nodes[id] = {
      innerHTML: '', textContent: '', value: '', style: {},
      addEventListener() {}, classList: { toggle() {}, add() {}, remove() {} }
    });
  } };
  const context = {
    document, URLSearchParams, console,
    localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null },
    location: { search: '', pathname: '/' + file }, history: { pushState() {} },
    addEventListener() {}
  };
  context.window = context;
  context.CyclifyCampaign = require('./campaign-pricing').campaign;
  vm.createContext(context);
  for (const script of ['product-routes.js', catalogue, ...(file.includes('bikes') || file === 'bikes-frames.html' || file === 'tfsa-frames.html' ? ['tfsa-products.js'] : [])]) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js', script), 'utf8'), context, { timeout: 2000 });
  }
  const main = $('script:not([src])').toArray().find(element => $(element).html().includes('const products='));
  if (!main) throw new Error('Missing catalogue script: ' + file);
  let mainScript = $(main).html();
  mainScript = mainScript.replace(/alt="\$\{product.name\}"/g, `alt="\${product.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"`);
  if(!mainScript.includes('/* campaign pricing */'))mainScript=mainScript.replace('const container','/* campaign pricing */\nwindow.CyclifyCampaign?.applyToProducts(products);\nconst container');
  if(!mainScript.includes('function renderProducts(){\nwindow.CyclifyCampaign'))mainScript=mainScript.replace('function renderProducts(){','function renderProducts(){\nwindow.CyclifyCampaign?.applyToProducts(products);');
  mainScript = mainScript.replace(/\s*\/\* canonical product names \*\/[\s\S]*?\/\* end canonical product names \*\/\s*/g, '\n\n');
  mainScript = mainScript.replace(/\s*\/\* canonical manual products \*\/[\s\S]*?\/\* end canonical manual products \*\/\s*/g, '\n\n');
  // A manually owned product must remain discoverable even when its category's
  // original inline array was emptied during a catalogue import.
  if (manualProducts.length) {
    mainScript = mainScript.replace('const container', '/* canonical manual products */\nconst cyclifyManualProducts=' + JSON.stringify(manualProducts).replace(/</g, '\\u003c') + ';\ncyclifyManualProducts.forEach(product=>{const existing=products.find(item=>String(item.id)===String(product.id));if(existing)Object.assign(existing,product);else products.push(product);});\n/* end canonical manual products */\nconst container');
  }
  if (productNames) {
    const marker = 'const container';
    mainScript = mainScript.replace(marker, '/* canonical product names */\nconst cyclifyProductNames=' + JSON.stringify(productNames).replace(/</g, '\\u003c') + ';\nproducts.forEach(product=>{if(cyclifyProductNames[product.id])product.name=cyclifyProductNames[product.id];});\n/* end canonical product names */\n' + marker);
  }
  // Real anchors remain after client-side filtering as well as in initial HTML.
  mainScript = mainScript.replace(/(<h3(?: class="cyclify-card-title")?>)\$\{product.name\}(<\/h3>)/g,
    '$1<a href="${product.url||cyclifyProductUrl(product.id)}" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none">${product.name}</a>$2');
  // An empty subcategory must not silently turn into the entire catalogue.
  mainScript = mainScript.replace(/if\(activeCategory&&!visibleCategories.some\(category=>category.key===activeCategory\)\)\{\s*activeCategory="";\s*(?:activeSubCategory="";\s*)?\}/g, '');
  $(main).html(mainScript);
  if(!$('script[src*="diwali-campaign.js"]').length)$('head').prepend('<script src="assets/js/diwali-campaign.js"></script><script src="assets/js/diwali.js" defer></script><script src="assets/js/campaign-storefront.js" defer></script>');
  vm.runInContext(mainScript, context, { timeout: 2000 });
  if (category) {
    vm.runInContext('activeCategory=' + JSON.stringify(category) + ';' +
      (sub ? 'activeSubCategory=' + JSON.stringify(sub) + ';' : '') + 'renderCategories();renderProducts();', context, { timeout: 2000 });
  }
  const products = vm.runInContext('getFilteredProducts()', context);
  $('#products').html(nodes.products.innerHTML);
  $('#categoryStrip').html(nodes.categoryStrip.innerHTML);
  $('#categorySummary').text(nodes.categorySummary.textContent);
  if (nodes.subCategoryStrip) $('#subCategoryStrip').html(nodes.subCategoryStrip.innerHTML);
  $('.page-heading').replaceWith($('<h1 class="page-heading" style="margin:0;font:inherit"></h1>').text(heading));
  $('meta[name="robots"]').attr('content', products.length ? 'index,follow,max-image-preview:large' : 'noindex,follow');
  const canonical = 'https://cyclify.in/' + file;
  const graph = [
    { '@type': 'CollectionPage', '@id': canonical + '#webpage', url: canonical, name: heading, description,
      isPartOf: { '@id': 'https://cyclify.in/#website' }, mainEntity: { '@id': canonical + '#products' } },
    { '@type': 'ItemList', '@id': canonical + '#products', numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({ '@type': 'ListItem', position: index + 1,
        name: product.name, url: 'https://cyclify.in/' + (product.url || context.cyclifyProductUrl(product.id)) })) },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyclify.in/' },
      { '@type': 'ListItem', position: 2, name: heading, item: canonical }
    ] }
  ];
  $('script[type="application/ld+json"]').remove();
  $('head').append('<script type="application/ld+json" id="cyclify-category-schema">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') + '</script>');
  return $.html();
}

module.exports = { renderCatalogSeo };
