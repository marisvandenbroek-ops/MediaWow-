<?php
/**
 * Site footer, cart drawer and toast. An Elementor Pro footer template takes over when one is assigned.
 */

defined( 'ABSPATH' ) || exit;

$fdr_link = function ( $slug ) {
	$link = get_term_link( $slug, 'product_cat' );
	return is_wp_error( $link ) ? home_url( '/' ) : $link;
};
?>
</div><!-- .fdr-content -->
<?php if ( ! function_exists( 'elementor_theme_do_location' ) || ! elementor_theme_do_location( 'footer' ) ) : ?>
	<footer class="fdr-footer" id="contact">
		<div class="fdr-wrap">
			<div class="fdr-f-grid">
				<div>
					<span class="fdr-logo"><?php bloginfo( 'name' ); ?></span>
					<p>Bloemen, zijde en interieur. Met de hand samengesteld, con amore.</p>
				</div>
				<div>
					<h6>Shop</h6>
					<ul>
						<li><a href="<?php echo esc_url( $fdr_link( 'verse-bloemen' ) ); ?>">Verse bloemen</a></li>
						<li><a href="<?php echo esc_url( $fdr_link( 'zijde' ) ); ?>">Zijde</a></li>
						<li><a href="<?php echo esc_url( $fdr_link( 'vazen' ) ); ?>">Vazen</a></li>
						<li><a href="<?php echo esc_url( home_url( '/#atelier' ) ); ?>">Atelier op maat</a></li>
					</ul>
				</div>
				<div>
					<h6>Service</h6>
					<ul>
						<li>Bezorging aan huis</li>
						<li>Afhalen in de winkel</li>
						<li>Zakelijk</li>
						<?php if ( function_exists( 'wc_get_page_permalink' ) ) : ?>
							<li><a href="<?php echo esc_url( wc_get_page_permalink( 'myaccount' ) ); ?>">Mijn account</a></li>
						<?php endif; ?>
					</ul>
				</div>
				<div>
					<h6>Volg</h6>
					<ul><li><a href="https://www.instagram.com/fioridirose" target="_blank" rel="noopener">Instagram</a></li></ul>
				</div>
			</div>
			<div class="fdr-f-bottom">
				<span>&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?></span>
				<span>iDEAL &middot; Visa &middot; Mastercard &middot; Apple Pay</span>
			</div>
		</div>
	</footer>
<?php endif; ?>

<?php if ( function_exists( 'woocommerce_mini_cart' ) ) : ?>
	<div class="fdr-scrim" data-fdr-close></div>
	<aside class="fdr-drawer" id="fdr-drawer" aria-label="Winkelmand" aria-hidden="true">
		<div class="fdr-d-head">
			<h3>Winkelmand</h3>
			<button type="button" class="fdr-icon-btn" aria-label="Winkelmand sluiten" data-fdr-close><?php echo fdr_icon( 'close' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
		</div>
		<div class="fdr-d-body"><div class="widget_shopping_cart_content"><?php woocommerce_mini_cart(); ?></div></div>
	</aside>
<?php endif; ?>
<div class="fdr-toast" id="fdr-toast" role="status" aria-live="polite"></div>

<?php wp_footer(); ?>
</body>
</html>
