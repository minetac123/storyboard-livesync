/**
 * Generuje spolehlivou veřejnou URL pro mobilní fotoaparát.
 * Pokud je workstation otevřená lokálně (localhost), QR kód pro mobil
 * automaticky ukazuje na veřejnou GitHub Pages adresu, aby telefon neměl problém s připojením.
 */
export function getMobileScanUrl(roomId: string, panelId: string = 'panel-1'): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      const origin = window.location.origin;
      const path = window.location.pathname;
      const basePath = (origin.includes('github.io') || path.includes('/storyboard-livesync'))
        ? '/storyboard-livesync'
        : '';
      return `${origin}${basePath}/scan/?room=${encodeURIComponent(roomId)}&panel=${encodeURIComponent(panelId)}`;
    }
  }

  // Výchozí veřejná HTTPS adresa na GitHub Pages
  return `https://minetac123.github.io/storyboard-livesync/scan/?room=${encodeURIComponent(roomId)}&panel=${encodeURIComponent(panelId)}`;
}
