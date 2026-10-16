'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../assets/data/diwali-campaign.json');
const factory = require('../assets/js/campaign-pricing');
const campaign = factory(config);

function buildCampaignAssets() {
  const resolver = fs.readFileSync(path.join(root, 'assets/js/campaign-pricing.js'), 'utf8');
  const browser = '/* Generated from assets/data/diwali-campaign.json. */\nwindow.CYCLIFY_CAMPAIGN=' + JSON.stringify(config).replace(/</g, '\\u003c') + ';\n' + resolver;
  const destination = path.join(root, 'assets/js/diwali-campaign.js');
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== browser) fs.writeFileSync(destination, browser);
  return browser;
}

module.exports = { campaign, buildCampaignAssets };
