/**
 * Progressive enhancement for sections/collection.liquid:
 * - collapses the filter panel on small screens (it is open without JS)
 * - submits the sort form on change and hides its fallback button
 */
(() => {
  function init(scope) {
    const filters = scope.querySelector('[data-filters]');
    if (filters && window.matchMedia('(max-width: 900px)').matches && !filters.dataset.enhanced) {
      filters.dataset.enhanced = 'true';
      filters.open = false;
    }

    const sort = scope.querySelector('.shop__sort');
    if (sort && !sort.dataset.enhanced) {
      sort.dataset.enhanced = 'true';
      sort.classList.add('is-enhanced');
      const select = sort.querySelector('select');
      if (select) select.addEventListener('change', () => sort.requestSubmit());
    }
  }

  init(document);
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
