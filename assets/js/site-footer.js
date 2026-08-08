(function () {
  if (document.getElementById("cyclifyFooter")) return;

  const style = document.createElement("style");
  style.id = "cyclifyFooterStyles";
  style.textContent = `
    .card{container-type:inline-size}
    .card .details h3{font-size:15px;line-height:1.3;margin-bottom:8px}
    .cyclify-card-pricing{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"title title" "price actions" "sub actions";column-gap:14px;row-gap:7px;margin-top:4px;padding:11px 12px 12px;border:1px solid #f0dfd2;border-radius:12px;background:linear-gradient(135deg,#fff 0%,#fffaf5 100%);box-shadow:0 5px 16px rgba(42,30,18,.055);font-family:Arial,Helvetica,sans-serif}
    .cyclify-card-deal-title{grid-area:title;display:flex;align-items:center;gap:5px;font-size:10.5px;font-style:italic;font-weight:900;line-height:1;letter-spacing:.05em;text-transform:uppercase}
    .cyclify-card-deal-brand{color:#ef5b12}
    .cyclify-card-deal-word{color:#b47b12;background:linear-gradient(105deg,#8b5a05 0%,#e7b63b 35%,#fff1a4 48%,#c8870b 61%,#8b5a05 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:cyclifyDealGlaze 2.8s ease-in-out infinite}
    @keyframes cyclifyDealGlaze{0%,24%{background-position:100% 0}70%,100%{background-position:-110% 0}}
    .cyclify-card-price-line,.cyclify-card-sub-line{display:flex;align-items:center;min-width:0;gap:7px;white-space:nowrap}.cyclify-card-price-line{grid-area:price}.cyclify-card-sub-line{grid-area:sub}
    .card .price{margin:0!important;font-size:20px!important;font-weight:750!important;letter-spacing:-.025em;line-height:1.05;color:#141414}
    .card .mrp{display:inline-block;margin:0!important;color:#727272!important;font-size:11.5px!important;font-weight:650;line-height:1.2;text-decoration:none!important;background:linear-gradient(to bottom,transparent 47%,rgba(201,113,26,.8) 48%,rgba(201,113,26,.8) 55%,transparent 56%)}
    .cyclify-card-saving{display:inline-flex;align-items:center;border-radius:999px;background:#e9f8ee;color:#087a3d;padding:4px 8px;font-size:11.5px;font-weight:850;line-height:1}
    .cyclify-card-discount{display:inline-flex;align-items:center;border-radius:5px;background:#ff5a00;color:#fff;padding:4px 7px;font-size:10.5px;font-weight:900;line-height:1;box-shadow:0 2px 5px rgba(255,90,0,.18)}
    .cyclify-card-actions{grid-area:actions;align-self:end;display:grid;justify-items:end;gap:7px}
    .cyclify-card-shipping{display:inline-flex;align-items:center;gap:3px;color:#087a3d;font-size:11.5px;font-weight:850;line-height:1}
    .cyclify-card-shipping.unavailable{color:#b42318}
    .cyclify-card-pricing .bottom{display:flex!important;align-items:center!important;gap:5px!important;margin:0!important}
    .cyclify-card-pricing .add{min-height:32px!important;padding:7px 13px!important;border:1px solid #0754c9!important;border-radius:8px!important;background:linear-gradient(180deg,#1264dc,#0754c9)!important;color:#fff!important;font-size:11px!important;font-weight:850!important;line-height:1!important;white-space:nowrap;box-shadow:0 4px 9px rgba(7,84,201,.2)}
    .cyclify-card-cart-add{display:grid;place-items:center;width:32px;height:32px;padding:0;border:1px solid #ccd6e5;border-radius:8px;background:#fff;color:#0754c9;cursor:pointer;box-shadow:0 3px 8px rgba(16,24,40,.09)}
    .cyclify-card-cart-add svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .cyclify-card-cart-add.added{border-color:#087443;background:#ecfdf3;color:#087443}
    .cyclify-card-pricing .add:disabled{border-color:#d0d5dd!important;background:#eef0f3!important;color:#667085!important;box-shadow:none!important;cursor:not-allowed}
    .price-line .deal-save,.price-line .deal-off,.price-line .shipping-note{font-size:11.5px!important}.price-line .deal-save{padding:4px 9px!important}.price-line .deal-off{padding:5px 8px!important}.price-line .shipping-note{font-weight:800!important}
    @container (max-width:360px){.card .details h3{font-size:12.5px}.cyclify-card-pricing{grid-template-columns:minmax(0,1fr);grid-template-areas:"title" "price" "sub" "actions";gap:6px;padding:9px}.cyclify-card-deal-title{font-size:9px}.cyclify-card-price-line,.cyclify-card-sub-line{gap:4px}.card .price{font-size:16px!important}.card .mrp{font-size:9.5px!important}.cyclify-card-saving{font-size:9px;padding:3px 5px}.cyclify-card-discount{font-size:8.5px;padding:3px 5px}.cyclify-card-actions{width:100%;grid-template-columns:1fr auto;align-items:center;gap:5px}.cyclify-card-actions .bottom{grid-column:2;grid-row:1}.cyclify-card-shipping{grid-column:1;grid-row:1;justify-self:start;font-size:9.5px}.cyclify-card-pricing .add{min-height:29px!important;padding:6px 9px!important;font-size:9px!important}.cyclify-card-cart-add{width:29px;height:29px}.cyclify-card-cart-add svg{width:15px;height:15px}}
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
    const price = Math.round(moneyNumber(priceElement.textContent));
    const mrp = Math.round(moneyNumber(mrpElement.textContent));
    if (!price) return;
    card.dataset.cyclifyDealReady = "true";
    priceElement.textContent = `\u20B9${price.toLocaleString("en-IN")}`;
    mrpElement.textContent = mrp ? `MRP \u20B9${mrp.toLocaleString("en-IN")}` : "";
    mrpElement.hidden = !mrp;
    const saving = mrp > price ? mrp - price : 0;
    const discount = saving ? Math.round((saving / mrp) * 100) : 0;
    const pricing = document.createElement("div");
    pricing.className = "cyclify-card-pricing";
    const dealTitle = document.createElement("div");
    dealTitle.className = "cyclify-card-deal-title";
    dealTitle.innerHTML = '<span class="cyclify-card-deal-brand">Cyclify</span><span class="cyclify-card-deal-word">Deal</span>';
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
      actions.insertAdjacentElement("afterbegin", bottom);
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
        <a href="index.html" aria-label="Cyclify home"><img src="assets/Logo.png" alt="Cyclify"></a>
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
