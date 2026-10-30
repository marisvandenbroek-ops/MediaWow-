<?php
/**
 * Plugin Name:       Fiori di Rose Kit
 * Description:       Atelier op maat, productblokken, bezorgplanner en de installatie van de Fiori di Rose-website.
 * Version:           1.0.0
 * Author:            MediaWow
 * Requires at least: 6.4
 * Requires PHP:      8.0
 * Requires Plugins:  woocommerce, elementor
 * WC requires at least: 8.0
 * Text Domain:       fioridirose
 */

defined( 'ABSPATH' ) || exit;

define( 'FDR_KIT_FILE', __FILE__ );
define( 'FDR_KIT_DIR', plugin_dir_path( __FILE__ ) );
define( 'FDR_KIT_URL', plugin_dir_url( __FILE__ ) );
define( 'FDR_KIT_VERSION', '1.0.0' );

add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', FDR_KIT_FILE, true );
		}
	}
);

require FDR_KIT_DIR . 'includes/helpers.php';
require FDR_KIT_DIR . 'includes/atelier.php';
require FDR_KIT_DIR . 'includes/blocks.php';
require FDR_KIT_DIR . 'includes/planner.php';
require FDR_KIT_DIR . 'includes/installer.php';
require FDR_KIT_DIR . 'includes/admin.php';

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_register_script( 'fdr-atelier', FDR_KIT_URL . 'assets/atelier.js', array( 'jquery' ), FDR_KIT_VERSION, true );
	}
);
