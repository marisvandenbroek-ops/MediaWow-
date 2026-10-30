<?php
/**
 * Atelier op maat: the arrangement configurator.
 *
 * Shortcode [fdr_atelier]. Adds one hidden WooCommerce product ("Atelier op maat") to the cart
 * with the chosen size, mood, extras, card text and delivery day; the price is set per cart line.
 */

defined( 'ABSPATH' ) || exit;

function fdr_atelier_defaults() {
	return array(
		'title_pre'    => 'Jouw arrangement,',
		'title_em'     => 'onze handen',
		'intro'        => 'Kies formaat, stemming en dag. Onze bloemisten stellen het samen en sturen je een foto voordat het de deur uit gaat.',
		'sizes'        => array(
			array( 'name' => 'Petite', 'price' => 65 ),
			array( 'name' => 'Classique', 'price' => 95 ),
			array( 'name' => 'Grand', 'price' => 145 ),
			array( 'name' => 'Opulent', 'price' => 225 ),
		),
		'default_size' => 1,
		'moods'        => array(
			array( 'name' => 'Giardino', 'image' => 'giardino' ),
			array( 'name' => 'Primavera', 'image' => 'primavera' ),
			array( 'name' => 'Ambra', 'image' => 'porcellana' ),
			array( 'name' => 'Bordeaux', 'image' => 'bordeaux' ),
		),
		'extras'       => array(
			array( 'key' => 'vase', 'name' => 'Vaas uit de collectie', 'note' => 'Wij kiezen een vaas die past', 'price' => 45 ),
			array( 'key' => 'candle', 'name' => 'Geurkaars', 'note' => 'In onyx houder', 'price' => 39 ),
		),
		'lead_days'    => 1,
		'days_ahead'   => 8,
		'closed_days'  => array( 0 ),
	);
}

function fdr_atelier_config() {
	$saved = get_option( 'fdr_atelier_config', array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), fdr_atelier_defaults() );
}

function fdr_atelier_pid() {
	return (int) get_option( 'fdr_atelier_product_id' );
}

/**
 * Bookable delivery days as Y-m-d strings.
 */
function fdr_atelier_dates( $c = null ) {
	$c      = $c ? $c : fdr_atelier_config();
	$closed = array_map( 'intval', (array) $c['closed_days'] );
	$day    = new DateTimeImmutable( 'today', wp_timezone() );
	$day    = $day->modify( '+' . max( 0, (int) $c['lead_days'] ) . ' day' );
	$out    = array();
	for ( $guard = 0; count( $out ) < max( 1, (int) $c['days_ahead'] ) && $guard < 60; $guard++ ) {
		if ( ! in_array( (int) $day->format( 'w' ), $closed, true ) ) {
			$out[] = $day->format( 'Y-m-d' );
		}
		$day = $day->modify( '+1 day' );
	}
	return $out;
}

function fdr_atelier_extra_map( $c ) {
	$map = array();
	foreach ( $c['extras'] as $e ) {
		$map[ $e['key'] ] = $e;
	}
	return $map;
}

/**
 * Read and validate the configurator fields from the current request.
 *
 * @return array|WP_Error
 */
