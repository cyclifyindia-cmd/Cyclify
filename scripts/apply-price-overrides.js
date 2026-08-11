const fs = require("node:fs");
const path = require("node:path");
const { overrides, applyPriceOverrides, formatMrp } = require("./price-overrides");

const root = path.resolve(__dirname, "..");
const supplierFiles = [
  ["cycletime-products.json", "supplier-products.js", "CYCLIFY_CYCLETIME_PRODUCTS", "cyclifyMergeSupplierProducts"],
  ["fcc-products.json", "fcc-products.js", "CYCLIFY_FCC_PRODUCTS", "cyclifyMergeFccProducts"],
  ["cadence-products.json", "cadence-products.js", "CYCLIFY_CADENCE_PRODUCTS", "cyclifyMergeCadenceProducts"],
];

function updateObjectBlocks(source) {
  const ids = new Set(Object.keys(overrides));
  const matches = [...source.matchAll(/\bid\s*:\s*(\d+)/g)].reverse();
  for (const match of matches) {
    const id = match[1];
    if (!ids.has(id)) continue;
    let start = source.lastIndexOf("{", match.index);
    if (start < 0) continue;
    let depth = 0;
    let quote = "";
    let escaped = false;
    let end = -1;
    for (let index = start; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
      if (char === "{") depth += 1;
      if (char === "}" && --depth === 0) { end = index + 1; break; }
    }
    if (end < 0) continue;
    const override = overrides[id];
    let block = source.slice(start, end);
    block = block.replace(/\bprice\s*:\s*\d+/, `price:${override.price}`);
    if (/\bmrp\s*:/.test(block)) {
      block = block.replace(/\bmrp\s*:\s*(["'])(.*?)\1/, `mrp:"${formatMrp(override.mrp)}"`);
    }
    source = source.slice(0, start) + block + source.slice(end);
  }
  return source;
}

for (const file of fs.readdirSync(root).filter(file => file.endsWith(".html"))) {
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, "utf8");
  const updated = updateObjectBlocks(original);
  if (updated !== original) fs.writeFileSync(filePath, updated, "utf8");
}

for (const [dataFile, scriptFile, globalName, mergeName] of supplierFiles) {
  const dataPath = path.join(root, "assets", "data", dataFile);
  if (!fs.existsSync(dataPath)) continue;
  const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const matched = (payload.products || []).filter(product => overrides[String(product.id)]).length;
  if (!matched) continue;
  applyPriceOverrides(payload.products || []);
  fs.writeFileSync(dataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const runtime = `(function(){\n  const payload=${JSON.stringify(payload)};\n  window.${globalName}=payload.products;\n  window.${mergeName}=function(target,page){\n    const normalise=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"");\n    payload.products.filter(item=>!page||item.categoryPage===page).forEach(item=>{\n      const existing=target.find(product=>product.id===item.id||product.sourceHandle===item.sourceHandle||normalise(product.name)===normalise(item.name));\n      if(existing){const id=existing.id;Object.assign(existing,item,{id});}\n      else{target.push({...item});}\n    });\n    return target;\n  };\n})();\n`;
  fs.writeFileSync(path.join(root, "assets", "js", scriptFile), runtime, "utf8");
}

console.log(`Applied ${Object.keys(overrides).length} permanent price override(s).`);
