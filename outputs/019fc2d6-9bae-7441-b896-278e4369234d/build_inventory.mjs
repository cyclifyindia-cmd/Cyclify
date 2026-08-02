import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repo = path.resolve(import.meta.dirname, "..", "..");
const outDir = import.meta.dirname;
const productHtml = await fs.readFile(path.join(repo, "product.html"), "utf8");
const baseMatch = productHtml.match(/const products=(\[[\s\S]*?\n\]);\s*window\.cyclifyMergeSupplierProducts/);
if (!baseMatch) throw new Error("Could not locate the website product catalogue.");

const context = { window: {} };
vm.createContext(context);
for (const file of ["supplier-products.js", "fcc-products.js", "cadence-products.js"]) {
  const code = await fs.readFile(path.join(repo, "assets", "js", file), "utf8");
  vm.runInContext(code, context, { filename: file });
}
const products = vm.runInNewContext(`(${baseMatch[1]})`);
context.window.cyclifyMergeSupplierProducts(products, "");
context.window.cyclifyMergeFccProducts(products, "");
context.window.cyclifyMergeCadenceProducts(products, "");

const seen = new Set();
const inventory = products
  .filter((item) => item && item.id != null && item.name && !seen.has(String(item.id)) && seen.add(String(item.id)))
  .map((item, index) => [index + 1, String(item.name).replace(/&amp;/g, "&"), item.available === false ? "Out of Stock" : "In Stock", null]);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Inventory");
sheet.showGridLines = false;
sheet.getRange("A1:D1").merge();
sheet.getRange("A1").values = [["Cyclify Product Inventory"]];
sheet.getRange("A2:D3").values = [
  ["Total Products", null, "In Stock", null],
  ["Out of Stock", null, "Updated", new Date("2026-08-02T00:00:00+05:30")],
];
sheet.getRange("B2").formulas = [[`=COUNTA(B6:B${inventory.length + 5})`]];
sheet.getRange("D2").formulas = [[`=COUNTIF(C6:C${inventory.length + 5},"In Stock")`]];
sheet.getRange("B3").formulas = [[`=COUNTIF(C6:C${inventory.length + 5},"Out of Stock")`]];
sheet.getRange("A5:D5").values = [["No.", "Product Name", "Status", "Quantity"]];
sheet.getRange(`A6:D${inventory.length + 5}`).values = inventory;

sheet.getRange("A1:D1").format = {
  fill: "#173B2D",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A1:D1").format.rowHeight = 30;
sheet.getRange("A2:D3").format = {
  fill: "#EEF6F1",
  font: { color: "#173B2D" },
  borders: { preset: "outside", style: "thin", color: "#B7D2C3" },
};
sheet.getRange("A2:A3").format.font = { bold: true, color: "#173B2D" };
sheet.getRange("C2:C3").format.font = { bold: true, color: "#173B2D" };
sheet.getRange("B2:B3").format.numberFormat = "#,##0";
sheet.getRange("D2").format.numberFormat = "#,##0";
sheet.getRange("D3").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("A5:D5").format = {
  fill: "#267A57",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: "#173B2D" },
};
sheet.getRange("A5:D5").format.rowHeight = 25;
sheet.getRange(`A6:D${inventory.length + 5}`).format = {
  borders: { insideHorizontal: { style: "thin", color: "#DDE7E1" } },
  verticalAlignment: "center",
};
sheet.getRange(`A6:A${inventory.length + 5}`).format.horizontalAlignment = "center";
sheet.getRange(`C6:D${inventory.length + 5}`).format.horizontalAlignment = "center";
sheet.getRange(`A6:A${inventory.length + 5}`).format.numberFormat = "0";
sheet.getRange(`D6:D${inventory.length + 5}`).format.numberFormat = "0";
sheet.getRange(`C6:C${inventory.length + 5}`).dataValidation = { rule: { type: "list", values: ["In Stock", "Out of Stock"] } };
sheet.getRange(`D6:D${inventory.length + 5}`).dataValidation = { rule: { type: "whole", operator: "greaterThanOrEqual", formula1: 0 } };
sheet.getRange(`C6:C${inventory.length + 5}`).conditionalFormats.add("containsText", { text: "In Stock", format: { fill: "#DDF4E8", font: { color: "#176B45", bold: true } } });
sheet.getRange(`C6:C${inventory.length + 5}`).conditionalFormats.add("containsText", { text: "Out of Stock", format: { fill: "#FDE7E7", font: { color: "#A52A2A", bold: true } } });
sheet.getRange(`D6:D${inventory.length + 5}`).format.fill = "#FFFBEA";
sheet.getRange("A:A").format.columnWidth = 18;
sheet.getRange("B:B").format.columnWidth = 54;
sheet.getRange("C:C").format.columnWidth = 18;
sheet.getRange("D:D").format.columnWidth = 14;
sheet.getRange(`B6:B${inventory.length + 5}`).format.wrapText = true;
sheet.freezePanes.freezeRows(5);
const table = sheet.tables.add(`A5:D${inventory.length + 5}`, true, "CyclifyInventory");
table.style = "TableStyleMedium4";
table.showFilterButton = true;

const inspect = await workbook.inspect({ kind: "table", range: `Inventory!A1:D${Math.min(inventory.length + 5, 20)}`, include: "values,formulas", tableMaxRows: 20, tableMaxCols: 4 });
console.log(inspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Inventory", range: `A1:D${Math.min(inventory.length + 5, 32)}`, scale: 1.4, format: "png" });
await fs.writeFile(path.join(outDir, "inventory-preview.png"), new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outDir, "Cyclify_Product_Inventory.xlsx"));
console.log(JSON.stringify({ total: inventory.length, inStock: inventory.filter(r => r[2] === "In Stock").length, outOfStock: inventory.filter(r => r[2] === "Out of Stock").length }));
