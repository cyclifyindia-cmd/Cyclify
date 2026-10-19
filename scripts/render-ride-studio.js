const { styles, views, metrics } = require('../assets/js/ride-studio-model');
const escape = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const imageSet = image => escape(image.small)+' 640w, '+escape(image.src)+' 1536w';
function renderRideStudio() {
  const bike=styles.endurance, image=bike.images[0];
  return `<section id="cyclify-ride-studio" class="ride-studio" aria-labelledby="ride-studio-title" data-style="endurance">
    <div class="rs-shell">
      <header class="rs-header"><div><p class="rs-kicker">CYCLIFY RIDE STUDIO</p><h2 id="ride-studio-title">Find your kind of ride.</h2></div><p class="rs-intro">Real bikes. Real geometry.<br> Explore what makes each ride different.</p></header>
      <div class="rs-types" role="group" aria-label="Choose your riding style">${Object.entries(styles).map(([id,s])=>`<button type="button" data-rs-style="${id}" aria-pressed="${id==='endurance'}">${s.label}</button>`).join('')}</div>
      <div class="rs-workspace">
        <div class="rs-visual">
          <div class="rs-scene-label"><span data-rs-terrain>${escape(bike.terrain)}</span><span>OFFICIAL PHOTOGRAPHY</span></div>
          <div class="rs-image-stage" aria-busy="false" data-rs-stage>
            <img class="rs-photo" data-rs-photo src="${escape(image.src)}" srcset="${imageSet(image)}" sizes="(max-width:800px) 94vw, 680px" width="1536" height="960" alt="${escape(image.alt)}" loading="lazy" decoding="async">
            <p class="rs-photo-status" data-rs-photo-status role="status" hidden></p>
          </div>
          <div class="rs-visual-controls">
            <div class="rs-views" role="group" aria-label="Choose a bike photograph">${views.map((v,i)=>`<button type="button" data-rs-view="${i}" aria-pressed="${i===0}">${v.label}</button>`).join('')}</div>
            <button type="button" class="rs-tour" data-rs-tour aria-pressed="false">Play styles</button>
          </div>
          <p class="rs-photo-credit">Photos: Specialized. Unmodified model designs.</p>
        </div>
        <div class="rs-story" aria-live="polite" aria-atomic="true">
          <span class="rs-story-index" data-rs-style-name>${bike.year} · ENDURANCE</span>
          <h3 data-rs-name>${bike.name}</h3><p class="rs-build" data-rs-build>${bike.build}</p>
          <h4 data-rs-heading>${bike.title}</h4><p data-rs-description>${bike.description}</p>
          <ul data-rs-features>${bike.features.map(f=>`<li>${escape(f)}</li>`).join('')}</ul>
          <a class="rs-shop" data-rs-shop href="${bike.shop}">${bike.shopLabel}<span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <details class="rs-explain">
        <summary><span>Explore the geometry <small data-rs-summary>Reference frame · Size ${bike.size}</small></span><b aria-hidden="true">+</b></summary>
        <div class="rs-explain-body">
          <p class="rs-geometry-intro">Tap a measurement to understand it.</p>
          <div class="rs-metrics" role="group" aria-label="Explore a bike measurement">${Object.entries(metrics).map(([id,m])=>`<button type="button" data-rs-metric="${id}" aria-pressed="${id==='stack'}"><span>${m.label}</span><strong data-rs-value="${id}">${bike.values[id]}</strong></button>`).join('')}</div>
          <div class="rs-geometry-layout">
            <figure class="rs-diagram"><img data-rs-diagram src="${bike.diagram}" width="877" height="538" alt="Specialized Roubaix geometry reference diagram" loading="lazy" decoding="async"><figcaption>Manufacturer’s reference diagram. Measurements depend on size.</figcaption></figure>
            <div class="rs-lesson" aria-live="polite" aria-atomic="true"><p class="rs-lesson-value" data-rs-lesson-value>Stack · ${bike.values.stack}</p><h4 data-rs-lesson-title>${metrics.stack.title}</h4><p data-rs-lesson-text>${metrics.stack.text}</p><p class="rs-tip" data-rs-insight>${bike.insight}</p></div>
          </div>
          <p class="rs-model-note" data-rs-model-note>${escape(bike.note)}</p>
          <a class="rs-source-link" data-rs-source href="${bike.source}" target="_blank" rel="noopener noreferrer">View Specialized’s model specifications ↗</a>
          <p class="rs-fit-note">Educational reference, not a bike-fit prescription. Frame sizes are not equivalent across riding categories. Check the exact model’s chart and get a professional fit where needed.</p>
        </div>
      </details>
      <p class="rs-reference-note">S-Works models shown for comparison, not as Cyclify stock. Photos and model data © Specialized. No brand affiliation implied.</p>
      <noscript><p class="rs-fit-note">Enable JavaScript to switch bikes and photo views. The Roubaix photos, geometry and collection link remain available.</p></noscript>
    </div>
  </section>`;
}
module.exports = { renderRideStudio };
