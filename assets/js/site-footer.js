(function () {
  if (document.getElementById("cyclifyFooter")) return;

  const style = document.createElement("style");
  style.id = "cyclifyFooterStyles";
  style.textContent = `
    .products{gap:12px!important;padding:12px!important;background:#f6f7f9!important}
    .card{container-type:inline-size}
    .card.cyclify-premium-card{display:grid!important;grid-template-rows:auto auto 1fr;min-width:0;overflow:hidden;border:1px solid #e7e9ee!important;border-radius:15px!important;background:#fff!important;box-shadow:0 4px 15px rgba(17,24,39,.07)!important;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease!important}
    .card.cyclify-premium-card:hover{transform:translateY(-3px)!important;border-color:#dddfe5!important;box-shadow:0 12px 28px rgba(17,24,39,.12)!important}
    .cyclify-card-title{min-width:0;min-height:48px;margin:0!important;padding:13px 13px 5px;color:#15171a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px!important;font-weight:750;line-height:1.28;letter-spacing:-.012em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .card.cyclify-premium-card>.cyclify-card-product-image{display:block;width:100%!important;height:180px!important;margin:0;object-fit:contain!important;object-position:center!important;padding:6px 13px 7px!important;border:0!important;background:#fff!important;filter:none!important;image-rendering:auto}
    .card.cyclify-premium-card>.details{display:flex;min-width:0;flex-direction:column;padding:0 12px 12px!important}
    .cyclify-card-pricing{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"title" "price" "sub" "actions";gap:8px;margin-top:auto;padding:0;border:0;border-radius:0;background:#fff;box-shadow:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
    .cyclify-card-deal-title{grid-area:title;display:flex;min-width:0;align-items:center;gap:7px;height:25px;line-height:1;text-transform:uppercase}
    .cyclify-card-deal-logo{display:block!important;width:84px!important;height:25px!important;max-width:55%;padding:0!important;object-fit:contain!important;object-position:left center!important;background:transparent!important;flex:0 0 auto}
    .cyclify-card-deal-word{font-size:14px;font-style:italic;font-weight:950;line-height:1;letter-spacing:.045em;color:#b47b12;background:linear-gradient(105deg,#7d4b00 0%,#d99a16 24%,#fff2a8 43%,#f5c84b 52%,#9b6100 70%,#ffd86a 83%,#7d4b00 100%);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 1px 1px rgba(157,101,0,.14));animation:cyclifyDealGlaze 2.8s linear infinite}
    @keyframes cyclifyDealGlaze{0%,24%{background-position:100% 0}70%,100%{background-position:-110% 0}}
    .cyclify-card-price-line,.cyclify-card-sub-line{display:flex;align-items:center;justify-content:space-between;min-width:0;gap:8px;white-space:nowrap}.cyclify-card-price-line{grid-area:price}.cyclify-card-sub-line{grid-area:sub;min-height:18px}
    .card .price{margin:0!important;font-size:23px!important;font-weight:760!important;letter-spacing:-.035em;line-height:1.05;color:#111318}
    .card .mrp{display:inline-block;min-width:0;margin:0!important;overflow:hidden;color:#70747b!important;font-size:12px!important;font-weight:600;line-height:1.2;text-decoration:none!important;text-overflow:ellipsis;background:linear-gradient(to bottom,transparent 47%,rgba(158,91,25,.72) 48%,rgba(158,91,25,.72) 54%,transparent 55%)}
    .cyclify-card-saving{display:inline-flex;align-items:center;color:#087a3d;padding:0;font-size:12px;font-weight:800;line-height:1}
    .cyclify-card-discount{display:inline-flex;align-items:center;border-radius:6px;background:#ff5a00;color:#fff;padding:5px 7px;font-size:11px;font-weight:900;line-height:1;box-shadow:0 2px 5px rgba(255,90,0,.2)}
    .cyclify-card-actions{grid-area:actions;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:1px}
    .cyclify-card-shipping{display:inline-flex;align-items:center;justify-self:start;gap:5px;color:#087a3d;font-size:12px;font-weight:850;line-height:1}
    .cyclify-card-shipping.unavailable{color:#b42318}
    .cyclify-card-pricing .bottom{display:grid!important;grid-template-columns:minmax(0,1fr) 39px;align-items:center!important;gap:7px!important;width:100%;margin:0!important}
    .cyclify-card-pricing .add{min-height:39px!important;padding:9px 12px!important;border:1px solid #161b22!important;border-radius:8px!important;background:linear-gradient(180deg,#20262e,#10151b)!important;color:#fff!important;font-size:12px!important;font-weight:850!important;letter-spacing:.015em;line-height:1!important;white-space:nowrap;box-shadow:0 4px 10px rgba(16,21,27,.18)}
    .cyclify-card-pricing .add:hover{background:linear-gradient(180deg,#303842,#161b22)!important;transform:translateY(-1px)!important}
    .cyclify-card-cart-add{display:grid;place-items:center;width:39px;height:39px;padding:0;border:1px solid #bfc5ce;border-radius:8px;background:#fff;color:#151a21;cursor:pointer;box-shadow:0 3px 8px rgba(16,24,40,.08)}
    .cyclify-card-cart-add svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .cyclify-card-cart-add.added{border-color:#087443;background:#ecfdf3;color:#087443}
    .cyclify-card-pricing .add:disabled{border-color:#d0d5dd!important;background:#eef0f3!important;color:#667085!important;box-shadow:none!important;cursor:not-allowed}
    .price-line .deal-save,.price-line .deal-off,.price-line .shipping-note{font-size:11.5px!important}.price-line .deal-save{padding:4px 9px!important}.price-line .deal-off{padding:5px 8px!important}.price-line .shipping-note{font-weight:800!important}
    @container (max-width:220px){.cyclify-card-title{min-height:42px;padding:11px 9px 4px;font-size:12px!important}.card.cyclify-premium-card>.cyclify-card-product-image{height:140px!important;padding:4px 9px 6px!important}.card.cyclify-premium-card>.details{padding:0 9px 10px!important}.cyclify-card-pricing{gap:6px}.cyclify-card-deal-title{height:21px;gap:5px}.cyclify-card-deal-logo{width:69px!important;height:21px!important}.cyclify-card-deal-word{font-size:11.5px}.cyclify-card-price-line,.cyclify-card-sub-line{gap:5px}.card .price{font-size:18px!important}.card .mrp{font-size:9.5px!important}.cyclify-card-saving{font-size:9.5px}.cyclify-card-discount{font-size:9px;padding:4px 5px}.cyclify-card-actions{gap:6px}.cyclify-card-shipping{font-size:10px}.cyclify-card-pricing .bottom{grid-template-columns:minmax(0,1fr) 34px;gap:5px!important}.cyclify-card-pricing .add{min-height:34px!important;padding:7px 8px!important;font-size:10px!important}.cyclify-card-cart-add{width:34px;height:34px}.cyclify-card-cart-add svg{width:17px;height:17px}}
    @media(min-width:760px){.products{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important;padding:16px!important}.card.cyclify-premium-card>.cyclify-card-product-image{height:205px!important}}
    @media(min-width:1120px){.products{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important;padding:18px!important}.card.cyclify-premium-card>.cyclify-card-product-image{height:220px!important}}
    @media(prefers-reduced-motion:reduce){.cyclify-card-deal-word{animation:none;background-position:50% 0}.card.cyclify-premium-card{transition:none!important}}
    @media(max-width:480px){.price-line .deal-save,.price-line .deal-off,.price-line .shipping-note{font-size:10px!important}}
    .cyclify-footer{position:relative;margin-top:34px;background:#1d1d1f;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;letter-spacing:0}
    .cyclify-footer::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#ff7a00 0 33%,#fff 33% 66%,#159447 66%)}
    .cyclify-footer *{box-sizing:border-box}
    .cyclify-footer__inner{width:min(1180px,100%);margin:0 auto;padding:38px 24px 28px;display:grid;grid-template-columns:minmax(270px,1.35fr) repeat(3,minmax(145px,.7fr));gap:34px}
    .cyclify-footer__brand img{display:block;width:min(260px,82%);height:70px;object-fit:contain;object-position:left center}
    .cyclify-footer__brand-copy{max-width:430px;margin:16px 0 0;color:#e5e7eb;font-size:16px;line-height:1.55}
    .cyclify-footer__vision{max-width:430px;margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.14)}
    .cyclify-footer__vision strong{display:block;margin-bottom:6px;color:#ff7a2f;font-size:17px}
    .cyclify-footer__vision span{color:#fff;font-size:16px;line-height:1.45}
    .cyclify-contact-details{margin-top:22px;padding:22px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#171717}
    .cyclify-contact-details h2{margin:0 0 14px;font-size:21px;letter-spacing:0}
    .cyclify-contact-details address{font-style:normal;font-size:15px;line-height:1.65;color:#404040}
    .cyclify-contact-details address strong,.cyclify-contact-details address span{display:block}
    .cyclify-contact-details address strong{margin-bottom:3px;color:#111}
    .cyclify-footer__heading{margin:7px 0 18px;color:#ff6b2c;font-size:19px;line-height:1.2}
    .cyclify-footer__links{display:grid;gap:13px}
    .cyclify-footer__links a{width:max-content;max-width:100%;color:#f3f4f6;font-size:15px;line-height:1.35;text-decoration:none;transition:color .2s ease,transform .2s ease}
    .cyclify-footer__links a:hover,.cyclify-footer__links a:focus-visible{color:#ff8a45;transform:translateX(3px);outline:none}
    .cyclify-footer__bottom{border-top:1px solid rgba(255,255,255,.12)}
    .cyclify-footer__bottom-inner{width:min(1180px,100%);margin:0 auto;padding:17px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px;color:#bfc3ca;font-size:13px;line-height:1.4}
    @media(max-width:760px){.cyclify-footer{margin-top:24px}.cyclify-footer__inner{grid-template-columns:1fr 1fr;gap:30px 24px;padding:32px 20px 24px}.cyclify-footer__brand{grid-column:1/-1}.cyclify-footer__brand img{height:58px;width:min(230px,80%)}.cyclify-footer__brand-copy{margin-top:12px;font-size:14px}.cyclify-footer__vision{margin-top:17px;padding-top:15px}.cyclify-footer__bottom-inner{padding:15px 20px;align-items:flex-start;flex-direction:column;gap:4px}}
    @media(max-width:420px){.cyclify-footer__inner{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px 16px;padding-left:16px;padding-right:16px}.cyclify-footer__brand{grid-column:1/-1}.cyclify-footer__heading{margin-bottom:12px;font-size:16px}.cyclify-footer__links{gap:10px}.cyclify-footer__links a{width:auto;font-size:13px}.cyclify-footer__bottom-inner{padding-left:16px;padding-right:16px}}
  `;
  document.head.appendChild(style);

  function moneyNumber(value) {
    return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
  }

  function enhanceProductCard(card) {
    if (card.dataset.cyclifyDealReady === "true") return;
    const priceElement = card.querySelector(".price");
    const mrpElement = card.querySelector(".mrp");
    if (!priceElement || !mrpElement) return;
    const imageElement = card.querySelector(":scope > img");
    const detailsElement = card.querySelector(":scope > .details");
    const titleElement = detailsElement?.querySelector("h3");
    const price = Math.round(moneyNumber(priceElement.textContent));
    const mrp = Math.round(moneyNumber(mrpElement.textContent));
    if (!price) return;
    card.dataset.cyclifyDealReady = "true";
    card.classList.add("cyclify-premium-card");
    if (imageElement) imageElement.classList.add("cyclify-card-product-image");
    if (titleElement && imageElement) {
      titleElement.classList.add("cyclify-card-title");
      card.insertBefore(titleElement, imageElement);
    }
    priceElement.textContent = `\u20B9${price.toLocaleString("en-IN")}`;
    mrpElement.textContent = mrp ? `MRP \u20B9${mrp.toLocaleString("en-IN")}` : "";
    mrpElement.hidden = !mrp;
    const saving = mrp > price ? mrp - price : 0;
    const discount = saving ? Math.round((saving / mrp) * 100) : 0;
    const pricing = document.createElement("div");
    pricing.className = "cyclify-card-pricing";
    const dealTitle = document.createElement("div");
    dealTitle.className = "cyclify-card-deal-title";
    dealTitle.setAttribute("aria-label", "Cyclify Deal");
    dealTitle.innerHTML = '<img class="cyclify-card-deal-logo" src="/assets/Logo-dark.png" alt="Cyclify"><span class="cyclify-card-deal-word" aria-hidden="true">DEAL</span>';
    const priceLine = document.createElement("div");
    priceLine.className = "cyclify-card-price-line";
    const subLine = document.createElement("div");
    subLine.className = "cyclify-card-sub-line";
    priceElement.insertAdjacentElement("beforebegin", pricing);
    pricing.append(dealTitle, priceLine, subLine);
    priceLine.appendChild(priceElement);
    if (saving) {
      const savingElement = document.createElement("span");
      savingElement.className = "cyclify-card-saving";
      savingElement.textContent = `Save \u20B9${saving.toLocaleString("en-IN")}`;
      subLine.appendChild(savingElement);
    }
    if (discount) {
      const discountElement = document.createElement("span");
      discountElement.className = "cyclify-card-discount";
      discountElement.textContent = `${discount}% OFF`;
      priceLine.appendChild(discountElement);
    }
    const originalShippingElements = [...card.querySelectorAll(".ship")];
    const outOfStock = originalShippingElements.some(element => /out\s*of\s*stock/i.test(element.textContent || ""));
    originalShippingElements.forEach(element => element.remove());
    const shippingElement = document.createElement("span");
    shippingElement.className = `cyclify-card-shipping${outOfStock ? " unavailable" : ""}`;
    shippingElement.innerHTML = outOfStock
      ? '<span aria-hidden="true">&#9679;</span><span>Out of Stock</span>'
      : '<span aria-hidden="true">&#10003;</span><span>Free Shipping</span>';
    const actions = document.createElement("div");
    actions.className = "cyclify-card-actions";
    pricing.appendChild(actions);
    actions.appendChild(shippingElement);
    subLine.insertAdjacentElement("afterbegin", mrpElement);
    const bottom = card.querySelector(".bottom");
    if (bottom) {
      const buyButton = bottom.querySelector(".add");
      if (buyButton) {
        const clickCode = buyButton.getAttribute("onclick") || "";
        const idMatch = clickCode.match(/addToCart\(event,\s*([0-9]+)\s*\)/);
        buyButton.textContent = outOfStock ? "Out of Stock" : "Buy Now";
        if (outOfStock) {
          buyButton.removeAttribute("onclick");
          buyButton.disabled = true;
          buyButton.setAttribute("aria-disabled", "true");
        } else if (idMatch) {
          const productId = Number(idMatch[1]);
          buyButton.removeAttribute("onclick");
          buyButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.addToCart !== "function") return;
            window.cyclifyCartAction = "buy";
            sessionStorage.removeItem("cyclifyCheckoutItems");
            window.addToCart(event, productId);
            if (window.cyclifyCartAction !== "buy") {
              try {
                const cart = JSON.parse(localStorage.getItem("cart") || "[]");
                const selected = cart.find(item => String(item.id) === String(productId));
                if (selected) sessionStorage.setItem("cyclifyCheckoutItems", JSON.stringify([{ ...selected, quantity: 1 }]));
              } catch (error) {
                console.warn("Cyclify Buy Now item preparation failed", error);
              }
            }
          });
          const quickAddButton = document.createElement("button");
          quickAddButton.type = "button";
          quickAddButton.className = "cyclify-card-cart-add";
          quickAddButton.setAttribute("aria-label", "Add to cart");
          quickAddButton.title = "Add to cart";
          quickAddButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5h2.3l1.6 9.1a2 2 0 0 0 2 1.7h7.2a2 2 0 0 0 2-1.6L20 8H6.3"/><path d="M10 20h.01M17 20h.01M16.5 3.5v5M14 6h5"/></svg>';
          quickAddButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.addToCart !== "function") return;
            window.cyclifyCartAction = "add";
            window.addToCart(event, productId);
            quickAddButton.classList.add("added");
            quickAddButton.setAttribute("aria-label", "Added to cart");
            window.setTimeout(() => {
              quickAddButton.classList.remove("added");
              quickAddButton.setAttribute("aria-label", "Add to cart");
            }, 1200);
          });
          bottom.appendChild(quickAddButton);
        }
      }
      actions.appendChild(bottom);
    }
  }

  function enhanceProductCards(root) {
    if (root.matches?.(".card")) enhanceProductCard(root);
    root.querySelectorAll?.(".card").forEach(enhanceProductCard);
  }

  enhanceProductCards(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) enhanceProductCards(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  const footer = document.createElement("footer");
  footer.id = "cyclifyFooter";
  footer.className = "cyclify-footer";
  footer.innerHTML = `
    <div class="cyclify-footer__inner">
      <section class="cyclify-footer__brand" aria-label="About Cyclify">
        <a href="index.html" aria-label="Cyclify home"><img src="assets/logo-footer.webp" alt="Cyclify" width="700" height="205" loading="lazy" decoding="async"></a>
        <p class="cyclify-footer__brand-copy">Cyclify is located in Tuticorin, India.</p>
        <div class="cyclify-footer__vision"><strong>Vision</strong><span>Premium rides, honest prices.</span></div>
      </section>
      <nav aria-label="Popular cycling categories">
        <h2 class="cyclify-footer__heading">Popular Categories</h2>
        <div class="cyclify-footer__links">
          <a href="smart-trainers.html">Smart Trainers</a>
          <a href="bike-computers.html">Bike Computers</a>
          <a href="bike-lights.html">Bike Lights</a>
          <a href="carbon-wheelsets.html">Carbon Wheelsets</a>
          <a href="cycling-helmets.html">Cycling Helmets</a>
          <a href="bike-drivetrain.html">Drivetrain Components</a>
        </div>
      </nav>
      <nav aria-label="Information">
        <h2 class="cyclify-footer__heading">Information</h2>
        <div class="cyclify-footer__links">
          <a href="about-us.html">About Us</a>
          <a href="guides.html">Cycling Guides</a>
          <a href="contact-us.html">Contact Us</a>
          <a href="terms-and-conditions.html">Terms &amp; Conditions</a>
          <a href="exchange-policy.html">Exchange Policy</a>
          <a href="privacy-policy.html">Privacy Policy</a>
        </div>
      </nav>
      <nav aria-label="Our services">
        <h2 class="cyclify-footer__heading">Our Services</h2>
        <div class="cyclify-footer__links">
          <a href="https://wa.me/message/MLT2FFSAEYGIP1?text=Hi%20Cyclify,%20I%20want%20to%20track%20my%20order">Track Order</a>
          <a href="shipping-policy.html">Shipping Policy</a>
          <a href="used-market.html">Used Market</a>
        </div>
      </nav>
    </div>
    <div class="cyclify-footer__bottom">
      <div class="cyclify-footer__bottom-inner"><span>&copy; ${new Date().getFullYear()} Cyclify India. All rights reserved.</span><span>GSTIN: 33JOJPD5578G1ZN</span><span>Tuticorin, Tamil Nadu, India</span></div>
    </div>
  `;
  document.body.appendChild(footer);
})();
