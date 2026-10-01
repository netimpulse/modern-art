/**
 * <ma-showroom>: progressive enhancement for sections/showroom.liquid.
 * - Adds .is-3d (CSS-3D room) unless the visitor prefers reduced motion or the
 *   theme setting turned animations off. The wall scrolls natively; there is no
 *   wheel or drag hijacking.
 * - Arrow keys move focus between works; focused works scroll into view.
 * - Clicking a work opens a <dialog> filled from its <template>; ?werk=<handle>
 *   opens it on load and is kept in the URL while the dialog is open.
 */
(() => {
  if (customElements.get('ma-showroom')) return;

  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('motion-off');

  class MaShowroom extends HTMLElement {
    constructor() {
      super();
      this.onScroll = this.onScroll.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.onFocusIn = this.onFocusIn.bind(this);
      this.onDialogClose = this.onDialogClose.bind(this);
      this.onDialogClick = this.onDialogClick.bind(this);
      this.onStep = (event) => this.step(Number(event.currentTarget.dataset.roomStep));
      this.frame = 0;
      this.trigger = null;
    }

    connectedCallback() {
      this.scroller = this.querySelector('[data-showroom-scroller]');
      this.list = this.querySelector('[data-showroom-list]');
      this.dialog = this.querySelector('[data-showroom-dialog]');
      this.dialogContent = this.querySelector('[data-showroom-dialog-content]');
      this.progress = this.querySelector('[data-room-progress]');
      this.controls = this.querySelector('[data-showroom-controls]');
      if (!this.scroller || !this.list) return;

      if (!reducedMotion()) {
        this.classList.add('is-3d');
        if (this.controls) this.controls.hidden = false;
      }

      this.scroller.addEventListener('scroll', this.onScroll, { passive: true });
      this.list.addEventListener('click', this.onClick);
      this.list.addEventListener('keydown', this.onKeydown);
      this.list.addEventListener('focusin', this.onFocusIn);
      this.querySelectorAll('[data-room-step]').forEach((button) => button.addEventListener('click', this.onStep));
      if (this.dialog) {
        this.dialog.addEventListener('close', this.onDialogClose);
        this.dialog.addEventListener('click', this.onDialogClick);
      }
      this.onScroll();
      this.openFromUrl();
    }

    disconnectedCallback() {
      if (this.scroller) this.scroller.removeEventListener('scroll', this.onScroll);
      if (this.list) {
        this.list.removeEventListener('click', this.onClick);
        this.list.removeEventListener('keydown', this.onKeydown);
        this.list.removeEventListener('focusin', this.onFocusIn);
      }
      this.querySelectorAll('[data-room-step]').forEach((button) => button.removeEventListener('click', this.onStep));
      if (this.dialog) {
        this.dialog.removeEventListener('close', this.onDialogClose);
        this.dialog.removeEventListener('click', this.onDialogClick);
        if (this.dialog.open) this.dialog.close();
      }
      cancelAnimationFrame(this.frame);
    }

    get works() {
      return Array.from(this.list.querySelectorAll('[data-werk]'));
    }

    onScroll() {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        const max = this.scroller.scrollWidth - this.scroller.clientWidth;
        const ratio = max > 0 ? this.scroller.scrollLeft / max : 0;
        this.style.setProperty('--room-progress', ratio.toFixed(4));
        this.style.setProperty('--floor-x', `${-this.scroller.scrollLeft}px`);
      });
    }

    step(direction) {
      this.scroller.scrollBy({
        left: direction * this.scroller.clientWidth * 0.6,
        behavior: reducedMotion() ? 'auto' : 'smooth',
      });
    }

    onKeydown(event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const works = this.works;
      const index = works.indexOf(document.activeElement);
      if (index === -1) return;
      const next = works[index + (event.key === 'ArrowRight' ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      next.focus();
    }

    onFocusIn(event) {
      const work = event.target.closest('[data-werk]');
      if (!work || !this.classList.contains('is-3d')) return;
      work.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    onClick(event) {
      const work = event.target.closest('[data-werk]');
      if (!work || !this.dialog) return;
      // Keep native behaviour for "open in new tab" and similar.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      if (this.open(work.dataset.werk, work)) event.preventDefault();
    }

    templateFor(handle) {
      const id = `ShowroomDetail-${this.dataset.sectionId}-${handle}`;
      return this.querySelector(`template#${CSS.escape(id)}`);
    }

    open(handle, trigger) {
      const template = this.templateFor(handle);
      if (!template || !this.dialog || typeof this.dialog.showModal !== 'function') return false;
      this.dialogContent.replaceChildren(template.content.cloneNode(true));
      const title = this.dialogContent.querySelector('[id^="ShowroomDialogTitle-"]');
      if (title) this.dialog.setAttribute('aria-labelledby', title.id);
      this.trigger = trigger || this.works.find((w) => w.dataset.werk === handle) || null;
      if (!this.dialog.open) this.dialog.showModal();
      this.setUrlParam(handle);
      return true;
    }

    openFromUrl() {
      const handle = new URLSearchParams(window.location.search).get('werk');
      if (!handle) return;
      if (!this.open(handle)) this.setUrlParam(null);
    }

    onDialogClick(event) {
      // A click on the backdrop targets the dialog element itself.
      if (event.target === this.dialog) this.dialog.close();
    }

    onDialogClose() {
      this.setUrlParam(null);
      this.dialogContent.replaceChildren();
      if (this.trigger) this.trigger.focus();
      this.trigger = null;
    }

    setUrlParam(handle) {
      const url = new URL(window.location.href);
      if (handle) url.searchParams.set('werk', handle);
      else url.searchParams.delete('werk');
      window.history.replaceState(window.history.state, '', url);
    }
  }

  customElements.define('ma-showroom', MaShowroom);

  document.addEventListener('shopify:section:unload', (event) => {
    const dialog = event.target.querySelector('[data-showroom-dialog]');
    if (dialog && dialog.open) dialog.close();
  });
})();
