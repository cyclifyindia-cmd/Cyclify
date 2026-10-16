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
