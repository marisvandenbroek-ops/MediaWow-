<?php
/**
 * Shared helpers.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Attachment ID of an image imported by the installer, by its key (file name without .jpg).
 */
function fdr_img_id( $key ) {
	if ( is_numeric( $key ) ) {
		return (int) $key;
	}
	$map = get_option( 'fdr_images', array() );
	return isset( $map[ $key ] ) ? (int) $map[ $key ] : 0;
}

function fdr_arrow() {
	return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
}

function fdr_day_names() {
	return array( 'zo', 'ma', 'di', 'wo', 'do', 'vr', 'za' );
}

function fdr_month_names() {
	return array( 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec' );
}

/**
 * "vr 30 okt" style label for a Y-m-d date.
 */
function fdr_format_date( $ymd ) {
	$d = DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $ymd, wp_timezone() );
	if ( ! $d ) {
		return (string) $ymd;
	}
	return fdr_day_names()[ (int) $d->format( 'w' ) ] . ' ' . $d->format( 'j' ) . ' ' . fdr_month_names()[ (int) $d->format( 'n' ) - 1 ];
}

/* Prices without ",00" (€ 395 instead of € 395,00). */
add_filter( 'woocommerce_price_trim_zeros', '__return_true' );
