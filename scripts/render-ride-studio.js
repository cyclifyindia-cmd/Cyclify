const { styles, metrics } = require('../assets/js/ride-studio-model');
const escape = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const imageSet = image => escape(image.small)+' 640w, '+escape(image.src)+' 1536w';
function renderRideStudio() {
  const bike=styles.endurance, image=bike.images[0];
  return `<section id="cyclify-ride-studio" class="ride-studio" aria-labelledby="ride-studio-title" data-style="endurance">
    <div class="rs-shell">
      <header class="rs-header"><div><p class="rs-kicker">CYCLIFY RIDE STUDIO</p><h2 id="ride-studio-title">Compare bike types</h2></div><p class="rs-intro">Choose a riding style. See the bike,<br> then open its geometry.</p></header>
      <div class="rs-types" role="group" aria-label="Choose your riding style">${Object.entries(styles).map(([id,s])=>`<button type="button" data-rs-style="${id}" aria-pressed="${id==='endurance'}">${s.label}</button>`).join('')}</div>
      <div class="rs-workspace">
        <div class="rs-visual">
          <div class="rs-scene-label"><span data-rs-terrain>${escape(bike.terrain)}</span><span data-rs-photo-count>01 / 03</span></div>
          <div class="rs-image-stage" aria-busy="false" data-rs-stage>
            <img class="rs-photo" data-rs-photo src="${escape(image.src)}" srcset="${imageSet(image)}" sizes="(max-width:800px) 94vw, 680px" width="1536" height="960" alt="${escape(image.alt)}" loading="lazy" decoding="async">
            <p class="rs-photo-status" data-rs-photo-status role="status" hidden></p>
          </div>
          <div class="rs-visual-controls">
            <div class="rs-views" role="group" aria-label="Choose a bike photograph">${bike.images.map((v,i)=>`<button type="button" data-rs-view="${i}" aria-pressed="${i===0}"><img data-rs-preview src="${escape(v.small)}" alt="" width="80" height="50" loading="lazy" decoding="async"><span data-rs-view-label>${escape(v.label)}</span></button>`).join('')}</div>
          </div>
          <div class="rs-gallery-footer"><p class="rs-photo-credit" data-rs-photo-credit>Photos: ${escape(bike.brand)}</p><button type="button" class="rs-tour" data-rs-tour aria-pressed="false">Play styles</button></div>
        </div>
        <div class="rs-story" aria-live="polite" aria-atomic="true">
          <span class="rs-story-index" data-rs-style-name>${escape(bike.year)} · ENDURANCE</span>
          <h3 data-rs-name>${escape(bike.name)}</h3><p class="rs-build" data-rs-build>${escape(bike.build)}</p>
          <p class="rs-use" data-rs-heading>${escape(bike.title)}</p><p data-rs-description>${escape(bike.description)}</p>
          <ul data-rs-features>${bike.features.map(f=>`<li>${escape(f)}</li>`).join('')}</ul>
          <a class="rs-shop" data-rs-shop href="${escape(bike.shop)}">${escape(bike.shopLabel)}<span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <details class="rs-explain">
        <summary><span>Geometry explained <small data-rs-summary>Reference size ${escape(bike.size)}</small></span><b aria-hidden="true">+</b></summary>
        <div class="rs-explain-body">
          <p class="rs-geometry-intro">Select a measurement to see what it means.</p>
          <div class="rs-metrics" role="group" aria-label="Explore a bike measurement">${Object.entries(metrics).map(([id,m])=>`<button type="button" data-rs-metric="${id}" aria-pressed="${id==='stack'}"><span data-rs-metric-label="${id}">${escape(bike.metricLabels?.[id] || m.label)}</span><strong data-rs-value="${id}">${escape(bike.values[id])}</strong></button>`).join('')}</div>
          <div class="rs-geometry-layout">
            <figure class="rs-diagram"><a data-rs-diagram-source href="${escape(bike.diagramSource || bike.source)}" target="_blank" rel="noopener noreferrer"><img data-rs-diagram src="${escape(bike.diagram)}" width="877" height="538" alt="${escape(bike.diagramAlt || bike.name+' geometry reference diagram')}" loading="lazy" decoding="async"></a><figcaption data-rs-diagram-caption>${escape(bike.diagramCaption || 'Manufacturer’s reference diagram. Measurements depend on size.')}</figcaption></figure>
            <div class="rs-lesson" aria-live="polite" aria-atomic="true"><p class="rs-lesson-value" data-rs-lesson-value>${escape(bike.metricLabels?.stack || metrics.stack.label)} · ${escape(bike.values.stack)}</p><h4 data-rs-lesson-title>${escape(metrics.stack.title)}</h4><p data-rs-lesson-text>${escape(metrics.stack.text)}</p><p class="rs-tip" data-rs-insight>${escape(bike.insight)}</p></div>
          </div>
          <p class="rs-model-note" data-rs-model-note>${escape(bike.note)}</p>
          <a class="rs-source-link" data-rs-source href="${escape(bike.source)}" target="_blank" rel="noopener noreferrer">View ${escape(bike.brand)}’s model specifications ↗</a>
          <p class="rs-fit-note">Use these figures to understand the bike, not to choose your size. Sizes vary between brands and bike types; check the model’s fit guide or speak to a bike fitter.</p>
        </div>
      </details>
      <details class="rs-credits"><summary>About these reference bikes</summary><p class="rs-reference-note">Reference bikes for comparison, not Cyclify inventory. Actual photographs, not a rotatable 3D model. Photos and specifications belong to the respective manufacturers; no brand affiliation is implied.</p></details>
      <noscript><p class="rs-fit-note">Enable JavaScript to switch bikes and photo views. The Roubaix photos, geometry and collection link remain available.</p></noscript>
    </div>
  </section>`;
}
function renderStoreNote() {
  return '<section class="cyclify-store-note" aria-labelledby="cyclify-store-guide"><div><h2 id="cyclify-store-guide">Cycling equipment, from Cyclify in Tuticorin</h2><p>Shop bikes, frames, wheelsets and components, along with trainers, bike computers and riding kit. Check each product’s price, specifications and availability, or use our cycling guides to compare your options.</p></div></section>';
}
module.exports = { renderRideStudio, renderStoreNote };
