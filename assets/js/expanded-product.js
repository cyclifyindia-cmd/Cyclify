(() => {
  if (product.inventoryGroup !== 'expanded' || !product.purchaseVariants?.length) return;
  const variants = product.purchaseVariants;
  const requested = new URLSearchParams(location.search).get('variant');
  let chosen = variants.find(variant => variant.key === requested) || variants.find(variant => variant.key === product.defaultVariantKey) || variants[0];
  let state = { build: chosen.build, size: chosen.size, colour: chosen.colour };
  const unique = values => [...new Set(values.filter(Boolean))];
  const label = variant => variant.stockStatus === 'coming-soon' ? 'Coming Soon' : (variant.available ? 'In stock' : 'Contact for More Info');
  const baseUpdate = updateCartButtonForSize;

  updateCartButtonForSize = function () {
    product.available = Boolean(chosen?.available);
    baseUpdate();
    const status = label(chosen);
    const stock = document.getElementById('expandedStock');
    if (stock) { stock.textContent = status; stock.dataset.status = chosen.stockStatus; }
    document.querySelectorAll('#productButtons button').forEach(button => {
      button.hidden = false;
      button.disabled = !chosen.available;
      button.textContent = chosen.available ? (button.classList.contains('buybtn') ? 'Buy Now' : 'Add to Cart') : status;
    });
    if (!chosen.available) document.querySelector('.shipping-note').textContent = status;
  };

  function optionStatus(pool, field, value) {
    const matches = pool.filter(variant => variant[field] === value);
    return matches.some(variant => variant.available) ? 'available' : (matches.every(variant => variant.stockStatus === 'coming-soon') ? 'coming-soon' : 'contact');
  }

  function renderControl(sectionId, containerId, field, pool, callback) {
    const section = document.getElementById(sectionId);
    const container = document.getElementById(containerId);
    const values = unique(pool.map(variant => variant[field]));
    if (!section || !container) return;
    section.style.display = values.length && (field !== 'build' || values.length > 1) ? 'block' : 'none';
    container.replaceChildren();
    container.classList.remove('dropdown-mode');
    if (values.length > 6 || values.some(value => value.length > 24) || field === 'build') {
      const select = document.createElement('select');
      select.className = 'option-select';
      select.setAttribute('aria-label', field === 'build' ? 'Select build' : (field === 'size' ? 'Select size' : 'Select colour'));
      values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value + (optionStatus(pool, field, value) === 'coming-soon' ? ' · Coming Soon' : '');
        option.selected = value === state[field];
        select.append(option);
      });
      select.addEventListener('change', () => callback(select.value));
      container.classList.add('dropdown-mode');
      container.append(select);
    } else {
      values.forEach(value => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'size-btn' + (value === state[field] ? ' active' : '');
        button.textContent = value;
        button.dataset.status = optionStatus(pool, field, value);
        button.setAttribute('aria-pressed', String(value === state[field]));
        button.addEventListener('click', () => callback(value));
        container.append(button);
      });
    }
  }

  function pick(pool) {
    return pool.find(variant => variant.available) || pool[0];
  }

  function render() {
    chosen = variants.find(variant => variant.build === state.build && variant.size === state.size && variant.colour === state.colour);
    if (!chosen) return;
    product.selectedVariantKey = chosen.key;
    product.selectedConfiguration = chosen.build;
    product.price = chosen.price;
    product.mrp = chosen.mrp;
    product.image = chosen.image || product.image;
    product.sizeAvailability = {};
    selectedSize = chosen.size;
    selectedValveLength = chosen.colour;
    renderControl('expandedBuildSection', 'expandedBuildOptions', 'build', variants, value => {
      const pool = variants.filter(variant => variant.build === value);
      const next = pool.find(variant => variant.available && variant.size === state.size && variant.colour === state.colour) || pick(pool);
      state = { build: next.build, size: next.size, colour: next.colour };
      render();
    });
    const buildPool = variants.filter(variant => variant.build === state.build);
    renderControl('sizeSection', 'sizeOptions', 'size', buildPool, value => {
      const pool = buildPool.filter(variant => variant.size === value);
      const next = pool.find(variant => variant.colour === state.colour) || pick(pool);
      state.size = next.size; state.colour = next.colour;
      render();
    });
    const sizePool = buildPool.filter(variant => variant.size === state.size);
    renderControl('valveSection', 'valveOptions', 'colour', sizePool, value => { state.colour = value; render(); });
    updateProductPriceDisplay();
    updateCartButtonForSize();
    const at = productImages.indexOf(chosen.image);
    if (at >= 0) showImage(at);
    document.getElementById('productImage').alt = [product.name, chosen.colour, chosen.build].filter(Boolean).join(' — ');
    if (chosen.specSet && product.specSets?.[chosen.specSet]) renderSpecs(product.specSets[chosen.specSet]);
  }

  function renderSpecs(specs) {
    const container = document.getElementById('specList');
    container.replaceChildren();
    const list = document.createElement('dl');
    list.className = 'spec-table';
    specs.forEach(spec => {
      const parsed = parseProductSpec(spec);
      const row = document.createElement('div'); row.className = 'spec-row';
      const term = document.createElement('dt'); term.textContent = parsed.label;
      const detail = document.createElement('dd'); detail.textContent = parsed.value;
      row.append(term, detail); list.append(row);
    });
    container.append(list);
    const highlights=document.getElementById('specHighlights');
    const features=document.getElementById('productFeaturesList');
    highlights.replaceChildren();features.replaceChildren();
    specs.filter(spec=>/^(?:frame|fork|material|weight|rim|brake|groupset|wheelset|lens|uv|capacity|rail|bearing)/i.test(spec)).slice(0,5).forEach((spec,index)=>{
      const item=document.createElement('li');item.textContent=spec;features.append(item);
      if(index<4){const parsed=parseProductSpec(spec);const block=document.createElement('div');block.className='spec-highlight';const label=document.createElement('span');label.className='spec-highlight-label';label.textContent=parsed.label;const value=document.createElement('span');value.className='spec-highlight-value';value.textContent=parsed.value;block.append(label,value);highlights.append(block);}
    });
    document.getElementById('productFeaturesBlock').hidden=!features.children.length;
  }

  document.querySelectorAll('[data-expanded-step]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById('a7lQuantity');
    input.value = Math.max(1, Math.min(10, (Number(input.value) || 1) + Number(button.dataset.expandedStep)));
  }));
  const dialog = document.getElementById('expandedSizeGuide');
  if (dialog) {
    document.getElementById('expandedSizeGuideOpen')?.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('[data-expanded-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  render();
})();
