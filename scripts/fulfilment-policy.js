'use strict';
const policy = require('../assets/data/fulfilment-policy.json');

function validateRange(range) {
  if (!Number.isInteger(range.min) || !Number.isInteger(range.max) || range.min < 0 || range.max < range.min) {
    throw new Error('Invalid confirmed delivery range');
  }
}
validateRange(policy.handling);
validateRange(policy.standardTransit);
const overrides = new Map();
for (const override of policy.overrides) {
  validateRange(override.transit);
  for (const id of override.productIds) {
    if (overrides.has(Number(id))) throw new Error('Duplicate delivery override: '+id);
    overrides.set(Number(id), override);
  }
}

function deliveryFor(product) {
  if (product.available === false || product.preorder || product.priceOnRequest) return null;
  const override = overrides.get(Number(product.id));
  // Do not turn an unspecified custom lead time into a three-day promise.
  if (!override && product.deliveryText) return null;
  return {
    handling: policy.handling,
    transit: override ? override.transit : policy.standardTransit,
    businessDays: policy.businessDays,
    shippingLabel: override ? override.shippingLabel : '',
  };
}

function deliverySchemaFor(product) {
  const delivery = deliveryFor(product);
  if (!delivery) return null;
  const quantity = range => ({'@type':'QuantitativeValue', minValue:range.min, maxValue:range.max, unitCode:'DAY'});
  return {
    '@type':'ShippingDeliveryTime',
    businessDays:{'@type':'OpeningHoursSpecification',dayOfWeek:delivery.businessDays.map(day=>'https://schema.org/'+day)},
    handlingTime:quantity(delivery.handling),
    transitTime:quantity(delivery.transit),
  };
}

function assertMerchantAvailability(product) {
  if (product.available !== false && product.preorder && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(product.availabilityDate || '')) {
    throw new Error('Pre-order product needs a confirmed availabilityDate: '+product.id);
  }
}

module.exports = {deliveryFor, deliverySchemaFor, assertMerchantAvailability};
