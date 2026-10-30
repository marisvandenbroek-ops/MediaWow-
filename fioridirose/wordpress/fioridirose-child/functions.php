<?php
/**
 * Fiori di Rose child theme for Hello Elementor.
 */

defined( 'ABSPATH' ) || exit;

define( 'FDR_THEME_VERSION', '1.0.0' );

add_action(
	'after_setup_theme',
	function () {
		register_nav_menus( array( 'fdr-primary' => 'Hoofdmenu (Fiori di Rose)' ) );
		add_theme_support( 'woocommerce' );
		add_theme_support( 'wc-product-gallery-zoom' );
		add_theme_support( 'wc-product-gallery-lightbox' );
		add_theme_support( 'wc-product-gallery-slider' );
	},
	20
);

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style( 'fdr-fonts', 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Jost:wght@300;400;500&display=swap', array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
		$deps = array( 'fdr-fonts' );
		foreach ( array( 'hello-elementor', 'hello-elementor-theme-style', 'elementor-frontend', 'woocommerce-general' ) as $handle ) {
			if ( wp_style_is( $handle, 'registered' ) ) {
				$deps[] = $handle;
			}
		}
		wp_enqueue_style( 'fdr-theme', get_stylesheet_uri(), $deps, FDR_THEME_VERSION );

		$js = array( 'jquery' );
		if ( class_exists( 'WooCommerce' ) ) {
			wp_enqueue_script( 'wc-add-to-cart' );
			wp_enqueue_script( 'wc-cart-fragments' );
			$js[] = 'wc-add-to-cart';
		}
		wp_enqueue_script( 'fdr-site', get_stylesheet_directory_uri() . '/assets/site.js', $js, FDR_THEME_VERSION, true );
	},
	20
);

add_filter(
	'body_class',
	function ( $classes ) {
		$classes[] = 'fdr-site';
		if ( is_front_page() ) {
			$classes[] = 'fdr-overlay-header';
		}
		return $classes;
	}
);

/* Cart count in the header, refreshed by WooCommerce after AJAX add/remove. */
function fdr_cart_count_html() {
	$n = function_exists( 'WC' ) && WC()->cart ? WC()->cart->get_cart_contents_count() : 0;
	return '<span class="fdr-count fdr-cart-count' . ( $n ? ' is-on' : '' ) . '">' . (int) $n . '</span>';
}

add_filter(
	'woocommerce_add_to_cart_fragments',
	function ( $fragments ) {
		$fragments['span.fdr-cart-count'] = fdr_cart_count_html();
		return $fragments;
	}
);

/* Shop archive: four columns, twelve products. */
add_filter( 'loop_shop_columns', fn() => 4 );
add_filter( 'loop_shop_per_page', fn() => 12 );

function fdr_menu_fallback() {
	$items = array();
	foreach ( array( 'verse-bloemen' => 'Bloemen', 'zijde' => 'Zijde', 'vazen' => 'Vazen' ) as $slug => $label ) {
		$link = get_term_link( $slug, 'product_cat' );
		if ( ! is_wp_error( $link ) ) {
			$items[] = '<li><a href="' . esc_url( $link ) . '">' . esc_html( $label ) . '</a></li>';
		}
	}
	$items[] = '<li><a href="' . esc_url( home_url( '/#atelier' ) ) . '">Atelier</a></li>';
	echo '<ul class="fdr-menu-list">' . implode( '', $items ) . '</ul>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

function fdr_icon( $name ) {
	$paths = array(
		'menu'    => '<path d="M3 8h18M3 16h18"/>',
		'close'   => '<path d="M6 6l12 12M18 6 6 18"/>',
		'bag'     => '<path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
		'account' => '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
	);
	return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">' . $paths[ $name ] . '</svg>';
}
