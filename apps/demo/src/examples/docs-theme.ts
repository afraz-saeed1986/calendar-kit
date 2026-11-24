/**
 * In the documentation site, a demo follows the light or dark theme of the site. The site sends it
 * with postMessage (same origin), so the demo does not look at the system preference.
 */
export function followDocsTheme(): void {
  // The styles of a demo for its own page must not change how an example looks in the site.
  const style = document.createElement('style');
  style.textContent =
    'pre { background: transparent !important; color: inherit !important; border: 0 !important; box-shadow: none !important; }';
  document.head.append(style);
  document.body.style.background = 'transparent';
  document.body.style.color = 'CanvasText';
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'calendrix-theme') return;
    const theme = event.data.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  });
}
