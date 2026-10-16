/* Generated from assets/data/diwali-campaign.json. */
window.CYCLIFY_CAMPAIGN={"id":"diwali-2026","name":"Cyclify Diwali Edit","tagline":"Light Up Your Next Ride","currency":"INR","timeZone":"Asia/Kolkata","startsAt":"2026-10-16T00:00:00+05:30","endsAt":"2026-11-10T23:59:59+05:30","endLabel":"10 November 2026","terms":"ThinkRider X2 Max is ₹29,999. All other listed ThinkRider products receive 10% off their pre-campaign selling price. Prices include the offer; no code is needed. Offers end 10 November 2026 at 11:59 pm IST. Subject to current stock. Other featured products are curated picks at their displayed prices.","products":{"36":{"name":"ThinkRider X2 Max Smart Trainer","regularPrice":35000,"salePrice":29999,"kind":"fixed-price"},"38":{"name":"ThinkRider XX PRO Foldable Smart Trainer","regularPrice":49999,"salePrice":44999.1,"kind":"percent-off","percentOff":10},"39":{"name":"ThinkRider VS 200 Virtual Shifting Controller","regularPrice":4999,"salePrice":4499.1,"kind":"percent-off","percentOff":10},"40":{"name":"ThinkRider Speed Cadence Sensor","regularPrice":1999,"salePrice":1799.1,"kind":"percent-off","percentOff":10},"54":{"name":"ThinkRider TPU 28g Ultralight Bicycle Tube","regularPrice":499,"salePrice":449.1,"kind":"percent-off","percentOff":10},"55":{"name":"ThinkRider Bike Trainer Front Wheel Block","regularPrice":499,"salePrice":449.1,"kind":"percent-off","percentOff":10},"56":{"name":"ThinkRider 12-Speed 11-34T Cassette","regularPrice":2999,"salePrice":2699.1,"kind":"percent-off","percentOff":10},"57":{"name":"ThinkRider Heart Rate Monitor with Chest Belt","regularPrice":2600,"salePrice":2340,"kind":"percent-off","percentOff":10},"58":{"name":"ThinkRider NL-15 Pro Bicycle Torque Wrench Set","regularPrice":3999,"salePrice":3599.1,"kind":"percent-off","percentOff":10}}};
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.CyclifyCampaign = factory(root.CYCLIFY_CAMPAIGN || {});
})(typeof window !== 'undefined' ? window : globalThis, function(config) {
  'use strict';
  function isActive(now) {
    const time = now === undefined ? Date.now() : new Date(now).getTime();
    return time >= Date.parse(config.startsAt) && time <= Date.parse(config.endsAt);
  }
  function ruleFor(id) { return (config.products || {})[String(id)] || null; }
  function offerFor(id, now) {
    const rule = ruleFor(id);
    return rule && isActive(now) ? { ...rule, campaignId: config.id, startsAt: config.startsAt, endsAt: config.endsAt } : null;
  }
  function resolveProduct(product, now) {
    const rule = ruleFor(product.id ?? product.productId);
    if (!rule) return { ...product };
    const offer = offerFor(product.id ?? product.productId, now);
    return { ...product, price: offer ? rule.salePrice : rule.regularPrice,
      regularPrice: rule.regularPrice, campaignOffer: offer };
  }
  function applyToProducts(products, now) {
    (products || []).forEach(product => Object.assign(product, resolveProduct(product, now)));
    return products;
  }
  function formatPrice(value) {
    const amount = Math.round(Number(value) * 100) / 100;
    return amount.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function toPaise(value) {
    const amount = Number(value);
    const paise = Math.round(amount * 100);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(paise) || paise < 0 || Math.abs(amount * 100 - paise) > 0.000001) {
      throw new Error('Invalid monetary amount.');
    }
    return paise;
  }
  return Object.freeze({ config, isActive, ruleFor, offerFor, resolveProduct, applyToProducts, formatPrice, toPaise });
});
