<?php
/**
 * Site header. An Elementor Pro header template takes over when one is assigned.
 */

defined( 'ABSPATH' ) || exit;
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#fdr-main">Naar de inhoud</a>
<?php
if ( ! function_exists( 'elementor_theme_do_location' ) || ! elementor_theme_do_location( 'header' ) ) :
	$account = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : wp_login_url();
	?>
	<header class="fdr-header" id="fdr-header">
		<div class="fdr-wrap fdr-nav">
			<nav class="fdr-menu" aria-label="Hoofdmenu">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'fdr-primary',
						'container'      => false,
						'menu_class'     => 'fdr-menu-list',
						'depth'          => 1,
						'fallback_cb'    => 'fdr_menu_fallback',
					)
				);
				?>
			</nav>
			<button type="button" class="fdr-icon-btn fdr-burger" aria-label="Menu openen" aria-controls="fdr-mnav" aria-expanded="false" data-fdr-mnav><?php echo fdr_icon( 'menu' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
			<a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="fdr-logo" rel="home"><?php bloginfo( 'name' ); ?><small><?php bloginfo( 'description' ); ?></small></a>
			<div class="fdr-icons">
				<a class="fdr-icon-btn fdr-hide-sm" href="<?php echo esc_url( $account ); ?>" aria-label="Mijn account"><?php echo fdr_icon( 'account' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></a>
				<button type="button" class="fdr-icon-btn" aria-label="Winkelmand" data-fdr-cart><?php echo fdr_icon( 'bag' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo fdr_cart_count_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
			</div>
		</div>
	</header>

	<div class="fdr-mnav" id="fdr-mnav" aria-hidden="true">
		<div class="fdr-mnav-top">
			<span class="fdr-logo"><?php bloginfo( 'name' ); ?></span>
			<button type="button" class="fdr-icon-btn" aria-label="Menu sluiten" data-fdr-mnav-close><?php echo fdr_icon( 'close' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
		</div>
		<?php
		wp_nav_menu(
			array(
				'theme_location' => 'fdr-primary',
				'container'      => false,
				'menu_class'     => 'fdr-menu-list',
				'depth'          => 1,
				'fallback_cb'    => 'fdr_menu_fallback',
			)
		);
		?>
		<a class="fdr-mnav-extra" href="<?php echo esc_url( home_url( '/#winkel' ) ); ?>">De winkel</a>
		<a class="fdr-mnav-extra" href="<?php echo esc_url( $account ); ?>">Mijn account</a>
	</div>
<?php endif; ?>
<div id="fdr-main" class="fdr-content">
