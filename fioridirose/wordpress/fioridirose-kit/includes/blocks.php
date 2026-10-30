<?php
/**
 * Content blocks used on the homepage (as Elementor shortcode widgets):
 * [fdr_products], [fdr_signature], [fdr_collections], [fdr_journal], [fdr_newsletter].
 */

defined( 'ABSPATH' ) || exit;

/**
 * Add-to-cart control using WooCommerce's own AJAX handling (class ajax_add_to_cart).
 */
function fdr_add_button( $product, $class, $label = 'In winkelmand' ) {
	if ( $product->is_type( 'simple' ) && $product->is_purchasable() && $product->is_in_stock() ) {
		return sprintf(
			'<a href="%s" data-quantity="1" data-product_id="%d" data-product_sku="%s" class="%s add_to_cart_button ajax_add_to_cart" rel="nofollow" aria-label="%s">%s</a>',
			esc_url( $product->add_to_cart_url() ),
			$product->get_id(),
			esc_attr( $product->get_sku() ),
			esc_attr( $class ),
			esc_attr( $label . ': ' . $product->get_name() ),
			esc_html( $label )
		);
	}
	return sprintf( '<a href="%s" class="%s">%s</a>', esc_url( $product->get_permalink() ), esc_attr( $class ), 'Bekijk' );
}

function fdr_product_subtitle( $product ) {
	return wp_strip_all_tags( $product->get_short_description() );
}

/* ---------- Product grid with filters ---------- */

add_shortcode(
	'fdr_products',
	function ( $atts ) {
		if ( ! function_exists( 'wc_get_products' ) ) {
			return '';
		}
		$atts     = shortcode_atts(
			array(
				'title_pre' => 'De',
				'title_em'  => 'selectie',
				'limit'     => 8,
			),
			$atts
		);
		$products = wc_get_products(
			array(
				'status'     => 'publish',
				'visibility' => 'catalog',
				'limit'      => (int) $atts['limit'],
				'orderby'    => 'menu_order',
				'order'      => 'ASC',
			)
		);
		if ( ! $products ) {
			return '';
		}

		$used = array();
		foreach ( $products as $p ) {
			foreach ( $p->get_category_ids() as $cid ) {
				$used[ $cid ] = true;
			}
		}
		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'include'    => array_keys( $used ),
				'hide_empty' => false,
				'orderby'    => 'term_order',
			)
		);

		ob_start();
		?>
		<div class="fdr-products">
			<div class="fdr-head-row fdr-rv">
				<h2 class="fdr-display"><?php echo esc_html( $atts['title_pre'] ); ?> <em><?php echo esc_html( $atts['title_em'] ); ?></em></h2>
				<div class="fdr-filters" role="group" aria-label="Filter op categorie">
					<button type="button" class="is-on" data-f="all">Alles</button>
					<?php foreach ( (array) $terms as $t ) : ?>
						<button type="button" data-f="<?php echo esc_attr( $t->slug ); ?>"><?php echo esc_html( $t->name ); ?></button>
					<?php endforeach; ?>
				</div>
			</div>
			<div class="fdr-grid">
				<?php
				foreach ( $products as $i => $p ) :
					$slugs = wp_list_pluck( get_the_terms( $p->get_id(), 'product_cat' ) ?: array(), 'slug' );
					$tags  = wp_list_pluck( get_the_terms( $p->get_id(), 'product_tag' ) ?: array(), 'name' );
					?>
					<article class="fdr-card" data-cats="<?php echo esc_attr( implode( ' ', $slugs ) ); ?>" style="animation-delay:<?php echo (int) $i * 70; ?>ms">
						<div class="fdr-card-ph">
							<a href="<?php echo esc_url( $p->get_permalink() ); ?>" tabindex="-1" aria-hidden="true"><?php echo wp_get_attachment_image( $p->get_image_id(), 'large', false, array( 'alt' => $p->get_name() ) ); ?></a>
							<?php if ( $tags ) : ?>
								<span class="fdr-tag"><?php echo esc_html( $tags[0] ); ?></span>
							<?php endif; ?>
							<?php echo fdr_add_button( $p, 'fdr-card-add' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</div>
						<div class="fdr-card-meta">
							<div>
								<h4><a href="<?php echo esc_url( $p->get_permalink() ); ?>"><?php echo esc_html( $p->get_name() ); ?></a></h4>
								<div class="fdr-card-sub"><?php echo esc_html( fdr_product_subtitle( $p ) ); ?></div>
							</div>
							<span class="fdr-card-price"><?php echo wp_kses_post( $p->get_price_html() ); ?></span>
						</div>
					</article>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}
);

