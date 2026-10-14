const cheerio=require('cheerio');
const paths={88001:'products/vook-v8e-carbon-road-bike-88001.html',88002:'products/vook-v8e-pro-carbon-road-bike-88002.html'};
const money=value=>'₹'+Number(value).toLocaleString('en-IN');
function renderVookCollection(page,products){
const $=cheerio.load(page);
const bikes=products.filter(product=>[88001,88002].includes(Number(product.id)));
const section=$('<section class="vook-search-details" aria-labelledby="vook-comparison-title" style="max-width:1000px;margin:30px auto;padding:24px;line-height:1.7;background:#fff"></section>');
section.append('<h2 id="vook-comparison-title">Compare VOOK V8E carbon road bikes</h2><p>Explore VOOK bikes in India from Cyclify. The V8E combines a carbon frame and fork with L-TWOO eGR electronic 1 × 13-speed shifting and hydraulic disc brakes. Choose the standard aluminium-wheel bike or our V8E Pro carbon-wheel build.</p>');
const list=$('<ul></ul>');
for(const bike of bikes){const item=$('<li></li>');item.append($('<a></a>').attr('href',paths[bike.id]).text(bike.name+' — '+money(bike.price)));item.append($('<span></span>').text(Number(bike.id)===88002?' · Velove Glide 50 mm carbon wheels, ratchet hubs, 1,445 g wheelset.':' · WE ONE 25 mm aluminium wheels, ratchet hubs, 1,680 g wheelset.'));list.append(item);}
section.append(list,'<h3>VOOK V8, V8E and V8E Pro: which bike is listed?</h3><p>If you are searching for a VOOK V8 road bike, these listings cover the V8E electronic-shifting complete bike and Cyclify’s V8E Pro build. Our Pro build uses the same V8E base bike with the Velove carbon-wheel upgrade; it does not add a different groupset.</p><h3>Sizes, colours and delivery in India</h3><p>Both bikes are stocked in S (49 cm), M (51 cm) and L (53 cm), in Black, Blue, Pink and Silver. Use Size &amp; Geometry on the product page before choosing your fit. Current prices and stock are shown on each listing, with free shipping across India.</p><p><a href="bikes-frames.html">Compare other carbon road bikes and frames</a> · <a href="shipping-policy.html">Shipping details</a> · <a href="exchange-policy.html">Exchange policy</a></p>');
$('#products').after(section);
return $.html();
}
module.exports={renderVookCollection};
