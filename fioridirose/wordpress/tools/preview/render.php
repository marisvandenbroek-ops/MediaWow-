<?php
/**
 * Offline preview: runs the real theme + plugin PHP against minimal WordPress/WooCommerce stubs
 * and renders home.json the way Elementor's container markup does. Not shipped.
 *
 * php tools/preview/render.php > /tmp/preview.html
 */

define( 'ABSPATH', __DIR__ . '/' );
$ROOT = dirname( __DIR__, 2 );
$IMG  = 'file://' . $ROOT . '/fioridirose-kit/assets/img/';

/* ---- WordPress stubs ---- */
$GLOBALS['sc']      = array();
$GLOBALS['options'] = array();
function add_shortcode( $t, $cb ) { $GLOBALS['sc'][ $t ] = $cb; }
function add_action() {}
function absint( $v ) { return abs( (int) $v ); }
function sanitize_key( $v ) { return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', $v ) ); }
function add_filter() {}
function register_nav_menus() {}
function add_theme_support() {}
function plugin_dir_path( $f ) { return dirname( $f ) . '/'; }
function plugin_dir_url( $f ) { return 'file://' . dirname( $f ) . '/'; }
function get_option( $k, $d = false ) { return $GLOBALS['options'][ $k ] ?? $d; }
function update_option( $k, $v ) { $GLOBALS['options'][ $k ] = $v; }
function wp_parse_args( $a, $d ) { return array_merge( $d, $a ); }
function shortcode_atts( $d, $a ) { $a = (array) $a; $o = array(); foreach ( $d as $k => $v ) { $o[ $k ] = $a[ $k ] ?? $v; } return $o; }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_url( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_textarea( $s ) { return esc_html( $s ); }
function wp_kses_post( $s ) { return $s; }
function wp_json_encode( $v ) { return json_encode( $v ); }
function wp_strip_all_tags( $s ) { return strip_tags( $s ); }
function checked( $a, $b = true ) { if ( $a == $b ) { echo ' checked'; } }
function wp_timezone() { return new DateTimeZone( 'Europe/Amsterdam' ); }
function current_user_can() { return true; }
function is_admin() { return false; }
function is_wp_error( $x ) { return $x instanceof WP_Error; }
class WP_Error { public $m; function __construct( $c, $m ) { $this->m = $m; } function get_error_message() { return $this->m; } }
function home_url( $p = '' ) { return 'https://fioridirose.test' . $p; }
function get_permalink() { return 'https://fioridirose.test/'; }
function wp_enqueue_script() {}
function wp_list_pluck( $l, $f ) { return array_map( fn( $o ) => $o->$f, $l ); }
function language_attributes() { echo 'lang="nl-NL"'; }
function bloginfo( $k ) { echo array( 'name' => 'Fiori di Rose', 'description' => 'Bloemen &amp; interieur', 'charset' => 'UTF-8' )[ $k ] ?? ''; }
function body_class() { echo 'class="home page woocommerce fdr-site fdr-overlay-header woocommerce-js"'; }
function wp_head() { echo $GLOBALS['head']; }
function wp_body_open() {}
function wp_footer() { echo $GLOBALS['foot']; }
function wp_nav_menu( $a ) { call_user_func( $a['fallback_cb'] ); }
function wp_login_url() { return '#'; }
function wp_date( $f ) { return date( $f ); }
function wc_get_page_permalink() { return home_url( '/mijn-account/' ); }
function get_term_link( $t ) { return home_url( '/categorie/' . ( is_object( $t ) ? $t->slug : $t ) . '/' ); }
function get_term_meta( $id ) { return $GLOBALS['cats'][ $id ]->img; }
function get_term_by( $f, $slug ) { foreach ( $GLOBALS['cats'] as $c ) { if ( $c->slug === $slug ) { return $c; } } return false; }
function get_terms( $a ) { return array_values( array_filter( $GLOBALS['cats'], fn( $c ) => in_array( $c->term_id, $a['include'], true ) ) ); }
function get_the_terms( $pid, $tax ) { $p = $GLOBALS['prods'][ $pid ]; return 'product_cat' === $tax ? array( $GLOBALS['cats'][ $p->cat ] ) : array_map( fn( $n ) => (object) array( 'name' => $n ), $p->tags ); }
function wp_get_attachment_image( $id, $size = '', $icon = false, $attr = array() ) {
	$cls = isset( $attr['class'] ) ? ' class="' . $attr['class'] . '"' : '';
	return $id ? '<img src="' . wp_get_attachment_image_url( $id ) . '" alt="' . esc_attr( $attr['alt'] ?? '' ) . '"' . $cls . '>' : '';
}
function wp_get_attachment_image_url( $id ) { return $GLOBALS['IMG'] . array_search( $id, $GLOBALS['options']['fdr_images'], true ) . '.jpg'; }
function wp_get_attachment_url( $id ) { return wp_get_attachment_image_url( $id ); }
function wc_price( $v ) { $v = (float) $v; return '<span class="woocommerce-Price-amount amount"><bdi>€&nbsp;' . ( floor( $v ) == $v ? (int) $v : number_format( $v, 2, ',', '.' ) ) . '</bdi></span>'; }
function wc_get_product( $id ) { return true; }
function WC() { return (object) array( 'session' => null, 'cart' => null ); }
function wc_get_products( $a ) {
	$out = array_values( $GLOBALS['prods'] );
	if ( isset( $a['tag'] ) ) { $out = array_values( array_filter( $out, fn( $p ) => in_array( 'Signature', $p->tags, true ) ) ); }
	return array_slice( $out, 0, $a['limit'] );
}
class P {
	function __construct( public $id, public $name, public $price, public $cat, public $tags, public $img, public $short ) {}
	function get_id() { return $this->id; }
	function get_name() { return $this->name; }
	function get_sku() { return 'FDR-' . $this->id; }
	function is_type( $t ) { return 'simple' === $t; }
	function is_purchasable() { return true; }
	function is_in_stock() { return true; }
	function add_to_cart_url() { return '?add-to-cart=' . $this->id; }
	function get_permalink() { return home_url( '/product/' . $this->id ); }
	function get_short_description() { return $this->short; }
	function get_image_id() { return fdr_img_id( $this->img ); }
	function get_price_html() { return wc_price( $this->price ); }
	function get_category_ids() { return array( $this->cat ); }
}

$GLOBALS['IMG'] = $IMG;
define( 'FDR_KIT_DIR', $ROOT . '/fioridirose-kit/' );
$keys           = array( 'winkel', 'toonbank', 'giardino', 'primavera', 'prato', 'rosa', 'riccio', 'porcellana', 'onice', 'bianca', 'bordeaux', 'journal-1', 'journal-2', 'journal-3', 'journal-4', 'journal-5', 'journal-6' );
$GLOBALS['options']['fdr_images']             = array_combine( $keys, range( 101, 100 + count( $keys ) ) );
$GLOBALS['options']['fdr_atelier_product_id'] = 999;

require $ROOT . '/fioridirose-kit/includes/helpers.php';
require $ROOT . '/fioridirose-kit/includes/atelier.php';
require $ROOT . '/fioridirose-kit/includes/blocks.php';
require $ROOT . '/fioridirose-kit/includes/installer.php';
require $ROOT . '/fioridirose-child/functions.php';

$GLOBALS['cats'] = array();
$i               = 1;
foreach ( fdr_install_categories() as $slug => $def ) {
	$GLOBALS['cats'][ $i ] = (object) array( 'term_id' => $i, 'slug' => $slug, 'name' => $def[0], 'img' => fdr_img_id( $def[1] ) );
	$slug_to_id[ $slug ]   = $i++;
}
$GLOBALS['prods'] = array();
foreach ( fdr_install_products() as $n => $p ) {
	$GLOBALS['prods'][ $n + 1 ] = new P( $n + 1, $p[1], $p[2], $slug_to_id[ $p[3] ], array_map( 'ucfirst', $p[4] ), $p[5], $p[6] );
}

/* ---- Elementor-like rendering of home.json ---- */
function do_shortcode_str( $s ) {
	return preg_replace_callback(
		'/\[(\w+)([^\]]*)\]/',
		function ( $m ) {
			preg_match_all( '/(\w+)="([^"]*)"/', $m[2], $a, PREG_SET_ORDER );
			$atts = array();
			foreach ( $a as $x ) { $atts[ $x[1] ] = $x[2]; }
			return call_user_func( $GLOBALS['sc'][ $m[1] ], $atts );
		},
		$s
	);
}
function render_el( $el ) {
	$s = $el['settings'];
	if ( 'container' === $el['elType'] ) {
		$tag = $s['html_tag'] ?? 'div';
		$id  = isset( $s['_element_id'] ) ? ' id="' . $s['_element_id'] . '"' : '';
		$cls = 'elementor-element e-flex e-con-full e-con ' . ( $el['isInner'] ? 'e-child' : 'e-parent' ) . ' ' . $s['css_classes'];
		return "<$tag class=\"$cls\"$id>" . implode( '', array_map( 'render_el', $el['elements'] ) ) . "</$tag>";
	}
	$type = $el['widgetType'];
	switch ( $type ) {
		case 'heading':
			$t     = $s['header_size'];
			$inner = "<$t class=\"elementor-heading-title elementor-size-default\">{$s['title']}</$t>";
			break;
		case 'text-editor':
			$inner = $s['editor'];
			break;
		case 'html':
			$inner = $s['html'];
			break;
		case 'shortcode':
			$inner = '<div class="elementor-shortcode">' . do_shortcode_str( $s['shortcode'] ) . '</div>';
			break;
		case 'image':
			$inner = '<img src="' . $s['image']['url'] . '" alt="' . esc_attr( $s['image']['alt'] ) . '">';
			break;
	}
	return '<div class="elementor-element elementor-widget elementor-widget-' . $type . ' ' . ( $s['_css_classes'] ?? '' ) . '"><div class="elementor-widget-container">' . $inner . '</div></div>';
}

$data = fdr_install_home_data( $slug_to_id );

/* Elementor-ish base CSS so the theme's resets are actually exercised. */
$elementor_css = '.e-con{--padding-top:10px;--padding-bottom:10px;--padding-left:10px;--padding-right:10px;--gap:20px;--row-gap:20px;--column-gap:20px;--flex-direction:column;--display:flex;display:var(--display);flex-direction:var(--flex-direction);gap:var(--row-gap) var(--column-gap);padding:var(--padding-top) var(--padding-right) var(--padding-bottom) var(--padding-left);width:var(--width,100%);position:relative;box-sizing:border-box}'
	. '.elementor-widget:not(:last-child){margin-block-end:20px}.elementor-heading-title{line-height:1;margin:0;padding:0;font-family:Roboto,sans-serif;color:#6ec1e4}'
	. 'body{margin:0}a{color:#c36}button,[type=submit]{border:1px solid #c36;color:#c36;padding:.5rem 1rem;border-radius:3px;background:transparent}button:hover{background:#c36;color:#fff}'
	. '.woocommerce ul.cart_list li,.woocommerce ul.product_list_widget li,ul.product_list_widget li{padding:4px 0;margin:0;list-style:none}.woocommerce ul.cart_list li a,.woocommerce ul.product_list_widget li a,ul.product_list_widget li a{display:block;font-weight:700}.woocommerce ul.cart_list li img,.woocommerce ul.product_list_widget li img,ul.product_list_widget li img{float:right;margin-left:4px;width:32px;height:auto;box-shadow:none;position:static}.woocommerce .widget_shopping_cart .cart_list li,.widget_shopping_cart_content .cart_list li{padding-left:2em;position:relative;padding-top:0}.woocommerce .widget_shopping_cart .cart_list li a.remove,.widget_shopping_cart_content .cart_list li a.remove{position:absolute;top:0;left:0}.woocommerce a.remove,a.remove{display:block;font-size:1.5em;height:1em;width:1em;text-align:center;line-height:1;border-radius:100%;color:#e2401c!important;font-weight:700}.woocommerce a.button,a.button{font-size:100%;margin:0;line-height:1;cursor:pointer;position:relative;font-weight:700;border-radius:3px;padding:.618em 1em;background-color:#e9e6ed;color:#515151;display:inline-block}.widget_shopping_cart_content .buttons a{margin-right:5px;margin-bottom:5px}.widget_shopping_cart_content .total{border-top:3px double #ebe9eb;padding:4px 0 0}.screen-reader-text{position:absolute!important;clip:rect(1px,1px,1px,1px);height:1px;width:1px;overflow:hidden}';

$GLOBALS['head'] = '<style>' . $elementor_css . '</style><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Jost:wght@300;400;500&display=swap"><link rel="stylesheet" href="file://' . $ROOT . '/fioridirose-child/style.css"><script src="file://' . __DIR__ . '/jquery.js"></script>';
$GLOBALS['foot'] = '<script>var wc_add_to_cart_params={wc_ajax_url:"/?wc-ajax=%%endpoint%%"};</script><script src="file://' . $ROOT . '/fioridirose-kit/assets/atelier.js"></script><script src="file://' . $ROOT . '/fioridirose-child/assets/site.js"></script>';

function woocommerce_mini_cart() {
	$img = wp_get_attachment_image_url( fdr_img_id( 'riccio' ) );
	$img2 = wp_get_attachment_image_url( fdr_img_id( 'porcellana' ) );
	echo '<ul class="woocommerce-mini-cart cart_list product_list_widget">'
	. '<li class="woocommerce-mini-cart-item mini_cart_item"><a href="#" class="remove remove_from_cart_button" aria-label="Verwijder">&times;</a><a href="#"><img width="300" height="375" src="' . $img . '" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" alt="">Riccio</a><span class="quantity">1 &times; ' . wc_price( 149 ) . '</span></li>'
	. '<li class="woocommerce-mini-cart-item mini_cart_item"><a href="#" class="remove remove_from_cart_button">&times;</a><a href="#"><img width="300" height="375" src="' . $img2 . '" alt="">Atelier · Ambra</a><dl class="variation"><dt class="variation-Formaat">Formaat:</dt><dd class="variation-Formaat"><p>Grand</p></dd><dt>Afwerking:</dt><dd><p>Vaas uit de collectie</p></dd><dt>Bezorgdag:</dt><dd><p>za 31 okt</p></dd></dl><span class="quantity">1 &times; ' . wc_price( 190 ) . '</span></li>'
	. '</ul><p class="woocommerce-mini-cart__total total"><strong>Subtotaal:</strong> ' . wc_price( 339 ) . '</p>'
	. '<p class="woocommerce-mini-cart__buttons buttons"><a href="#" class="button wc-forward">Bekijk winkelwagen</a><a href="#" class="button checkout wc-forward">Afrekenen</a></p>';
}
function elementor_theme_do_location() { return false; }

ob_start();
require $ROOT . '/fioridirose-child/header.php';
echo '<div class="elementor">' . implode( '', array_map( 'render_el', $data ) ) . '</div>';
require $ROOT . '/fioridirose-child/footer.php';
echo ob_get_clean();
