/**
 * Cursor companion: a small dot that follows the mouse and grows into a
 * labelled circle over elements with [data-cursor-label] (e.g. artworks).
 * Only for fine pointers and when motion is allowed; purely decorative.
 */
(() => {
  const finePointer = window.matchMedia('(pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches || document.body.classList.contains('motion-off')) return;

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  dot.append(label);
  document.body.append(dot);

  let x = -100;
  let y = -100;
  let frame = 0;

  const render = () => {
    frame = 0;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  document.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(render);
    },
    { passive: true }
  );

  document.addEventListener('pointerover', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-cursor-label]') : null;
    dot.classList.toggle('is-view', Boolean(target));
    label.textContent = target ? target.getAttribute('data-cursor-label') : '';
  });

  document.addEventListener('pointerleave', () => {
    x = -100;
    y = -100;
    render();
  });
})();
