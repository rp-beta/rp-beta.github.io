'use strict';

(() => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const toggle = header.querySelector('#navigation-toggle');
    const menu = header.querySelector('#mobile-menu');
    function setMenuOpen(open) {
        menu.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    toggle.addEventListener('click', () => setMenuOpen(menu.hidden));
    header.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
        setMenuOpen(false);
        if (link.hasAttribute('data-contact-link') && document.getElementById('author-modal') && typeof window.toggleAuthorModal === 'function') {
            window.toggleAuthorModal(event);
        }
    }));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !menu.hidden) {
            setMenuOpen(false);
            toggle.focus();
        }
    });
    document.addEventListener('click', event => {
        if (!header.contains(event.target)) setMenuOpen(false);
    });
    window.matchMedia('(min-width: 768px)').addEventListener('change', event => {
        if (event.matches) setMenuOpen(false);
    });
})();
