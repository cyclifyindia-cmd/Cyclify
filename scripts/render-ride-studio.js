const { styles, colours, metrics, parts } = require('../assets/js/ride-studio-model');
const escape = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const attrs = values => Object.entries(values).map(([key,value]) => ` ${key}="${escape(value)}"`).join('');

function renderRideStudio() {
  const initial = styles.endurance;
  const initialParts = parts(initial.geometry);
  const part = (id, tag='path', extra='') => `<${tag} data-rs-part="${id}"${attrs(initialParts[id] || {})} ${extra}></${tag}>`;
  const spokes = Array.from({ length: 20 },(_,i) => {
    const angle = i*Math.PI/10;
    return `<path d="M${(Math.cos(angle+.55)*10).toFixed(2)} ${(Math.sin(angle+.55)*10).toFixed(2)} L${(Math.cos(angle)*106).toFixed(2)} ${(Math.sin(angle)*106).toFixed(2)}"/>`;
  }).join('');
  const wheel = id => `<g data-rs-part="${id}"${attrs(initialParts[id])}>
    <circle class="rs-tyre" r="115"/><circle class="rs-tread" r="118"/><circle class="rs-sidewall" r="112"/>
    <circle class="rs-rim" r="104"/><circle class="rs-rim-edge" r="108"/>
    <g class="rs-wheel-spokes">${spokes}</g><circle class="rs-rotor" r="28"/><circle class="rs-rotor-cut" r="22"/>
    <circle class="rs-hub" r="9"/><circle class="rs-axle" r="3"/>
    <path d="M-5 -106h10" stroke="#dbdfdc" stroke-width="2"/><path d="M0 -105v10" stroke="#858f8a" stroke-width="2"/>
  </g>`;
  return `<section id="cyclify-ride-studio" class="ride-studio" aria-labelledby="ride-studio-title" data-style="endurance">
  <div class="rs-shell">
    <header class="rs-header"><div><p class="rs-kicker">CYCLIFY RIDE STUDIO</p><h2 id="ride-studio-title">Your ride. Your way.</h2></div><p class="rs-intro">Shape a bike. Find your style.<br> Discover what geometry changes.</p></header>
    <div class="rs-types" role="group" aria-label="Choose your riding style">${Object.entries(styles).map(([id,s]) => `<button type="button" data-rs-style="${id}" aria-pressed="${id==='endurance'}">${s.label}</button>`).join('')}</div>
    <div class="rs-workspace">
      <div class="rs-visual">
        <div class="rs-scene-label"><span data-rs-terrain>${initial.terrain}</span><span>DESIGN CONCEPT</span></div>
        <svg class="rs-bike" viewBox="0 0 900 490" role="img" aria-labelledby="rs-bike-title rs-bike-desc">
          <title id="rs-bike-title">Endurance bicycle concept</title><desc id="rs-bike-desc">Side-view bicycle with a raised cockpit and road tyres. Choose a style to change the bike, or explore a geometry measurement below.</desc>
          <defs>
            <linearGradient id="rs-paint" x1="0" y1="0" x2=".7" y2="1"><stop class="rs-paint-light" offset="0" stop-color="#8dbfad"/><stop class="rs-paint-main" offset=".28" stop-color="#17634f"/><stop class="rs-paint-dark" offset=".65" stop-color="#083e31"/><stop class="rs-paint-main" offset="1" stop-color="#17634f"/></linearGradient>
            <linearGradient id="rs-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a1aeaa"/><stop offset=".3" stop-color="#303e39"/><stop offset=".7" stop-color="#15201c"/><stop offset="1" stop-color="#66766c"/></linearGradient>
            <radialGradient id="rs-shadow"><stop stop-color="#183d2e" stop-opacity=".2"/><stop offset="1" stop-color="#183d2e" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="449" cy="432" rx="347" ry="24" fill="url(#rs-shadow)"/>
          <path class="rs-ground" d="M54 424 H846"/>
          ${wheel('rear-wheel')}${wheel('front-wheel')}
          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            ${part('rear-stays','path','stroke="url(#rs-paint)"')}
            ${part('seatpost','path','stroke="url(#rs-metal)" stroke-width="9"')}
            ${part('frame-main','path','stroke="url(#rs-paint)"')}
            ${part('downtube','path','stroke="url(#rs-paint)"')}
            ${part('frame-highlight','path','stroke="#d6ede0" opacity=".48"')}
            ${part('downtube-light','path','stroke="#c9dfd0" opacity=".3"')}
            ${part('fork','path','stroke="url(#rs-paint)"')}
            ${part('stanchion','path','stroke="#c2a66d" stroke-width="9"')}
            ${part('fork-crown','path','stroke="#1b2923" stroke-width="10"')}
            ${part('stem','path','stroke="url(#rs-metal)" stroke-width="10"')}
            ${part('dropbar','path','stroke="#25352e" stroke-width="8"')}
            ${part('hood','path','stroke="#14251d" stroke-width="9"')}
            ${part('flatbar','path','stroke="url(#rs-metal)" stroke-width="7"')}
            ${part('grip','path','stroke="#14251d" stroke-width="10"')}
            ${part('chain','path','stroke="#859088" stroke-width="2.5"')}
            ${part('derailleur','path','stroke="#39463e" stroke-width="5"')}
            ${part('bottle-mounts','path','stroke="#c3cfc8" stroke-width="4"')}
          </g>
          <g data-rs-part="saddle"${attrs(initialParts.saddle)}><path d="M-21 8L3 13 19 7" fill="none" stroke="#7f8d83" stroke-width="3"/><path d="M-34 0Q-30 -8 -12 -6L33 -1Q40 3 32 6L-20 6Q-35 6 -34 0" fill="url(#rs-metal)"/><path d="M-26 -4L13 -1" stroke="#9ba69e" fill="none" stroke-width="1.5"/></g>
          <g data-rs-part="cassette"${attrs(initialParts.cassette)}><circle r="15" fill="#46504b" stroke="#bdc5bf" stroke-width="2" stroke-dasharray="2 2"/><circle r="9" fill="#263a2f" stroke="#939d96"/><circle r="3" fill="#d7ddd9"/></g>
          <g data-rs-part="crank"${attrs(initialParts.crank)}><circle r="28" fill="#2a3730" stroke="#a6b3a9" stroke-width="2.5" stroke-dasharray="2 2"/><circle r="21" fill="none" stroke="#85948a" stroke-width="2"/><path d="M0 -20V20M-19 -6L19 6M-12 16L12 -16" stroke="#687c6d" stroke-width="4"/><path d="M0 0L22 30" stroke="#18271e" stroke-width="9" stroke-linecap="round"/><path d="M14 31h24" stroke="#3f5046" stroke-width="6" stroke-linecap="round"/><circle r="6" fill="#b6c1b9"/><circle r="3" fill="#25382b"/></g>
          <text data-rs-part="brand"${attrs(initialParts.brand)} class="rs-frame-brand">CYCLIFY</text>
          <g class="rs-geo" aria-hidden="true">${Object.keys(metrics).map(id=>`<g data-rs-overlay="${id}" visibility="hidden">${part('geo-'+id,id==='clearance'?'circle':'path')}${part('geo-'+id+'-label','text',`class="rs-geo-label"` ).replace(`></text>`,`>${metrics[id].label}</text>`)}</g>`).join('')}</g>
        </svg>
        <div class="rs-visual-controls"><div class="rs-colours" role="group" aria-label="Concept frame colour">${colours.map((c,i)=>`<button type="button" data-rs-colour="${i}" aria-label="${c.name}" aria-pressed="${i===0}" title="${c.name}" style="--swatch:${c.value}"></button>`).join('')}<span data-rs-colour-name>Racing green</span></div><button type="button" class="rs-tour" data-rs-tour aria-pressed="false"><span aria-hidden="true">▷</span> Play styles</button></div>
      </div>
      <div class="rs-story" aria-live="polite" aria-atomic="true"><span class="rs-story-index" data-rs-style-name>01 / ENDURANCE</span><h3 data-rs-heading>${initial.title}</h3><p data-rs-description>${initial.description}</p><ul data-rs-features>${initial.features.map(f=>`<li>${f}</li>`).join('')}</ul><a class="rs-shop" data-rs-shop href="${initial.shop}">${initial.shopLabel}<span aria-hidden="true">↗</span></a></div>
    </div>
    <details class="rs-explain"><summary><span>Understand the geometry <small>See what each line means</small></span><b aria-hidden="true">+</b></summary><div class="rs-explain-body">
      <div class="rs-metrics" role="group" aria-label="Explore a geometry measurement">${Object.entries(metrics).map(([id,m])=>`<button type="button" data-rs-metric="${id}" aria-pressed="${id==='stack'}">${m.label}</button>`).join('')}</div>
      <div class="rs-lesson" aria-live="polite" aria-atomic="true"><h4 data-rs-lesson-title>${metrics.stack.title}</h4><p data-rs-lesson-text>${metrics.stack.text}</p><p class="rs-tip" data-rs-lesson-tip>${metrics.stack.tips.endurance}</p></div>
      <p class="rs-fit-note">An illustrated guide, not a custom frame or fit prescription. Shapes and colours are concepts, not stock options. Check the exact model’s size chart, setup and intended use before buying.</p>
      <details class="rs-sources"><summary>Research &amp; reading</summary><p>Geometry principles checked against manufacturer guides. Designs vary by model, size and riding discipline.</p><a href="https://www.canyon.com/en-no/blog-content/road-cycling-news/road-bike-geometry-explained/b19102022.html" target="_blank" rel="noopener noreferrer">Canyon: road geometry</a><a href="https://www.canyon.com/en-no/blog-content/gravel-bike-news/gravel-bike-geometry-explained/b24042025.html" target="_blank" rel="noopener noreferrer">Canyon: gravel geometry</a><a href="https://www.canyon.com/en-at/blog-content/mountain-bike-news/mountain-bike-geometry/b11012023.html" target="_blank" rel="noopener noreferrer">Canyon: MTB geometry</a><a href="https://www.trekbikes.com/us/en_US/road_buyers_guide/" target="_blank" rel="noopener noreferrer">Trek: road bike guide</a><a href="https://www.specialized.com/us/en/app/stumpjumper-evo-geometry" target="_blank" rel="noopener noreferrer">Specialized: geometry &amp; terrain</a></details>
    </div></details>
    <noscript><p class="rs-fit-note">Enable JavaScript to change the bike style and colour. You can still explore the geometry notes and shop the collections.</p></noscript>
  </div></section>`;
}
module.exports = { renderRideStudio };
