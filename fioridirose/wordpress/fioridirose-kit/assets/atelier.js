/* Atelier op maat: live preview and price, AJAX add to cart with a normal form post as fallback. */
(function ($) {
	'use strict';

	function money(v) {
		var whole = Math.round(v * 100) % 100 === 0;
		return '€ ' + (whole ? String(Math.round(v)) : v.toFixed(2).replace('.', ','));
	}

	$(function () {
		$('.fdr-atelier').each(function () {
			var $w = $(this);
			var cfg = $w.data('config');
			var $f = $w.find('form');
			var $img = $w.find('.fdr-a-img');
			var lastMood = null;

			function state() {
				var s = +$f.find('[name=fdr_size]:checked').val() || 0;
				var m = +$f.find('[name=fdr_mood]:checked').val() || 0;
				var ex = $f.find('[name="fdr_extras[]"]:checked').map(function () { return this.value; }).get();
				var total = cfg.sizes[s].price;
				ex.forEach(function (k) { total += cfg.extras[k] || 0; });
				return { s: s, m: m, ex: ex, total: total };
			}

			function render() {
				var st = state();
				$w.find('.fdr-a-total').text(money(st.total));
				$w.find('.fdr-a-meta').text(cfg.sizes[st.s].name + (st.ex.indexOf('vase') > -1 ? ' · met vaas' : ''));
				$w.find('.fdr-a-name').text(cfg.moods[st.m].name);
				$f.find('label').each(function () {
					var input = this.querySelector('input[type=radio],input[type=checkbox]');
					if (input) { this.classList.toggle('is-on', input.checked); }
				});
				if (lastMood !== null && lastMood !== st.m && cfg.moods[st.m].img) {
					$img.addClass('is-out');
					setTimeout(function () {
						$img.removeAttr('srcset').removeAttr('sizes').attr('src', cfg.moods[st.m].img);
						if ($img[0].complete) { $img.removeClass('is-out'); } else { $img.one('load error', function () { $img.removeClass('is-out'); }); }
					}, 400);
				}
				lastMood = st.m;
			}

			$f.on('change', render);
			render();

			$f.on('submit', function (e) {
				if (typeof wc_add_to_cart_params === 'undefined') { return; }
				e.preventDefault();
				var $btn = $f.find('[type=submit]').addClass('loading').prop('disabled', true);
				// "add-to-cart" stays out of the AJAX call, otherwise WooCommerce adds the product twice.
				var data = $f.serializeArray().filter(function (d) { return d.name !== 'add-to-cart'; });
				$.post(wc_add_to_cart_params.wc_ajax_url.toString().replace('%%endpoint%%', 'add_to_cart'), $.param(data))
					.done(function (r) {
						if (!r || r.error) { $f.off('submit'); $f[0].submit(); return; }
						$(document.body).trigger('added_to_cart', [r.fragments, r.cart_hash, $btn]);
					})
					.fail(function () { $f.off('submit'); $f[0].submit(); })
					.always(function () { $btn.removeClass('loading').prop('disabled', false); });
			});
		});
	});
})(jQuery);
