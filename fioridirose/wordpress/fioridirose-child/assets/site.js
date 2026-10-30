/* Fiori di Rose: header, mobile menu, cart drawer, product filters, reveal and toast. */
(function ($) {
	'use strict';

	var d = document;
	var b = d.body;
	var header = d.getElementById('fdr-header');
	var drawer = d.getElementById('fdr-drawer');
	var mnav = d.getElementById('fdr-mnav');

	/* Header: transparent over the homepage hero, solid elsewhere and after scrolling. */
	function onScroll() {
		if (header) {
			header.classList.toggle('is-solid', !b.classList.contains('fdr-overlay-header') || window.scrollY > 40);
		}
	}
	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	/* Mobile menu. */
	function setMenu(open) {
		if (!mnav) { return; }
		mnav.classList.toggle('is-open', open);
		mnav.setAttribute('aria-hidden', open ? 'false' : 'true');
		$('[data-fdr-mnav]').attr('aria-expanded', open ? 'true' : 'false');
	}
	$(d).on('click', '[data-fdr-mnav]', function () { setMenu(true); });
	$(d).on('click', '[data-fdr-mnav-close], .fdr-mnav a', function () { setMenu(false); });

	/* Cart drawer. */
	function setCart(open) {
		if (!drawer) { return; }
		b.classList.toggle('fdr-cart-open', open);
		drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
	}
	$(d).on('click', '[data-fdr-cart]', function (e) { e.preventDefault(); setCart(true); });
	$(d).on('click', '[data-fdr-close]', function () { setCart(false); });
	$(b).on('added_to_cart', function () { setCart(true); });
	d.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') { setCart(false); setMenu(false); }
	});

	/* Toast. */
	var toastTimer;
	window.fdrToast = function (msg) {
		var t = d.getElementById('fdr-toast');
		if (!t) { return; }
		t.textContent = msg;
		t.classList.add('is-on');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
	};

	/* Product filters on the homepage grid. */
	$(d).on('click', '.fdr-filters button', function () {
		var f = this.getAttribute('data-f');
		$(this).addClass('is-on').siblings().removeClass('is-on');
		$(this).closest('.fdr-products').find('.fdr-card').each(function () {
			var cats = (this.getAttribute('data-cats') || '').split(' ');
			this.hidden = !(f === 'all' || cats.indexOf(f) > -1);
		});
	});

	/* Newsletter: placeholder until a mailing tool is connected. */
	$(d).on('submit', '.fdr-news-form', function (e) {
		e.preventDefault();
		this.reset();
		window.fdrToast('Benvenuta, je staat op de lijst');
	});

	/* Sections settle into place as they scroll in; content is visible either way. */
	var items = d.querySelectorAll('.fdr-rv');
	if ('IntersectionObserver' in window) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
			});
		}, { threshold: 0.08 });
		items.forEach(function (el) {
			if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-in'); } else { io.observe(el); }
		});
	} else {
		items.forEach(function (el) { el.classList.add('is-in'); });
	}
})(jQuery);
