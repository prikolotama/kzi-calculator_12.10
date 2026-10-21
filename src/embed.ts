/** Только высота содержимого; ответы и реквизиты родительской странице не передаются. */
export function initEmbed(root: HTMLElement): void {
  if (window.parent === window) return;
  document.documentElement.dataset.embedded = 'true';
  const applyViewport = (top: number, height: number) => {
    if (!Number.isFinite(top) || !Number.isFinite(height) || top < 0 || height <= 24) return;
    document.documentElement.style.setProperty('--embed-top', `${top}px`);
    document.documentElement.style.setProperty('--embed-height', `${height}px`);
  };
  let parentViewport = false;
  let parentOrigin: string | null = null;
  try {
    parentOrigin = new URL(document.referrer).origin;
  } catch {
    /* Без referrer используем геометрию iframe. */
  }
  window.addEventListener('message', event => {
    if (!parentOrigin || event.source !== window.parent || event.origin !== parentOrigin) return;
    const data = event.data;
    if (data?.type !== 'checku:viewport' || data.version !== 1) return;
    if (
      typeof data.top !== 'number' ||
      typeof data.height !== 'number' ||
      !Number.isFinite(data.top) ||
      !Number.isFinite(data.height) ||
      data.top < 0 ||
      data.height <= 24
    )
      return;
    parentViewport = true;
    applyViewport(data.top, data.height);
  });
  // Видимая область с учетом отсечения родительской страницей, включая другой домен.
  const visible = new IntersectionObserver(entries => {
    if (parentViewport) return;
    const rect = entries[0]?.intersectionRect;
    if (rect && rect.height > 24) applyViewport(Math.max(0, rect.top), rect.height);
  });
  const refreshViewport = () => {
    if (parentViewport) return;
    visible.disconnect();
    visible.observe(root);
  };
  document.addEventListener('pointerdown', refreshViewport, true);
  document.addEventListener('click', refreshViewport, true);
  document.addEventListener('focusin', refreshViewport, true);
  window.addEventListener('resize', refreshViewport);
  refreshViewport();
  let lastHeight = 0;
  let frame = 0;
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const style = getComputedStyle(document.body);
      const height = Math.ceil(root.getBoundingClientRect().height + parseFloat(style.paddingBottom));
      if (height > 0 && height !== lastHeight) {
        lastHeight = height;
        window.parent.postMessage({ type: 'checku:resize', version: 1, height }, '*');
      }
    });
  };
  new ResizeObserver(measure).observe(root);
  window.addEventListener('resize', measure);
  document.fonts.ready.then(measure);
  measure();
}