function fdr_atelier_read_request() {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- WooCommerce add-to-cart requests carry no nonce.
	$c     = fdr_atelier_config();
	$size  = isset( $_POST['fdr_size'] ) ? absint( wp_unslash( $_POST['fdr_size'] ) ) : -1;
	$mood  = isset( $_POST['fdr_mood'] ) ? absint( wp_unslash( $_POST['fdr_mood'] ) ) : -1;
	$date  = isset( $_POST['fdr_date'] ) ? sanitize_text_field( wp_unslash( $_POST['fdr_date'] ) ) : '';
	$card  = isset( $_POST['fdr_card'] ) ? sanitize_textarea_field( wp_unslash( $_POST['fdr_card'] ) ) : '';
	$extra = isset( $_POST['fdr_extras'] ) ? array_map( 'sanitize_key', (array) wp_unslash( $_POST['fdr_extras'] ) ) : array();
	// phpcs:enable

	if ( ! isset( $c['sizes'][ $size ] ) ) {
		return new WP_Error( 'fdr_size', 'Kies een formaat.' );
	}
	if ( ! isset( $c['moods'][ $mood ] ) ) {
		return new WP_Error( 'fdr_mood', 'Kies een stemming.' );
	}
	if ( ! in_array( $date, fdr_atelier_dates( $c ), true ) ) {
		return new WP_Error( 'fdr_date', 'Deze bezorgdag is niet meer beschikbaar. Kies een andere dag.' );
	}

	$map    = fdr_atelier_extra_map( $c );
	$price  = (float) $c['sizes'][ $size ]['price'];
	$chosen = array();
	foreach ( array_unique( $extra ) as $key ) {
		if ( isset( $map[ $key ] ) ) {
			$price   += (float) $map[ $key ]['price'];
			$chosen[] = $map[ $key ]['name'];
		}
	}

	return array(
		'size'       => $c['sizes'][ $size ]['name'],
		'mood'       => $c['moods'][ $mood ]['name'],
		'mood_image' => fdr_img_id( $c['moods'][ $mood ]['image'] ),
		'extras'     => $chosen,
		'card'       => mb_substr( $card, 0, 160 ),
		'date'       => $date,
		'price'      => $price,
	);
}

/* ---------- Shortcode ---------- */

add_shortcode( 'fdr_atelier', 'fdr_atelier_shortcode' );

