/*
 * Instellingen voor de rooster-app.
 *
 * Laat supabaseUrl en supabaseAnonKey leeg om de app in DEMO-modus te draaien
 * (gegevens blijven dan alleen in de browser). Vul ze in om de echte, gedeelde
 * database te gebruiken — zie README.md voor de stappen.
 */
window.ROOSTER_CONFIG = {
  appName: 'Lilou Rooster',
  bedrijf: 'Lilou',

  // Logo's (laat leeg voor een letter-logo)
  logo: 'brand/lilou-wordmark-rood.png',       // in de menubalk (lichte modus)
  logoDark: 'brand/lilou-wordmark-creme.png',  // in de menubalk (donkere modus)
  logoAuth: 'brand/lilou-logo-creme.png',      // op het inlogscherm (op rood)

  // Supabase (Project Settings → API)
  supabaseUrl: 'https://vmpxdljsadibnjqzfmno.supabase.co',
  supabaseAnonKey: 'sb_publishable_2vUfWwcgq8EOeVd4klWzag_CeQ8vJ91',   // openbare sleutel (mag in de app staan)

  // Pushmeldingen: publieke VAPID-sleutel (zie README → Pushmeldingen)
  vapidPublicKey: '',

  // Functies / posities waarvoor je inplant
  posities: ['Bediening', 'Bar', 'Keuken', 'Afwas', 'Shiftleader'],

  // Vensters voor toeslaguren in de urenexport (pas aan aan jullie arbeidsvoorwaarden)
  toeslagen: { avondVan: '20:00', avondTot: '24:00', nachtVan: '00:00', nachtTot: '06:00' },

  // Extra vrije dagen naast de wettelijke feestdagen, bv. { '2026-12-31': 'Oudejaarsdag' }
  extraFeestdagen: {},

  // Snelkeuze-diensten in het inplanvenster
  diensten: [
    { label: 'Ochtend', start: '09:00', end: '15:00', pauze: 30 },
    { label: 'Middag', start: '12:00', end: '18:00', pauze: 30 },
    { label: 'Avond', start: '17:00', end: '23:00', pauze: 30 },
    { label: 'Hele dag', start: '10:00', end: '22:00', pauze: 60 },
  ],
};
