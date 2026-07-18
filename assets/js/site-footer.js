(function () {
  if (document.getElementById("cyclifyFooter")) return;

  const style = document.createElement("style");
  style.id = "cyclifyFooterStyles";
  style.textContent = `
    .cyclify-footer{position:relative;margin-top:34px;background:#1d1d1f;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;letter-spacing:0}
    .cyclify-footer::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#ff7a00 0 33%,#fff 33% 66%,#159447 66%)}
    .cyclify-footer *{box-sizing:border-box}
    .cyclify-footer__inner{width:min(1180px,100%);margin:0 auto;padding:38px 24px 28px;display:grid;grid-template-columns:minmax(290px,1.5fr) repeat(2,minmax(160px,.7fr));gap:44px}
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
      <nav aria-label="Information">
        <h2 class="cyclify-footer__heading">Information</h2>
        <div class="cyclify-footer__links">
          <a href="index.html">About Us</a>
          <a href="account.html">Contact Us</a>
          <a href="used-market.html#rules">Terms of Use</a>
          <a href="account.html">Privacy &amp; Account</a>
        </div>
      </nav>
      <nav aria-label="Our services">
        <h2 class="cyclify-footer__heading">Our Services</h2>
        <div class="cyclify-footer__links">
          <a href="https://wa.me/message/MLT2FFSAEYGIP1?text=Hi%20Cyclify,%20I%20want%20to%20track%20my%20order">Track Order</a>
          <a href="cart.html">Shipping</a>
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
