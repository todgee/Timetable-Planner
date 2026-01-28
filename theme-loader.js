// theme-loader.js - Load and apply theme settings across all pages
// Include this script on every page that needs theming

(function() {
    'use strict';

    // Load theme colors from Firebase
    function loadAndApplyTheme() {
        if (typeof database === 'undefined') {
            console.log('Firebase not loaded yet, waiting...');
            setTimeout(loadAndApplyTheme, 100);
            return;
        }

        database.ref('config/theme').once('value').then((snapshot) => {
            const theme = snapshot.val();
            
            if (theme) {
                console.log('Applying theme:', theme);
                applyThemeColors(theme);
            } else {
                console.log('No custom theme found, using defaults');
            }
        }).catch((error) => {
            console.error('Error loading theme:', error);
        });
    }

    // Apply theme colors to CSS variables
    function applyThemeColors(theme) {
        const root = document.documentElement;
        
        if (theme.primary) {
            root.style.setProperty('--primary', theme.primary);
        }
        if (theme.primaryLight) {
            root.style.setProperty('--primary-light', theme.primaryLight);
        }
        if (theme.accent) {
            root.style.setProperty('--accent', theme.accent);
        }

        // Calculate dark variant if not provided
        if (theme.primary) {
            const primaryDark = darkenColor(theme.primary, 15);
            root.style.setProperty('--primary-dark', primaryDark);
        }

        console.log('✅ Theme applied successfully');
    }

    // Darken a hex color by a percentage
    function darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Load and apply logo
    function loadAndApplyLogo() {
        if (typeof database === 'undefined') {
            setTimeout(loadAndApplyLogo, 100);
            return;
        }

        database.ref('config/logo').once('value').then((snapshot) => {
            const logoSettings = snapshot.val();
            
            if (logoSettings && logoSettings.data) {
                console.log('Applying logo:', logoSettings);
                applyLogo(logoSettings);
            } else {
                console.log('No logo configured');
            }
        }).catch((error) => {
            console.error('Error loading logo:', error);
        });
    }

    // Apply logo to page header
    function applyLogo(logoSettings) {
        // Find or create logo container
        let logoContainer = document.getElementById('app-logo-container');
        
        if (!logoContainer) {
            // Create logo container in header
            const header = document.querySelector('header');
            if (!header) return;

            logoContainer = document.createElement('div');
            logoContainer.id = 'app-logo-container';
            logoContainer.style.cssText = `
                margin-bottom: 1rem;
                display: flex;
                justify-content: ${getLogoJustification(logoSettings.position)};
            `;

            // Insert at the beginning of header
            header.insertBefore(logoContainer, header.firstChild);
        }

        // Create or update logo image
        let logoImg = logoContainer.querySelector('img');
        if (!logoImg) {
            logoImg = document.createElement('img');
            logoImg.id = 'app-logo';
            logoImg.alt = 'Organization Logo';
            logoContainer.appendChild(logoImg);
        }

        // Apply logo data and settings
        logoImg.src = logoSettings.data || logoSettings.url || 'logo.jpeg';
        
        // Apply size
        const sizeMap = {
            small: '80px',
            medium: '100px',
            large: '120px'
        };
        logoImg.style.maxHeight = sizeMap[logoSettings.size] || '100px';
        logoImg.style.maxWidth = '300px';
        logoImg.style.objectFit = 'contain';

        console.log('✅ Logo applied successfully');
    }

    function getLogoJustification(position) {
        switch(position) {
            case 'header-left': return 'flex-start';
            case 'header-center': return 'center';
            case 'header-right': return 'flex-end';
            default: return 'flex-start';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadAndApplyTheme();
            loadAndApplyLogo();
        });
    } else {
        loadAndApplyTheme();
        loadAndApplyLogo();
    }

    console.log('✅ Theme loader initialized');
})();
