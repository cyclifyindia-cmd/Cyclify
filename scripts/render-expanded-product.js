const cheerio = require('cheerio');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const escape = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const version = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,10);

function renderExpandedProduct(page, product) {
  if (product.inventoryGroup !== 'expanded') return page;
  const $ = cheerio.load(page);
  const stock = product.stockStatus === 'coming-soon' ? 'Coming Soon' : (product.available ? 'In stock' : 'Contact for More Info');
  $('body').addClass('expanded-product-page');
  $('head').append(`<link rel="stylesheet" href="assets/css/expanded-product.css?v=${version('assets/css/expanded-product.css')}">`);
  const media = $('<div class="expanded-media"></div>').append($('#productGallery'),$('#productThumbs'));
  media.find('.gallery-btn').remove();
  media.append('<p class="expanded-gallery-help">Swipe or select a photo to explore. Tap the main image to enlarge.</p>');
  const panel = $('<div class="expanded-buy-panel"></div>').append($('#productName'),$('#productPriceLine'));
  panel.append('<p class="expanded-tax">Inclusive of taxes. Free shipping across India.</p>');
  panel.append('<section class="expanded-configurator" aria-label="Choose your product options"><div class="size-section" id="expandedBuildSection"><div class="size-label">Select Build</div><div id="expandedBuildOptions" class="size-options"></div></div></section>');
  panel.find('.expanded-configurator').append($('#sizeSection'),$('#valveSection'));
  panel.find('#sizeSection .size-label').text(product.primaryLabel || 'Select Size');
  if (product.sizeGuideTables?.length) {
    panel.find('#sizeSection .size-label').append('<button type="button" id="expandedSizeGuideOpen" class="expanded-size-guide-link" aria-haspopup="dialog" aria-controls="expandedSizeGuide">Size guide</button>');
  }
  panel.find('.expanded-configurator').append(`<div class="expanded-purchase-meta"><div class="expanded-quantity"><label for="a7lQuantity">Quantity</label><div><button type="button" data-expanded-step="-1" aria-label="Reduce quantity">−</button><input id="a7lQuantity" type="number" min="1" max="10" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" data-expanded-step="1" aria-label="Increase quantity">+</button></div></div><div><p id="expandedStock" class="expanded-stock" role="status">${stock}</p><span class="expanded-secure">Secure checkout</span></div></div>`);
  panel.append($('#productButtons'),$('#productFulfilment'));
  panel.find('#productFulfilment').attr('hidden','').empty();
  panel.append(`<p class="expanded-overview">${escape(product.description)}</p><a class="expanded-spec-link" href="#expandedSpecifications">View specifications ↓</a>`);
  if (product.stockStatus === 'contact') panel.append('<p class="expanded-overview"><a href="contact-us.html">Contact Cyclify for availability and ordering help →</a></p>');
  $('.product').empty().addClass('expanded-product').append(media,panel);
  $('.specification-section').attr('id','expandedSpecifications');
  $('#specificationTitle').text('Specifications & compatibility');
  if (product.sizeGuideTables?.length) {
    const charts = product.sizeGuideTables.map(table => '<div class="expanded-chart-scroll"><table><thead><tr>'+table.headers.map(value=>'<th scope="col">'+escape(value)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(row=>'<tr>'+row.map(value=>'<td>'+escape(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>').join('');
    $('script[src*="site-footer.js"]').before('<dialog id="expandedSizeGuide" class="expanded-size-guide"><div class="expanded-dialog-heading"><h2>Size guide</h2><button type="button" data-expanded-close aria-label="Close size guide">×</button></div>'+charts+'</dialog>');
  }
  if (!product.available) {
    $('#productButtons button').prop('disabled',true).text(stock);
    $('#productPriceLine .shipping-note').text(stock);
  }
  $('script[src*="site-footer.js"]').before(`<script src="assets/js/expanded-product.js?v=${version('assets/js/expanded-product.js')}"></script>`);
  return $.html();
}

module.exports = { renderExpandedProduct };