function fdr_atelier_shortcode() {
	if ( ! function_exists( 'WC' ) ) {
		return '';
	}
	$pid = fdr_atelier_pid();
	if ( ! $pid || ! wc_get_product( $pid ) ) {
		return current_user_can( 'manage_options' ) ? '<p>Het product "Atelier op maat" ontbreekt. Draai de installatie opnieuw via Fiori di Rose → Installatie.</p>' : '';
	}

	wp_enqueue_script( 'fdr-atelier' );

	$c     = fdr_atelier_config();
	$sizes = array_values( $c['sizes'] );
	$moods = array_values( $c['moods'] );
	$def   = min( max( 0, (int) $c['default_size'] ), count( $sizes ) - 1 );
	$dates = fdr_atelier_dates( $c );
	$dn    = fdr_day_names();
	$mn    = fdr_month_names();

	$js = array(
		'sizes'  => array(),
		'moods'  => array(),
		'extras' => array(),
	);
	foreach ( $sizes as $s ) {
		$js['sizes'][] = array( 'name' => $s['name'], 'price' => (float) $s['price'] );
	}
	foreach ( $moods as $m ) {
		$js['moods'][] = array( 'name' => $m['name'], 'img' => (string) wp_get_attachment_image_url( fdr_img_id( $m['image'] ), 'large' ) );
	}
	foreach ( $c['extras'] as $e ) {
		$js['extras'][ $e['key'] ] = (float) $e['price'];
	}

	$start = (float) $sizes[ $def ]['price'];

	ob_start();
	if ( function_exists( 'wc_print_notices' ) && ! is_admin() && WC()->session ) {
		wc_print_notices();
	}
	?>
	<div class="fdr-atelier" data-config="<?php echo esc_attr( wp_json_encode( $js ) ); ?>">
		<div class="fdr-a-side fdr-rv">
			<div class="fdr-a-prev"><?php echo wp_get_attachment_image( fdr_img_id( $moods[0]['image'] ), 'large', false, array( 'class' => 'fdr-a-img', 'alt' => 'Voorbeeld van de gekozen stemming' ) ); ?></div>
			<div class="fdr-a-sum">
				<div><p class="fdr-a-meta"><?php echo esc_html( $sizes[ $def ]['name'] ); ?></p><h4 class="fdr-a-name"><?php echo esc_html( $moods[0]['name'] ); ?></h4></div>
				<span class="fdr-a-total"><?php echo wp_kses_post( wc_price( $start ) ); ?></span>
			</div>
		</div>

		<form class="fdr-a-form fdr-rv" method="post" action="<?php echo esc_url( get_permalink() ? get_permalink() : home_url( '/' ) ); ?>#atelier">
			<input type="hidden" name="add-to-cart" value="<?php echo esc_attr( $pid ); ?>">
			<input type="hidden" name="product_id" value="<?php echo esc_attr( $pid ); ?>">
			<input type="hidden" name="quantity" value="1">

			<div class="fdr-a-head">
				<span class="fdr-label">Atelier op maat</span>
				<h2 class="fdr-display"><?php echo esc_html( $c['title_pre'] ); ?> <em><?php echo esc_html( $c['title_em'] ); ?></em></h2>
				<p><?php echo esc_html( $c['intro'] ); ?></p>
			</div>

			<fieldset class="fdr-step">
				<legend class="fdr-label">Formaat</legend>
				<div class="fdr-opts">
					<?php foreach ( $sizes as $i => $s ) : ?>
						<label class="fdr-opt"><input type="radio" name="fdr_size" value="<?php echo esc_attr( $i ); ?>" <?php checked( $i, $def ); ?>><b><?php echo esc_html( $s['name'] ); ?></b><small><?php echo wp_kses_post( wc_price( $s['price'] ) ); ?></small></label>
					<?php endforeach; ?>
				</div>
			</fieldset>

			<fieldset class="fdr-step">
				<legend class="fdr-label">Stemming</legend>
				<div class="fdr-moods">
					<?php foreach ( $moods as $i => $m ) : ?>
						<label class="fdr-mood"><input type="radio" name="fdr_mood" value="<?php echo esc_attr( $i ); ?>" <?php checked( $i, 0 ); ?>><?php echo wp_get_attachment_image( fdr_img_id( $m['image'] ), 'medium', false, array( 'alt' => '' ) ); ?><span><?php echo esc_html( $m['name'] ); ?></span></label>
					<?php endforeach; ?>
				</div>
			</fieldset>

			<fieldset class="fdr-step">
				<legend class="fdr-label">Afwerking</legend>
				<?php foreach ( $c['extras'] as $e ) : ?>
					<label class="fdr-extra">
						<span><?php echo esc_html( $e['name'] ); ?><small><?php echo esc_html( $e['note'] ); ?>, + <?php echo wp_kses_post( wc_price( $e['price'] ) ); ?></small></span>
						<input type="checkbox" name="fdr_extras[]" value="<?php echo esc_attr( $e['key'] ); ?>">
						<span class="fdr-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></span>
					</label>
				<?php endforeach; ?>
				<textarea class="fdr-field" name="fdr_card" rows="2" maxlength="160" placeholder="Handgeschreven kaart, jouw woorden (gratis)" aria-label="Tekst voor het kaartje"></textarea>
			</fieldset>

			<fieldset class="fdr-step">
				<legend class="fdr-label">Bezorgdag</legend>
				<div class="fdr-dates">
					<?php
					foreach ( $dates as $i => $ymd ) :
						$d = DateTimeImmutable::createFromFormat( '!Y-m-d', $ymd, wp_timezone() );
						?>
						<label class="fdr-date"><input type="radio" name="fdr_date" value="<?php echo esc_attr( $ymd ); ?>" <?php checked( $i, 0 ); ?>><small><?php echo esc_html( $dn[ (int) $d->format( 'w' ) ] ); ?></small><b><?php echo esc_html( $d->format( 'j' ) ); ?></b><small><?php echo esc_html( $mn[ (int) $d->format( 'n' ) - 1 ] ); ?></small></label>
					<?php endforeach; ?>
				</div>
			</fieldset>

			<button type="submit" class="fdr-btn fdr-a-submit">In winkelmand &middot; <span class="fdr-a-total"><?php echo wp_kses_post( wc_price( $start ) ); ?></span></button>
		</form>
	</div>
	<?php
	return ob_get_clean();
}

/* ---------- Cart ---------- */

add_filter(
	'woocommerce_add_to_cart_validation',
	function ( $passed, $product_id ) {
		if ( (int) $product_id !== fdr_atelier_pid() ) {
			return $passed;
		}
		$r = fdr_atelier_read_request();
		if ( is_wp_error( $r ) ) {
			wc_add_notice( $r->get_error_message(), 'error' );
			return false;
		}
		return $passed;
	},
	10,
	2
);

