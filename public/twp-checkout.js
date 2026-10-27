// Checkout page: order lines from localStorage (+ ?add=&packs= from the order box),
// live totals, and a POST to /api/order/. The server re-prices every line.
(function () {
  var C = window.TWP_CHECKOUT, KEY = 'twp-cart', LOADED = Date.now();
  var form = document.getElementById('twp-co-form');
  if (!form || !C) return;
  var linesEl = form.querySelector('[data-lines]'), grandEl = form.querySelector('[data-grand]');
  var errEl = form.querySelector('[data-err]'), btn = form.querySelector('[data-place]');
  var money = function (n) { return '$' + n.toFixed(2); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (x) {}
  var q = new URLSearchParams(location.search), add = q.get('add');
  if (add && C.catalog[add]) {
    var packs = Math.min(C.max, Math.max(1, parseInt(q.get('packs'), 10) || 1));
    var hit = cart.filter(function (l) { return l.slug === add; })[0];
    if (hit) hit.packs = packs; else cart.push({ slug: add, packs: packs });
    history.replaceState(null, '', '/checkout/');
  }
  cart = cart.filter(function (l) { return C.catalog[l.slug] && l.packs >= 1; });
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (x) {} };
  save();

  function render() {
    if (!cart.length) {
      linesEl.innerHTML = '<tr><td>Your order is empty. <a href="/products/">Choose papers</a></td></tr>';
      grandEl.textContent = money(0); btn.disabled = true; return;
    }
    var total = 0;
    linesEl.innerHTML = cart.map(function (l, i) {
      var name = C.catalog[l.slug], sum = l.packs * C.pack; total += sum;
      var opts = '';
      for (var n = 1; n <= C.max; n++) opts += '<option value="' + n + '"' + (n === l.packs ? ' selected' : '') + '>' + (n * C.qty).toLocaleString('en-US') + ' sheets</option>';
      return '<tr><td><a href="/products/' + esc(l.slug) + '/">' + esc(name) + '</a><br><select data-i="' + i + '" aria-label="Quantity for ' + esc(name) + '" style="margin-top:6px;max-width:190px">' + opts + '</select> ' +
        '<button type="button" data-rm="' + i + '" style="background:none;border:0;color:#b91c1c;cursor:pointer;font-size:13px">Remove</button></td><td class="r">' + money(sum) + '</td></tr>';
    }).join('');
    grandEl.textContent = money(total); btn.disabled = false;
  }
  linesEl.addEventListener('change', function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) { cart[+i].packs = +e.target.value; save(); render(); } });
  linesEl.addEventListener('click', function (e) { var i = e.target.getAttribute('data-rm'); if (i !== null) { cart.splice(+i, 1); save(); render(); } });
  form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });
  render();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.textContent = '';
    var bad = [].filter.call(form.querySelectorAll('[required]'), function (el) {
      var ok = el.value.trim() && (el.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      if (!ok) el.setAttribute('aria-invalid', 'true');
      return !ok;
    });
    if (bad.length) { errEl.textContent = 'Please fill in the highlighted fields.'; bad[0].focus(); return; }
    var file = form.artwork.files[0];
    if (file && file.size > 4 * 1024 * 1024) { errEl.textContent = 'The artwork file is over 4 MB. Email it to us after ordering instead.'; return; }
    var data = new FormData(form);
    data.append('items', JSON.stringify(cart));
    data.append('ts', String(LOADED));
    btn.disabled = true; btn.textContent = 'Placing order…';
    if (window.gtag) window.gtag('event', 'begin_checkout', { currency: 'USD', value: cart.reduce(function (s, l) { return s + l.packs * C.pack; }, 0) });
    fetch('/api/order/', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Server error' }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Could not place the order');
        if (window.gtag) window.gtag('event', 'purchase', { transaction_id: res.ref, currency: 'USD', value: res.total });
        try { localStorage.removeItem(KEY); } catch (x) {}
        location.href = '/order-confirmed/?ref=' + encodeURIComponent(res.ref) + '&pay=' + encodeURIComponent(res.payment);
      })
      .catch(function (err) {
        errEl.textContent = err.message + '. Please try again, or call (503) 461-4788.';
        btn.disabled = false; btn.textContent = 'Place order';
      });
  });
})();
