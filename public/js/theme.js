// public/js/theme.js
// ========== APPLIQUER LE THÈME clair SUR TOUTES LES PAGES ==========

(function() {
    'use strict';
    
    console.log('🎨 Chargement du thème YURA...');
    
    try {
        const settings = JSON.parse(localStorage.getItem('yuraSettings') || '{}');
        console.log('📦 Paramètres:', settings);
        
        // ========== MODE CLAIR ==========
        if (settings.darkMode === false) {
            console.log('☀️ Mode clair activé');
            
            const lightStyle = document.createElement('style');
            lightStyle.id = '__yuraLight';
            lightStyle.textContent = `
                body { background: #f0f2f5 !important; color: #111 !important; }
                .sidebar { background: #fff !important; border-color: rgba(0,0,0,0.1) !important; }
                .top-bar { background: #fff !important; border-color: rgba(0,0,0,0.1) !important; }
                .main-content, .content { background: #f0f2f5 !important; }
                
                /* Cards */
                .card, .chart-card, .activity-card,
                .settings-card, .stat-card, .filter-bar, .table-wrap,
                .alert-card, .cam-card, .adv-panel, .map-card,
                .map-right, .cams-panel, .cam-thumbnail,
                .ctrl-card, .env-card, .hist-card, .status-row,
                .notifications-container, .alerts-group { 
                    background: #fff !important; 
                    border-color: rgba(0,0,0,0.08) !important; 
                }
                
                /* Text */
                .card-head, .alerts-group-title { border-color: rgba(0,0,0,0.06) !important; }
                .card-head-title, .setting-label, .alert-title,
                .date-day, .user-name-s, .logo-name, .card-title,
                .info-val, h1, h2, h3, .stat-value, .stat-num, .zone-name, .alert-mini-text, .activity-text { color: #111 !important; }
                
                .logo-sub, .user-role-s, .topbar-title, .info-lbl,
                .alert-msg, .details-cell, .date-time, .activity-time,
                .stat-label, .gris { color: #666 !important; }
                
                /* Nav */
                .nav-item { color: #555 !important; }
                .nav-item:hover { background: rgba(0,0,0,0.04) !important; color: #111 !important; }
                .nav-item.active { color: var(--rouge) !important; background: rgba(192,57,43,0.07) !important; }
                
                /* Inputs */
                .setting-select, .search-input, .filter-btn {
                    background: #f0f0f0 !important;
                    border-color: rgba(0,0,0,0.12) !important;
                    color: #111 !important;
                }
                
                .filter-btn { color: #555 !important; }
                .filter-btn.active { background: rgba(192,57,43,0.12) !important; color: var(--rouge) !important; }
                
                /* Toggle */
                .toggle-slider { background: #ddd !important; border-color: #ccc !important; }
                
                /* Rows */
                .info-row, .setting-row, .history-row, .zone-row, .activity-item { border-color: rgba(0,0,0,0.05) !important; }
                .history-row:hover { background: #f5f5f5 !important; }
                
                .mini-stat { background: #f5f5f5 !important; border-color: rgba(0,0,0,0.06) !important; }
                
                /* Table */
                .table-header { background: rgba(0,0,0,0.03) !important; }
                .table-header span { color: #666 !important; }
                .users-mini-table td, .users-mini-table th { border-color: rgba(0,0,0,0.05) !important; color: #333 !important; }
                
                /* Buttons */
                .act-btn, .del-btn, .card-action-btn, .pag-btn,
                .bottom-btn.secondary, .cam-ctrl-btn, .dpad-btn {
                    background: rgba(0,0,0,0.05) !important;
                    border-color: rgba(0,0,0,0.1) !important;
                    color: #555 !important;
                }
                
                .topbar-user { background: rgba(192,57,43,0.07) !important; border-color: rgba(192,57,43,0.2) !important; }
                .robot-badge { background: rgba(192,57,43,0.07) !important; border-color: rgba(192,57,43,0.25) !important; }
                .pag-info { color: #666 !important; }
                
                .page-header h1 { color: #111 !important; }
                .page-header p { color: #666 !important; }
            `;
            document.head.appendChild(lightStyle);
            console.log('✅ Mode clair appliqué');
        }
        
        // ========== THÈME COULEUR ==========
        if (settings.colorTheme === 'blue-black') {
            console.log('🔵 Thème bleu');
            document.documentElement.style.setProperty('--rouge', '#2563eb');
            document.documentElement.style.setProperty('--rouge-light', '#3b82f6');
            document.documentElement.style.setProperty('--border', 'rgba(37,99,235,0.18)');
        } else if (settings.colorTheme === 'green-black') {
            console.log('🟢 Thème vert');
            document.documentElement.style.setProperty('--rouge', '#16a34a');
            document.documentElement.style.setProperty('--rouge-light', '#22c55e');
            document.documentElement.style.setProperty('--border', 'rgba(22,163,74,0.18)');
        }
        
        // ========== ANIMATIONS ==========
        if (settings.animations === false) {
            console.log('❌ Animations désactivées');
            const noAnim = document.createElement('style');
            noAnim.id = '__noAnim';
            noAnim.textContent = '* { animation: none !important; transition: none !important; }';
            document.head.appendChild(noAnim);
        }
        
        console.log('✅ Thème chargé');
        
    } catch(e) {
        console.error('❌ Erreur thème:', e);
    }
})();

// Recharger la page si les paramètres sont modifiés dans un autre onglet
window.addEventListener('storage', function(e) {
    if (e.key === 'yuraSettings') {
        location.reload();
    }
});
