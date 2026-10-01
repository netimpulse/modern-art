/**
 * <art-buy-box>: progressive enhancement for snippets/art-buy-box.liquid.
 * Intercepts the product form, adds the item via the AJAX Cart API, shows a
 * status message (422 description from Shopify on errors) and updates every
 * [data-cart-count] / [data-cart-count-label] in the header.
 * Without JS the form posts to /cart/add as usual.
 */
(() => {
  if (customElements.get('art-buy-box')) return;

  const root = () => (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  async function refreshCartCount() {
    const res = await fetch(`${root()}cart.js`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const cart = await res.json();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(cart.item_count);
      el.classList.add('is-bumped');
      window.setTimeout(() => el.classList.remove('is-bumped'), 350);
    });
    document.querySelectorAll('[data-cart-count-label]').forEach((el) => {
      const template = el.getAttribute('data-template');
      if (template) el.textContent = template.replace('{count}', String(cart.item_count));
    });
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: cart.item_count } }));
  }

  class ArtBuyBox extends HTMLElement {
    constructor() {
      super();
      this.onSubmit = this.onSubmit.bind(this);
      this.busy = false;
    }

    connectedCallback() {
      this.form = this.querySelector('form[data-buy-form]');
      this.status = this.querySelector('[data-buy-status]');
      if (this.form) this.form.addEventListener('submit', this.onSubmit);
    }

    disconnectedCallback() {
      if (this.form) this.form.removeEventListener('submit', this.onSubmit);
    }

    setStatus(type, text, withCartLink) {
      if (!this.status) return;
      this.status.replaceChildren();
      this.status.dataset.type = type;
      if (!text) return;
      this.status.append(document.createTextNode(text));
      if (withCartLink) {
        const link = document.createElement('a');
        link.href = this.dataset.cartUrl || `${root()}cart`;
        link.className = 'link';
        link.textContent = this.dataset.cartLinkText || '';
        this.status.append(document.createTextNode(' '), link);
      }
    }

    async onSubmit(event) {
      event.preventDefault();
      if (this.busy) return;
      const button = this.form.querySelector('[data-buy-submit]');
      const data = new FormData(this.form);
      const id = Number(data.get('id'));
      const quantity = Math.max(1, Number(data.get('quantity') || 1));

      this.busy = true;
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      this.setStatus('pending', '');

      try {
        const res = await fetch(`${root()}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id, quantity }] }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = typeof body.description === 'string' && body.description ? body.description : this.dataset.errorText;
          this.setStatus('error', message, false);
          return;
        }
        this.setStatus('success', this.dataset.successText, true);
        // The item is in the cart; a failing count refresh must not turn this into an error.
        refreshCartCount().catch(() => {});
      } catch (error) {
        this.setStatus('error', this.dataset.errorText, false);
      } finally {
        this.busy = false;
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      }
    }
  }

  customElements.define('art-buy-box', ArtBuyBox);
})();
