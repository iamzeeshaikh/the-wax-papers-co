// Order box on product pages: quantity in runs of 1,000, live total, "Add to order" -> /checkout/.
(function () {
  var KEY = 'twp-cart';
  document.querySelectorAll('[data-twp-order]').forEach(function (f) {
    var sel = f.querySelector('select'), out = f.querySelector('[data-total]');
    var pack = Number(f.dataset.pack);
    sel.addEventListener('change', function () { out.textContent = '$' + (Number(sel.value) * pack).toFixed(2); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var cart = [];
      try { cart = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (x) {}
      var slug = f.dataset.slug, packs = Number(sel.value), line = cart.filter(function (l) { return l.slug === slug; })[0];
      if (line) line.packs = packs; else cart.push({ slug: slug, packs: packs });
      try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (x) {}
      if (window.gtag) window.gtag('event', 'add_to_cart', { currency: 'USD', value: packs * pack, items: [{ item_id: slug, quantity: packs }] });
      location.href = '/checkout/?add=' + encodeURIComponent(slug) + '&packs=' + packs;
    });
  });
})();
