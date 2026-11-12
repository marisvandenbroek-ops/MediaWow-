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

  // Supabase (Project Settings → API)
  supabaseUrl: '',
  supabaseAnonKey: '',

  // Functies / posities waarvoor je inplant
  posities: ['Bediening', 'Bar', 'Keuken', 'Afwas', 'Shiftleader'],

  // Snelkeuze-diensten in het inplanvenster
  diensten: [
    { label: 'Ochtend', start: '09:00', end: '15:00', pauze: 30 },
    { label: 'Middag', start: '12:00', end: '18:00', pauze: 30 },
    { label: 'Avond', start: '17:00', end: '23:00', pauze: 30 },
    { label: 'Hele dag', start: '10:00', end: '22:00', pauze: 60 },
  ],
};
