<?php
/**
 * Bezorgplanner: WooCommerce → Bezorgplanner lists atelier orders per delivery day.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		add_submenu_page( 'woocommerce', 'Bezorgplanner', 'Bezorgplanner', 'manage_woocommerce', 'fdr-planner', 'fdr_planner_page' );
	},
	60
);

function fdr_planner_page() {
	$tz    = wp_timezone();
	$from  = new DateTimeImmutable( 'today', $tz );
	$until = $from->modify( '+13 day' );

	$orders = wc_get_orders(
		array(
			'limit'        => 500,
			'status'       => array( 'wc-processing', 'wc-on-hold', 'wc-completed' ),
			'date_created' => '>' . $from->modify( '-90 day' )->getTimestamp(),
			'orderby'      => 'date',
			'order'        => 'ASC',
		)
	);

	$days = array();
	foreach ( $orders as $order ) {
		foreach ( $order->get_items() as $item ) {
			$date = $item->get_meta( '_fdr_delivery_date' );
			if ( ! $date || $date < $from->format( 'Y-m-d' ) || $date > $until->format( 'Y-m-d' ) ) {
				continue;
			}
			$days[ $date ][] = array( $order, $item );
		}
	}
	ksort( $days );
	?>
	<div class="wrap">
		<h1>Bezorgplanner</h1>
		<p>Arrangementen uit Atelier op maat voor de komende twee weken, per bezorgdag.</p>
		<?php if ( ! $days ) : ?>
			<p><em>Nog geen arrangementen ingepland.</em></p>
		<?php endif; ?>
		<?php foreach ( $days as $date => $rows ) : ?>
			<h2 style="margin-top:28px"><?php echo esc_html( ucfirst( fdr_format_date( $date ) ) ); ?> <span style="font-weight:400;color:#777">(<?php echo count( $rows ); ?>)</span></h2>
			<table class="widefat striped">
				<thead><tr><th>Bestelling</th><th>Klant en adres</th><th>Arrangement</th><th>Kaart</th><th>Status</th></tr></thead>
				<tbody>
				<?php
				foreach ( $rows as $row ) :
					list( $order, $item ) = $row;
					$addr                 = $order->get_formatted_shipping_address() ? $order->get_formatted_shipping_address() : $order->get_formatted_billing_address();
					?>
					<tr>
						<td><a href="<?php echo esc_url( $order->get_edit_order_url() ); ?>">#<?php echo esc_html( $order->get_order_number() ); ?></a></td>
						<td><?php echo wp_kses_post( $addr ); ?><br><?php echo esc_html( $order->get_billing_phone() ); ?></td>
						<td><strong><?php echo esc_html( $item->get_meta( 'Stemming' ) ); ?></strong> · <?php echo esc_html( $item->get_meta( 'Formaat' ) ); ?><?php echo $item->get_meta( 'Afwerking' ) ? '<br>' . esc_html( $item->get_meta( 'Afwerking' ) ) : ''; ?></td>
						<td><?php echo esc_html( $item->get_meta( 'Kaart' ) ); ?></td>
						<td><?php echo esc_html( wc_get_order_status_name( $order->get_status() ) ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php endforeach; ?>
	</div>
	<?php
}
