<?php
/**
 * Admin screens: Fiori di Rose → Installatie and Fiori di Rose → Atelier op maat.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		add_menu_page( 'Fiori di Rose', 'Fiori di Rose', 'manage_options', 'fdr-install', 'fdr_admin_install_page', 'dashicons-palmtree', 56 );
		add_submenu_page( 'fdr-install', 'Installatie', 'Installatie', 'manage_options', 'fdr-install', 'fdr_admin_install_page' );
		add_submenu_page( 'fdr-install', 'Atelier op maat', 'Atelier op maat', 'manage_woocommerce', 'fdr-atelier', 'fdr_admin_atelier_page' );
	}
);

function fdr_admin_install_page() {
	$log = array();
	if ( isset( $_POST['fdr_install'] ) && check_admin_referer( 'fdr_install' ) ) {
		$ready = ! in_array( false, fdr_install_requirements(), true );
		$log   = $ready ? fdr_install_run( ! empty( $_POST['fdr_rebuild_home'] ) ) : array( 'Niet alle voorwaarden zijn in orde. Zie de lijst hierboven.' );
	}
	$done = get_option( 'fdr_installed' );
	?>
	<div class="wrap">
		<h1>Fiori di Rose installeren</h1>
		<p>Deze knop zet de hele website neer: foto’s, categorieën, producten, Atelier op maat, verzending, de homepage in Elementor en het menu. Je kunt hem veilig opnieuw draaien; bestaande producten en foto’s blijven staan.</p>
		<h2>Voorwaarden</h2>
		<ul>
			<?php foreach ( fdr_install_requirements() as $label => $ok ) : ?>
				<li><?php echo $ok ? '✅' : '❌'; ?> <?php echo esc_html( $label ); ?></li>
			<?php endforeach; ?>
		</ul>
		<form method="post">
			<?php wp_nonce_field( 'fdr_install' ); ?>
			<p><label><input type="checkbox" name="fdr_rebuild_home" value="1" <?php checked( ! $done ); ?>> Homepage opnieuw opbouwen (overschrijft wijzigingen die je in Elementor op de homepage hebt gemaakt)</label></p>
			<p><button class="button button-primary button-hero" name="fdr_install" value="1"><?php echo $done ? 'Opnieuw installeren / herstellen' : 'Installeer de website'; ?></button></p>
		</form>
		<?php if ( $log ) : ?>
			<h2>Resultaat</h2>
			<ol><?php foreach ( $log as $line ) : ?><li><?php echo esc_html( $line ); ?></li><?php endforeach; ?></ol>
			<p><a class="button" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank">Bekijk de website</a></p>
		<?php elseif ( $done ) : ?>
			<p>Laatst geïnstalleerd op <?php echo esc_html( wp_date( 'j F Y, H:i', (int) $done ) ); ?>.</p>
		<?php endif; ?>
	</div>
	<?php
}

function fdr_admin_atelier_page() {
	$c = fdr_atelier_config();

	if ( isset( $_POST['fdr_atelier_save'] ) && check_admin_referer( 'fdr_atelier' ) ) {
		$in = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized per field below.
		foreach ( $c['sizes'] as $i => $s ) {
			$c['sizes'][ $i ]['name']  = sanitize_text_field( $in['size_name'][ $i ] ?? $s['name'] );
			$c['sizes'][ $i ]['price'] = (float) str_replace( ',', '.', $in['size_price'][ $i ] ?? $s['price'] );
		}
		foreach ( $c['moods'] as $i => $m ) {
			$c['moods'][ $i ]['name']  = sanitize_text_field( $in['mood_name'][ $i ] ?? $m['name'] );
			$img                       = absint( $in['mood_image'][ $i ] ?? 0 );
			$c['moods'][ $i ]['image'] = $img ? $img : $m['image'];
		}
		foreach ( $c['extras'] as $i => $e ) {
			$c['extras'][ $i ]['name']  = sanitize_text_field( $in['extra_name'][ $i ] ?? $e['name'] );
			$c['extras'][ $i ]['note']  = sanitize_text_field( $in['extra_note'][ $i ] ?? $e['note'] );
			$c['extras'][ $i ]['price'] = (float) str_replace( ',', '.', $in['extra_price'][ $i ] ?? $e['price'] );
		}
		$c['title_pre']   = sanitize_text_field( $in['title_pre'] ?? $c['title_pre'] );
		$c['title_em']    = sanitize_text_field( $in['title_em'] ?? $c['title_em'] );
		$c['intro']       = sanitize_textarea_field( $in['intro'] ?? $c['intro'] );
		$c['lead_days']   = max( 0, absint( $in['lead_days'] ?? 1 ) );
		$c['days_ahead']  = min( 30, max( 1, absint( $in['days_ahead'] ?? 8 ) ) );
		$c['closed_days'] = array_map( 'absint', (array) ( $in['closed_days'] ?? array() ) );
		update_option( 'fdr_atelier_config', $c );
		echo '<div class="notice notice-success"><p>Opgeslagen.</p></div>';
	}
	?>
	<div class="wrap">
		<h1>Atelier op maat</h1>
		<form method="post">
			<?php wp_nonce_field( 'fdr_atelier' ); ?>
			<h2>Tekst</h2>
			<table class="form-table">
				<tr><th>Kop</th><td><input name="title_pre" value="<?php echo esc_attr( $c['title_pre'] ); ?>" class="regular-text"> <input name="title_em" value="<?php echo esc_attr( $c['title_em'] ); ?>" class="regular-text"><p class="description">Het tweede deel staat schuin, in neon.</p></td></tr>
				<tr><th>Introductie</th><td><textarea name="intro" rows="3" class="large-text"><?php echo esc_textarea( $c['intro'] ); ?></textarea></td></tr>
			</table>
			<h2>Formaten</h2>
			<table class="form-table">
				<?php foreach ( $c['sizes'] as $i => $s ) : ?>
					<tr><th>Formaat <?php echo (int) $i + 1; ?></th><td><input name="size_name[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( $s['name'] ); ?>"> € <input name="size_price[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( $s['price'] ); ?>" size="6"></td></tr>
				<?php endforeach; ?>
			</table>
			<h2>Stemmingen</h2>
			<table class="form-table">
				<?php foreach ( $c['moods'] as $i => $m ) : ?>
					<tr><th>Stemming <?php echo (int) $i + 1; ?></th><td>
						<?php echo wp_get_attachment_image( fdr_img_id( $m['image'] ), array( 60, 60 ), false, array( 'style' => 'vertical-align:middle;margin-right:8px' ) ); ?>
						<input name="mood_name[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( $m['name'] ); ?>">
						Foto-ID <input name="mood_image[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( fdr_img_id( $m['image'] ) ); ?>" size="6">
						<p class="description">Het ID van een foto zie je in Media, in het adres van de foto (post=123).</p>
					</td></tr>
				<?php endforeach; ?>
			</table>
			<h2>Afwerking</h2>
			<table class="form-table">
				<?php foreach ( $c['extras'] as $i => $e ) : ?>
					<tr><th><?php echo esc_html( $e['name'] ); ?></th><td><input name="extra_name[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( $e['name'] ); ?>"> <input name="extra_note[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( $e['note'] ); ?>" class="regular-text"> € <input name="extra_price[<?php echo (int) $i; ?>]" value="<?php echo esc_attr( $e['price'] ); ?>" size="6"></td></tr>
				<?php endforeach; ?>
			</table>
			<h2>Bezorgdagen</h2>
			<table class="form-table">
				<tr><th>Eerste bezorgdag</th><td><input name="lead_days" value="<?php echo esc_attr( $c['lead_days'] ); ?>" size="3"> dag(en) na vandaag</td></tr>
				<tr><th>Aantal dagen om uit te kiezen</th><td><input name="days_ahead" value="<?php echo esc_attr( $c['days_ahead'] ); ?>" size="3"></td></tr>
				<tr><th>Geen bezorging op</th><td>
					<?php foreach ( array( 1 => 'maandag', 2 => 'dinsdag', 3 => 'woensdag', 4 => 'donderdag', 5 => 'vrijdag', 6 => 'zaterdag', 0 => 'zondag' ) as $n => $label ) : ?>
						<label style="margin-right:12px"><input type="checkbox" name="closed_days[]" value="<?php echo (int) $n; ?>" <?php checked( in_array( $n, array_map( 'intval', $c['closed_days'] ), true ) ); ?>> <?php echo esc_html( $label ); ?></label>
					<?php endforeach; ?>
				</td></tr>
			</table>
			<p><button class="button button-primary" name="fdr_atelier_save" value="1">Opslaan</button></p>
		</form>
	</div>
	<?php
}
