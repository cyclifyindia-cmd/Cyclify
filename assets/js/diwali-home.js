(function () {
  'use strict';
  function updateCampaign() {
    const campaign = window.CyclifyCampaign;
    if (!campaign) return;
    document.documentElement.classList.toggle('cyclify-diwali', campaign.isActive());
    document.querySelectorAll('[data-popular-product]').forEach(card => {
      const id = Number(card.dataset.popularProduct);
      // The resolver uses the saved regular price even after a static sale build.
      const result = campaign.resolveProduct({ id, price: 0 });
      if (!result || !Number(result.price)) return;
      const price = card.querySelector('.price');
      const mrp = Number((card.querySelector('.mrp')?.textContent || '').replace(/[^0-9.]/g, ''));
      if (price) price.textContent = '₹' + campaign.formatPrice(result.price);
      const saving = card.querySelector('.cyclify-card-saving');
      const discount = card.querySelector('.cyclify-card-discount');
      if (saving && mrp > result.price) saving.textContent = 'Save ₹' + campaign.formatPrice(Math.round((mrp - result.price) * 100) / 100);
      if (discount && mrp > result.price) discount.textContent = Math.round((mrp - result.price) / mrp * 100) + '% OFF';
    });
  }
  document.addEventListener('DOMContentLoaded', updateCampaign);
  if (document.readyState !== 'loading') updateCampaign();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCampaign(); });
  window.setInterval(updateCampaign, 60000);
})();
