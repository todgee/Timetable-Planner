// theme-loader.js - Apply saved theme/logo from localStorage.
// Include after js/shared.js on any page that should be themed.

(function() {
    'use strict';

    function applyTheme() {
        if (typeof loadTheme !== 'function') return;

        const theme = loadTheme();
        const root = document.documentElement;

        if (theme.primary) {
            root.style.setProperty('--primary', theme.primary);
            root.style.setProperty('--primary-dark', darkenHex(theme.primary, 15));
        }
        if (theme.primaryLight) {
            root.style.setProperty('--primary-light', theme.primaryLight);
        }
        if (theme.accent) {
            root.style.setProperty('--accent', theme.accent);
        }
    }

    function darkenHex(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    function applyLogo() {
        if (typeof loadLogo !== 'function') return;

        const logoSettings = loadLogo();
        if (!logoSettings || !logoSettings.url) return;

        const header = document.querySelector('header');
        if (!header) return;

        let container = document.getElementById('app-logo-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'app-logo-container';
            container.style.cssText = `
                margin-bottom: 1rem;
                display: flex;
                justify-content: ${justify(logoSettings.position)};
            `;
            header.insertBefore(container, header.firstChild);
        }

        let img = container.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            img.id = 'app-logo';
            img.alt = 'Organization Logo';
            container.appendChild(img);
        }

        const sizeMap = { small: '80px', medium: '100px', large: '120px' };
        img.src = logoSettings.url;
        img.style.maxHeight = sizeMap[logoSettings.size] || '100px';
        img.style.maxWidth = '300px';
        img.style.objectFit = 'contain';
    }

    function justify(position) {
        switch (position) {
            case 'header-center': return 'center';
            case 'header-right': return 'flex-end';
            case 'header-left':
            default: return 'flex-start';
        }
    }

    function run() {
        applyTheme();
        applyLogo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
