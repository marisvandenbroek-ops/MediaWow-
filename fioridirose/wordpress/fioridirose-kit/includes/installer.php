<?php
/**
 * One-click installer: images, categories, products, atelier product, shipping,
 * homepage (Elementor data from data/home.json), menu and store settings.
 * Safe to run again: existing items are kept and only missing ones are created.
 */

defined( 'ABSPATH' ) || exit;

function fdr_install_requirements() {
	return array(
		'WooCommerce actief'           => class_exists( 'WooCommerce' ),
		'Elementor actief'             => defined( 'ELEMENTOR_VERSION' ),
		'Thema Fiori di Rose actief'   => 'fioridirose-child' === get_stylesheet(),
		'Hello Elementor geïnstalleerd' => (bool) wp_get_theme( 'hello-elementor' )->exists(),
	);
}

function fdr_install_images() {
	return array(
		'winkel'     => 'Winkelinterieur Fiori di Rose',
		'toonbank'   => 'De iriserende toonbank',
		'giardino'   => 'Giardino, zijden arrangement',
		'primavera'  => "Primavera d'Oro, lentetakken in gouden vaas",
		'prato'      => 'Prato Selvaggio, vers boeket',
		'rosa'       => 'Rosa Bordeaux, zijde in keramieken bol',
		'riccio'     => 'Riccio, olijfgroene vaas',
		'porcellana' => 'Porcellana, zijden rozen in pot',
		'onice'      => 'Onice, onyx kaarshouders',
		'bianca'     => 'Bianca, vaas met porseleinen rozen',
		'bordeaux'   => 'Zijde in bordeaux',
		'journal-1'  => 'Journal',
		'journal-2'  => 'Journal',
		'journal-3'  => 'Journal',
		'journal-4'  => 'Journal',
		'journal-5'  => 'Journal',
		'journal-6'  => 'Journal',
	);
}

function fdr_install_categories() {
	return array(
		'verse-bloemen' => array( 'Verse bloemen', 'prato' ),
		'zijde'         => array( 'Zijde', 'bordeaux' ),
		'vazen'         => array( 'Vazen', 'riccio' ),
		'interieur'     => array( 'Interieur', 'onice' ),
	);
}

function fdr_install_products() {
	return array(
		array( 'FDR-001', 'Giardino', 395, 'zijde', array( 'signature' ), 'giardino', 'Zijde · tinnen vaas', 'Een uitbundig zijden arrangement met ridderspoor, ranonkels, klaprozen en lathyrus in een gehamerde tinnen vaas. Samengesteld in ons atelier en gemaakt om te blijven.' ),
		array( 'FDR-002', "Primavera d'Oro", 285, 'zijde', array( 'signature' ), 'primavera', 'Zijde · gouden vaas', 'Lichte lentetakken, lelies en bloesem in een gouden vaas. Luchtig, verfijnd en het hele jaar in bloei.' ),
		array( 'FDR-003', 'Prato Selvaggio', 95, 'verse-bloemen', array(), 'prato', 'Vers boeket', 'Een wild en kleurrijk boeket van seizoensbloemen, met de hand gebonden op de dag van bezorging.' ),
		array( 'FDR-004', 'Rosa Bordeaux', 325, 'zijde', array(), 'rosa', 'Zijde · keramieken bol', 'Diep bordeaux zijden bloemen in een keramieken bol vol rozen. Een statement voor tafel of dressoir.' ),
		array( 'FDR-005', 'Riccio', 149, 'vazen', array( 'nieuw' ), 'riccio', 'Vaas · olijfgroen', 'Keramieken vaas met een stekelige structuur in olijfgroen. Mooi met en zonder bloemen.' ),
		array( 'FDR-006', 'Porcellana', 245, 'zijde', array(), 'porcellana', 'Zijden rozen in pot', 'Zijden rozen in warme amber- en abrikoostinten in een beschilderde porseleinen pot.' ),
		array( 'FDR-007', 'Onice', 129, 'interieur', array(), 'onice', 'Kaarshouders · set van vijf', 'Vijf kaarshouders van gepolijste onyx. Met een kaars erin gaat de steen zacht gloeien.' ),
		array( 'FDR-008', 'Bianca', 189, 'vazen', array(), 'bianca', 'Vaas · porseleinen rozen', 'Witte vaas bezet met porseleinen rozen. Op zijn mooist met droogbloemen of losse takken.' ),
	);
}