/* ---------- Two signature pieces ---------- */

add_shortcode(
	'fdr_signature',
	function ( $atts ) {
		if ( ! function_exists( 'wc_get_products' ) ) {
			return '';
		}
		$atts     = shortcode_atts( array( 'tag' => 'signature' ), $atts );
		$products = wc_get_products(
			array(
				'status'  => 'publish',
				'tag'     => array( $atts['tag'] ),
				'limit'   => 2,
				'orderby' => 'menu_order',
				'order'   => 'ASC',
			)
		);
		if ( ! $products ) {
			return '';
		}
		ob_start();
		echo '<div class="fdr-sig-grid">';
		foreach ( $products as $i => $p ) {
			?>
			<article class="fdr-piece fdr-rv<?php echo 1 === $i ? ' is-offset' : ''; ?>">
				<a href="<?php echo esc_url( $p->get_permalink() ); ?>" class="fdr-piece-fig"><?php echo wp_get_attachment_image( $p->get_image_id(), 'large', false, array( 'alt' => $p->get_name() ) ); ?></a>
				<div class="fdr-piece-cap">
					<div><h3><a href="<?php echo esc_url( $p->get_permalink() ); ?>"><?php echo esc_html( $p->get_name() ); ?></a></h3><p><?php echo esc_html( fdr_product_subtitle( $p ) ); ?></p></div>
					<span class="fdr-piece-price"><?php echo wp_kses_post( $p->get_price_html() ); ?></span>
				</div>
				<?php echo fdr_add_button( $p, 'fdr-tline' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</article>
			<?php
		}
		echo '</div>';
		return ob_get_clean();
	}
);

/* ---------- Collection tiles (product categories) ---------- */

add_shortcode(
	'fdr_collections',
	function ( $atts ) {
		$atts = shortcode_atts( array( 'slugs' => 'verse-bloemen,zijde,vazen,interieur' ), $atts );
		$out  = '';
		foreach ( array_filter( array_map( 'trim', explode( ',', $atts['slugs'] ) ) ) as $slug ) {
			$term = get_term_by( 'slug', $slug, 'product_cat' );
			if ( ! $term ) {
				continue;
			}
			$link = get_term_link( $term );
			$img  = wp_get_attachment_image( (int) get_term_meta( $term->term_id, 'thumbnail_id', true ), 'large', false, array( 'alt' => '' ) );
			$out .= sprintf(
				'<a href="%s" class="fdr-col fdr-rv"><span class="fdr-col-fig">%s</span><span class="fdr-col-t">%s <span>Shop</span></span></a>',
				esc_url( is_wp_error( $link ) ? '#' : $link ),
				$img,
				esc_html( $term->name )
			);
		}
		return $out ? '<div class="fdr-col-grid">' . $out . '</div>' : '';
	}
);

/* ---------- Journal (Instagram-style image strip) ---------- */

add_shortcode(
	'fdr_journal',
	function ( $atts ) {
		$atts = shortcode_atts(
			array(
				'ids' => '',
				'url' => 'https://www.instagram.com/fioridirose',
			),
			$atts
		);
		$out  = '';
		foreach ( array_filter( array_map( 'absint', explode( ',', $atts['ids'] ) ) ) as $id ) {
			$out .= sprintf(
				'<a href="%s" target="_blank" rel="noopener" aria-label="Bekijk op Instagram">%s</a>',
				esc_url( $atts['url'] ),
				wp_get_attachment_image( $id, 'medium_large', false, array( 'alt' => '' ) )
			);
		}
		return $out ? '<div class="fdr-j-grid">' . $out . '</div>' : '';
	}
);

/* ---------- Newsletter form (connect a mailing tool later) ---------- */

add_shortcode(
	'fdr_newsletter',
	function () {
		return '<form class="fdr-news-form"><input type="email" name="email" placeholder="Je e-mailadres" aria-label="E-mailadres" required><button type="submit">Aanmelden</button></form>';
	}
);
