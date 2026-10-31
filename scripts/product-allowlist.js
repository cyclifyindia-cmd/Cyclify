const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const allowlistPath = path.join(root, "assets", "data", "product-allowlist.json");
const policyPath=path.join(root,'assets/data/catalogue-policy.json');
const sourceFiles=['cycletime-products.json','fcc-products.json','cadence-products.json','expanded-products.json','2xu-products.json','distributor-products.json','distributor-products-2.json','distributor-products-3.json'];
const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function loadCataloguePolicy(){return fs.existsSync(policyPath)?JSON.parse(fs.readFileSync(policyPath,'utf8')):{removedBrands:[],brandCategoryRestrictions:{},removedProductIds:[]};}
function permittedByPolicy(product,policy=loadCataloguePolicy()){
 if((policy.removedProductIds||[]).map(String).includes(String(product.id)))return false;
 const brand=norm(product.brand),name=String(product.name||'').toLowerCase();
 if((policy.removedBrands||[]).some(b=>norm(b)===brand||name.startsWith(b.toLowerCase()+' ')))return false;
 const categoryPage=product.categoryPage||product.sourcePage||(product.category==='Bikes & Frames'?'bikes-frames.html':'');
 return Object.entries(policy.brandCategoryRestrictions||{}).every(([b,pages])=>(norm(b)!==brand&&!name.startsWith(b.toLowerCase()+' '))||pages.includes(String(categoryPage).split('?')[0]));
}

function loadAllowedProductIds() {
  const payload = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  if (payload.mode !== "allowlist" || !Array.isArray(payload.productIds)) {
    throw new Error("Invalid product allowlist configuration");
  }
  const ids = new Set(payload.productIds.map(value => String(value).trim()).filter(Boolean));
  const policy=loadCataloguePolicy();
  for(const id of policy.removedProductIds||[])ids.delete(String(id));
  for(const file of sourceFiles){const target=path.join(root,'assets/data',file);if(fs.existsSync(target))for(const product of JSON.parse(fs.readFileSync(target,'utf8')).products||[])if(!permittedByPolicy(product,policy))ids.delete(String(product.id));}
  if (!ids.size) throw new Error("Product allowlist must not be empty");
  return ids;
}

function filterAllowedProducts(products, allowedIds = loadAllowedProductIds()) {
  if (!Array.isArray(products)) throw new TypeError("Expected an array of products");
  const policy=loadCataloguePolicy();
  return products.filter(product => allowedIds.has(String(product && product.id))&&permittedByPolicy(product,policy));
}

module.exports = { allowlistPath, loadAllowedProductIds, filterAllowedProducts, loadCataloguePolicy, permittedByPolicy, sourceFiles };