/**
 * @return string[] Log lines.
 */
function fdr_install_run( $rebuild_home ) {
	$log = array();

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/nav-menu.php';

	/* Store settings first, so product thumbnails are cut 4:5. */
	update_option( 'woocommerce_currency', 'EUR' );
	update_option( 'woocommerce_currency_pos', 'left_space' );
	update_option( 'woocommerce_price_thousand_sep', '.' );
	update_option( 'woocommerce_price_decimal_sep', ',' );
	update_option( 'woocommerce_price_num_decimals', 2 );
	update_option( 'woocommerce_thumbnail_cropping', 'custom' );
	update_option( 'woocommerce_thumbnail_cropping_custom_width', 4 );
	update_option( 'woocommerce_thumbnail_cropping_custom_height', 5 );
	update_option( 'woocommerce_coming_soon', 'yes' );
	update_option( 'woocommerce_store_pages_only', 'no' );
	update_option( 'elementor_disable_color_schemes', 'yes' );
	update_option( 'elementor_disable_typography_schemes', 'yes' );
	update_option( 'elementor_experiment-container', 'active' );
	$name = get_option( 'blogname' );
	if ( in_array( $name, array( '', 'My WordPress Website', 'Mijn WordPress website', 'My Blog', 'Mijn blog' ), true ) ) {
		update_option( 'blogname', 'Fiori di Rose' );
		update_option( 'blogdescription', 'Bloemen & interieur' );
	}
	$log[] = 'Winkelinstellingen gezet (euro, prijsweergave, productfoto’s 4:5, site in "binnenkort beschikbaar"-modus).';

	/* Images. */
	$map = get_option( 'fdr_images', array() );
	$new = 0;
	foreach ( fdr_install_images() as $key => $title ) {
		if ( ! empty( $map[ $key ] ) && get_post( $map[ $key ] ) ) {
			continue;
		}
		$src = FDR_KIT_DIR . 'assets/img/' . $key . '.jpg';
		$tmp = wp_tempnam( $key . '.jpg' );
		copy( $src, $tmp );
		$id = media_handle_sideload(
			array(
				'name'     => 'fiori-di-rose-' . $key . '.jpg',
				'tmp_name' => $tmp,
			),
			0,
			$title
		);
		if ( is_wp_error( $id ) ) {
			$log[] = 'Foto ' . $key . ' kon niet worden geïmporteerd: ' . $id->get_error_message();
			wp_delete_file( $tmp );
			continue;
		}
		update_post_meta( $id, '_wp_attachment_image_alt', $title );
		$map[ $key ] = $id;
		++$new;
	}
	update_option( 'fdr_images', $map );
	$log[] = $new . ' foto’s toegevoegd aan de mediabibliotheek.';

	/* Categories and tags. */
	$cats  = array();
	$order = 0;
	foreach ( fdr_install_categories() as $slug => $def ) {
		$term = get_term_by( 'slug', $slug, 'product_cat' );
		if ( ! $term ) {
			$res  = wp_insert_term( $def[0], 'product_cat', array( 'slug' => $slug ) );
			$term = is_wp_error( $res ) ? null : get_term( $res['term_id'], 'product_cat' );
		}
		if ( $term ) {
			$cats[ $slug ] = (int) $term->term_id;
			if ( ! get_term_meta( $term->term_id, 'thumbnail_id', true ) && fdr_img_id( $def[1] ) ) {
				update_term_meta( $term->term_id, 'thumbnail_id', fdr_img_id( $def[1] ) );
			}
			update_term_meta( $term->term_id, 'order', $order++ );
		}
	}
	$tags = array();
	foreach ( array( 'signature' => 'Signature', 'nieuw' => 'Nieuw' ) as $slug => $label ) {
		$term = get_term_by( 'slug', $slug, 'product_tag' );
		if ( ! $term ) {
			$res  = wp_insert_term( $label, 'product_tag', array( 'slug' => $slug ) );
			$term = is_wp_error( $res ) ? null : get_term( $res['term_id'], 'product_tag' );
		}
		if ( $term ) {
			$tags[ $slug ] = (int) $term->term_id;
		}
	}
	$log[] = 'Categorieën en labels klaar.';

	/* Products. */
	$made = 0;
	foreach ( fdr_install_products() as $i => $p ) {
		list( $sku, $title, $price, $cat, $ptags, $img, $short, $desc ) = $p;
		if ( wc_get_product_id_by_sku( $sku ) ) {
			continue;
		}
		$product = new WC_Product_Simple();
		$product->set_name( $title );
		$product->set_sku( $sku );
		$product->set_regular_price( (string) $price );
		$product->set_short_description( $short );
		$product->set_description( $desc );
		$product->set_category_ids( isset( $cats[ $cat ] ) ? array( $cats[ $cat ] ) : array() );
		$product->set_tag_ids( array_values( array_intersect_key( $tags, array_flip( $ptags ) ) ) );
		$product->set_image_id( fdr_img_id( $img ) );
		$product->set_menu_order( $i );
		$product->set_stock_status( 'instock' );
		$product->set_status( 'publish' );
		$product->save();
		++$made;
	}
	$log[] = $made . ' producten aangemaakt.';

	/* Hidden product that carries the configurator. */
	$pid = fdr_atelier_pid();
	if ( ! $pid || ! wc_get_product( $pid ) ) {
		$pid = wc_get_product_id_by_sku( 'FDR-ATELIER' );
	}
	if ( ! $pid ) {
		$product = new WC_Product_Simple();
		$product->set_name( 'Atelier op maat' );
		$product->set_sku( 'FDR-ATELIER' );
		$product->set_regular_price( '65' );
		$product->set_catalog_visibility( 'hidden' );
		$product->set_image_id( fdr_img_id( 'giardino' ) );
		$product->set_status( 'publish' );
		$pid = $product->save();
		$log[] = 'Product "Atelier op maat" aangemaakt (verborgen in de winkel).';
	}
	update_option( 'fdr_atelier_product_id', (int) $pid );
	if ( ! get_option( 'fdr_atelier_config' ) ) {
		update_option( 'fdr_atelier_config', fdr_atelier_defaults() );
	}

	/* Shipping: Nederland, flat rate with free delivery from € 150, plus pickup. */
	if ( ! get_option( 'fdr_shipping_done' ) && class_exists( 'WC_Shipping_Zone' ) ) {
		$zone = new WC_Shipping_Zone();
		$zone->set_zone_name( 'Nederland' );
		$zone->set_zone_order( 0 );
		$zone->add_location( 'NL', 'country' );
		$zone->save();
		$flat = $zone->add_shipping_method( 'flat_rate' );
		update_option( 'woocommerce_flat_rate_' . $flat . '_settings', array( 'title' => 'Bezorging', 'tax_status' => 'taxable', 'cost' => '12.50' ) );
		$free = $zone->add_shipping_method( 'free_shipping' );
		update_option( 'woocommerce_free_shipping_' . $free . '_settings', array( 'title' => 'Gratis bezorging', 'requires' => 'min_amount', 'min_amount' => '150', 'ignore_discounts' => 'no' ) );
		$pick = $zone->add_shipping_method( 'local_pickup' );
		update_option( 'woocommerce_local_pickup_' . $pick . '_settings', array( 'title' => 'Afhalen in de winkel', 'tax_status' => 'none', 'cost' => '' ) );
		update_option( 'fdr_shipping_done', 1 );
		$log[] = 'Verzendzone Nederland: bezorging € 12,50, gratis vanaf € 150, afhalen in de winkel.';
	}

	/* Homepage. */
	$home = (int) get_option( 'fdr_home_page_id' );
	if ( ! $home || ! get_post( $home ) ) {
		$home = wp_insert_post(
			array(
				'post_title'  => 'Home',
				'post_type'   => 'page',
				'post_status' => 'publish',
			)
		);
		update_option( 'fdr_home_page_id', $home );
		$rebuild_home = true;
	}
	if ( $rebuild_home ) {
		$data = fdr_install_home_data( $cats );
		if ( is_wp_error( $data ) ) {
			$log[] = $data->get_error_message();
		} else {
			update_post_meta( $home, '_elementor_data', wp_slash( wp_json_encode( $data ) ) );
			update_post_meta( $home, '_elementor_edit_mode', 'builder' );
			update_post_meta( $home, '_elementor_template_type', 'wp-page' );
			update_post_meta( $home, '_elementor_version', defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : '3.25.0' );
			update_post_meta( $home, '_wp_page_template', 'elementor_header_footer' );
			$log[] = 'Homepage opgebouwd in Elementor.';
		}
	}
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $home );

	/* Menu. */
	$menu = wp_get_nav_menu_object( 'Fiori di Rose hoofdmenu' );
	if ( ! $menu ) {
		$menu_id = wp_create_nav_menu( 'Fiori di Rose hoofdmenu' );
		if ( ! is_wp_error( $menu_id ) ) {
			foreach ( array( 'verse-bloemen' => 'Bloemen', 'zijde' => 'Zijde', 'vazen' => 'Vazen' ) as $slug => $label ) {
				if ( isset( $cats[ $slug ] ) ) {
					wp_update_nav_menu_item(
						$menu_id,
						0,
						array(
							'menu-item-title'     => $label,
							'menu-item-object'    => 'product_cat',
							'menu-item-object-id' => $cats[ $slug ],
							'menu-item-type'      => 'taxonomy',
							'menu-item-status'    => 'publish',
						)
					);
				}
			}
			wp_update_nav_menu_item(
				$menu_id,
				0,
				array(
					'menu-item-title'  => 'Atelier',
					'menu-item-url'    => home_url( '/#atelier' ),
					'menu-item-type'   => 'custom',
					'menu-item-status' => 'publish',
				)
			);
			$menu = wp_get_nav_menu_object( $menu_id );
			$log[] = 'Hoofdmenu aangemaakt.';
		}
	}
	if ( $menu && 'fioridirose-child' === get_stylesheet() ) {
		$locations                = get_theme_mod( 'nav_menu_locations', array() );
		$locations['fdr-primary'] = $menu->term_id;
		set_theme_mod( 'nav_menu_locations', $locations );
	}

	if ( class_exists( '\Elementor\Plugin' ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	flush_rewrite_rules();
	update_option( 'fdr_installed', time() );
	$log[] = 'Klaar.';

	return $log;
}

/**
 * Load data/home.json and fill in the image, category and journal tokens.
 */
function fdr_install_home_data( $cats ) {
	$raw  = file_get_contents( FDR_KIT_DIR . 'data/home.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$data = json_decode( (string) $raw, true );
	if ( ! is_array( $data ) ) {
		return new WP_Error( 'fdr_home', 'home.json kon niet worden gelezen.' );
	}

	$journal = array();
	for ( $i = 1; $i <= 6; $i++ ) {
		$journal[] = fdr_img_id( 'journal-' . $i );
	}
	$replace = array( '{{ids:journal}}' => implode( ',', array_filter( $journal ) ) );
	foreach ( array_keys( fdr_install_images() ) as $key ) {
		$replace[ '{{url:' . $key . '}}' ] = (string) wp_get_attachment_url( fdr_img_id( $key ) );
	}
	foreach ( $cats as $slug => $term_id ) {
		$link                              = get_term_link( (int) $term_id, 'product_cat' );
		$replace[ '{{cat:' . $slug . '}}' ] = is_wp_error( $link ) ? '#' : $link;
	}

	$walk = function ( $node ) use ( &$walk, $replace ) {
		if ( is_array( $node ) ) {
			foreach ( $node as $k => $v ) {
				$node[ $k ] = $walk( $v );
			}
			return $node;
		}
		if ( is_string( $node ) ) {
			if ( preg_match( '/^\{\{id:([a-z0-9-]+)\}\}$/', $node, $m ) ) {
				return fdr_img_id( $m[1] );
			}
			return strtr( $node, $replace );
		}
		return $node;
	};
	return $walk( $data );
}
