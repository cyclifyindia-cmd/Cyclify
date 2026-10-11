(function () {
  if (Number(product.id) !== 63 || !document.body.classList.contains('sava-a7l-page')) return;
  const dots = document.getElementById('a7lGalleryDots');
  const lightbox = document.getElementById('a7lLightbox');
  const enlarged = lightbox.querySelector('img');
  const quantity = document.getElementById('a7lQuantity');
  const sizeLabels = { S: '47 cm (S)', M: '51 cm (M)', L: '54 cm (L)' };
  document.querySelectorAll('#sizeOptions .size-btn').forEach(button => {
    button.textContent = sizeLabels[button.dataset.size] || button.dataset.size;
    button.setAttribute('aria-label', `Select ${button.textContent} frame`);
  });
  productImages.forEach((src, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `View product image ${index + 1}`);
    dot.addEventListener('click', () => showImage(index));
    dots.append(dot);
  });
  const originalShowImage = showImage;
  showImage = function (index) {
    originalShowImage(index);
    dots.querySelectorAll('button').forEach((dot, at) => dot.setAttribute('aria-current', String(at === currentImageIndex)));
    enlarged.src = productImages[currentImageIndex];
    enlarged.alt = `${product.name} — image ${currentImageIndex + 1}`;
    document.querySelectorAll('#productThumbs .thumb').forEach((thumb, at) => thumb.setAttribute('aria-pressed', String(at === currentImageIndex)));
  };
  document.querySelectorAll('#productThumbs .thumb').forEach((thumb, index) => {
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.tabIndex = 0;
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('aria-label', `View product image ${index + 1}`);
    thumb.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showImage(index); }
    });
  });
  const updateSelection = () => {
    document.querySelectorAll('#sizeOptions .size-btn').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === selectedSize)));
    document.querySelectorAll('#valveOptions .size-btn').forEach(button => button.setAttribute('aria-pressed', String(button.textContent.trim() === selectedValveLength)));
    const stock = document.getElementById('a7lStock');
    stock.textContent = productAvailableForCart ? (product.preorder ? 'Available to pre-order' : 'In stock') : 'Currently out of stock';
    stock.classList.toggle('unavailable', !productAvailableForCart);
    quantity.disabled = !productAvailableForCart;
    document.querySelectorAll('[data-quantity-step]').forEach(button => button.disabled = !productAvailableForCart);
  };
  const originalSelectSize = selectSize;
  selectSize = function (size) { originalSelectSize(size); updateSelection(); };
  const originalSelectColour = selectValveLength;
  selectValveLength = function (colour) {
    originalSelectColour(colour);
    const match = product.imageByColour && product.imageByColour[colour];
    const index = match ? productImages.indexOf(match) : -1;
    if (index >= 0) showImage(index);
    updateSelection();
  };
  const normaliseQuantity = () => { quantity.value = String(Math.max(1, Math.min(10, Math.floor(Number(quantity.value) || 1)))); };
  quantity.addEventListener('change', normaliseQuantity);
  document.querySelectorAll('[data-quantity-step]').forEach(button => button.addEventListener('click', () => {
    quantity.value = Number(quantity.value) + Number(button.dataset.quantityStep); normaliseQuantity();
  }));
  document.querySelector('.a7l-zoom').addEventListener('click', event => { event.stopPropagation(); lightbox.showModal(); });
  document.getElementById('galleryMain').addEventListener('click', () => lightbox.showModal());
  lightbox.querySelector('.a7l-lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.querySelectorAll('[data-image-step]').forEach(button => button.addEventListener('click', () => changeImage(Number(button.dataset.imageStep))));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') changeImage(-1);
    if (event.key === 'ArrowRight') changeImage(1);
  });
  document.querySelectorAll('[data-highlight-step]').forEach(button => button.addEventListener('click', () => {
    const track = document.querySelector('.a7l-highlight-track');
    track.scrollBy({ left: Number(button.dataset.highlightStep) * (track.firstElementChild.getBoundingClientRect().width + 24), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  document.querySelectorAll('a[href$="#a7lGeometry"]').forEach(link => link.addEventListener('click', () => { document.querySelector('#a7lGeometry details').open = true; }));
  const geometryDialog = document.getElementById('a7lGeometryDialog');
  document.querySelector('.a7l-geometry-trigger').addEventListener('click', () => {
    if (!geometryDialog.open) {
      geometryDialog.showModal();
      document.body.classList.add('a7l-modal-open');
    }
  });
  geometryDialog.querySelector('.a7l-geometry-close').addEventListener('click', () => geometryDialog.close());
  geometryDialog.addEventListener('click', event => {
    const rect = geometryDialog.getBoundingClientRect();
    if (event.target === geometryDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) geometryDialog.close();
  });
  geometryDialog.addEventListener('close', () => document.body.classList.remove('a7l-modal-open'));
  const carbonTabs = Array.from(document.querySelectorAll('[data-carbon-tab]'));
  function selectCarbonTab(index) {
    carbonTabs.forEach((button, at) => {
      button.setAttribute('aria-selected', String(at === index));
      button.tabIndex = at === index ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = at !== index;
    });
  }
  carbonTabs.forEach((button,index) => {
    button.addEventListener('click', () => selectCarbonTab(index));
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); const next = (index+1)%carbonTabs.length; selectCarbonTab(next); carbonTabs[next].focus();
      }
    });
  });
  selectCarbonTab(0);
  showImage(currentImageIndex);
  selectValveLength(selectedValveLength);
  updateSelection();
})();