add_filter(
	'woocommerce_add_cart_item_data',
	function ( $data, $product_id ) {
		if ( (int) $product_id !== fdr_atelier_pid() ) {
			return $data;
		}
		$r = fdr_atelier_read_request();
		if ( ! is_wp_error( $r ) ) {
			$data['fdr_atelier'] = $r;
			$data['unique_key']  = md5( wp_json_encode( $r ) . microtime() );
		}
		return $data;
	},
	10,
	2
);

function fdr_atelier_apply_price( $item ) {
	if ( ! empty( $item['fdr_atelier']['price'] ) && isset( $item['data'] ) && is_object( $item['data'] ) ) {
		$item['data']->set_price( (float) $item['fdr_atelier']['price'] );
	}
	return $item;
}
add_filter( 'woocommerce_add_cart_item', 'fdr_atelier_apply_price', 20 );

add_filter(
	'woocommerce_get_cart_item_from_session',
	function ( $item, $values ) {
		if ( ! empty( $values['fdr_atelier'] ) ) {
			$item['fdr_atelier'] = $values['fdr_atelier'];
			$item                = fdr_atelier_apply_price( $item );
		}
		return $item;
	},
	20,
	2
);

add_action(
	'woocommerce_before_calculate_totals',
	function ( $cart ) {
		foreach ( $cart->get_cart() as $item ) {
			fdr_atelier_apply_price( $item );
		}
	},
	20
);

add_filter(
	'woocommerce_get_item_data',
	function ( $data, $item ) {
		if ( empty( $item['fdr_atelier'] ) ) {
			return $data;
		}
		$a      = $item['fdr_atelier'];
		$data[] = array( 'key' => 'Formaat', 'value' => $a['size'] );
		if ( ! empty( $a['extras'] ) ) {
			$data[] = array( 'key' => 'Afwerking', 'value' => implode( ', ', $a['extras'] ) );
		}
		if ( '' !== $a['card'] ) {
			$data[] = array( 'key' => 'Kaart', 'value' => $a['card'] );
		}
		$data[] = array( 'key' => 'Bezorgdag', 'value' => fdr_format_date( $a['date'] ) );
		return $data;
	},
	10,
	2
);

add_filter(
	'woocommerce_cart_item_name',
	function ( $name, $item ) {
		return empty( $item['fdr_atelier'] ) ? $name : esc_html( 'Atelier · ' . $item['fdr_atelier']['mood'] );
	},
	10,
	2
);

add_filter(
	'woocommerce_cart_item_thumbnail',
	function ( $thumb, $item ) {
		if ( empty( $item['fdr_atelier']['mood_image'] ) ) {
			return $thumb;
		}
		$img = wp_get_attachment_image( (int) $item['fdr_atelier']['mood_image'], 'woocommerce_thumbnail' );
		return $img ? $img : $thumb;
	},
	10,
	2
);

/* The atelier product is hidden from the catalogue; link cart lines back to the configurator. */
add_filter(
	'woocommerce_cart_item_permalink',
	function ( $link, $item ) {
		return empty( $item['fdr_atelier'] ) ? $link : home_url( '/#atelier' );
	},
	10,
	2
);

/* ---------- Order ---------- */

add_action(
	'woocommerce_checkout_create_order_line_item',
	function ( $line, $key, $values, $order ) {
		if ( empty( $values['fdr_atelier'] ) ) {
			return;
		}
		$a = $values['fdr_atelier'];
		$line->set_name( 'Atelier op maat · ' . $a['mood'] );
		$line->add_meta_data( 'Formaat', $a['size'] );
		$line->add_meta_data( 'Stemming', $a['mood'] );
		if ( ! empty( $a['extras'] ) ) {
			$line->add_meta_data( 'Afwerking', implode( ', ', $a['extras'] ) );
		}
		if ( '' !== $a['card'] ) {
			$line->add_meta_data( 'Kaart', $a['card'] );
		}
		$line->add_meta_data( 'Bezorgdag', fdr_format_date( $a['date'] ) );
		$line->add_meta_data( '_fdr_delivery_date', $a['date'] );

		$current = $order->get_meta( '_fdr_delivery_date' );
		if ( ! $current || $a['date'] < $current ) {
			$order->update_meta_data( '_fdr_delivery_date', $a['date'] );
		}
	},
	10,
	4
);
