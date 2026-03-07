(function() {
    const LIGHT_CSS = `
        body, .sidebar, .main-content, .top-bar,
        .settings-card, .table-wrap, .filter-bar,
        .alert-card, .stat-card, .card, .content,
        .alerts-group, .table-header, .history-row,
        .bottom-actions, .pagination {
            background: #f4f5f7 !important;
            color: #111 !important;
            border-color: rgba(0,0,0,0.1) !important;
        }

        .sidebar {
            background: #ffffff !important;
            border-right: 1px solid rgba(0,0,0,0.1) !important;
        }

        .top-bar {
            background: #ffffff !important;
            border-bottom: 1px solid rgba(0,0,0,0.1) !important;
        }

        .settings-card, .table-wrap, .filter-bar,
        .alert-card, .stat-card {
            background: #ffffff !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
        }

        .history-row:hover {
            background: #f0f0f0 !important;
        }

        .nav-item { color: #444 !important; }
        .nav-item:hover { background: rgba(0,0,0,0.05) !important; color: #111 !important; }
        .nav-item.active { background: rgba(192,57,43,0.08) !important; color: #c0392b !important; }

        .topbar-title, .nav-label, .stat-label,
        .alert-msg, .details-cell, .date-time,
        .info-lbl, .setting-sub, .user-role-s,
        .logo-sub { color: #666 !important; }

        .alert-title, .stat-num, .date-day,
        .user-name-s, .logo-name, .card-head-title,
        .alert-card .alert-title, h1, h2, h3 { color: #111 !important; }

        .table-header { background: rgba(0,0,0,0.03) !important; }
        .table-header span { color: #666 !important; }

        .search-input, .setting-select {
            background: #f0f0f0 !important;
            border: 1px solid rgba(0,0,0,0.12) !important;
            color: #111 !important;
        }

        .filter-btn {
            background: rgba(0,0,0,0.05) !important;
            border: 1px solid rgba(0,0,0,0.1) !important;
            color: #555 !important;
        }
        .filter-btn.active {
            background: rgba(192,57,43,0.12) !important;
            border-color: #c0392b !important;
            color: #c0392b !important;
        }

        .toggle-slider {
            background: #ddd !important;
            border-color: #ccc !important;
        }

        .act-btn, .del-btn, .card-action-btn, .pag-btn {
            background: rgba(0,0,0,0.05) !important;
            border-color: rgba(0,0,0,0.1) !important;
            color: #555 !important;
        }

        .robot-badge {
            background: rgba(192,57,43,0.08) !important;
            border-color: rgba(192,57,43,0.3) !important;
        }

        .stat-icon-box {
            background: rgba(192,57,43,0.08) !important;
        }

        .alerts-group-title { color: #555 !important; }
        .alert-meta span { color: #777 !important; }

        .info-row { border-color: rgba(0,0,0,0.06) !important; }
        .setting-row { border-color: rgba(0,0,0,0.06) !important; }

        .bottom-btn.secondary {
            background: rgba(0,0,0,0.05) !important;
            border-color: rgba(0,0,0,0.1) !important;
            color: #555 !important;
        }

        .user-av, .user-av-sm {
            background: linear-gradient(135deg, #c0392b, #7b241c) !important;
            color: #fff !important;
        }

        .topbar-user {
            background: rgba(192,57,43,0.08) !important;
            color: #c0392b !important;
        }

        /* cam-card, map specifics */
        .cam-card, .cam-view, .map-card,
        .map-right, .adv-panel, .cams-panel,
        .cam-thumbnail, .env-card, .ctrl-card,
        .status-row, .hist-card {
            background: #ffffff !important;
            border-color: rgba(0,0,0,0.08) !important;
            color: #111 !important;
        }
        .cam-info-bar, .overlay-bottom {
            background: rgba(255,255,255,0.9) !important;
            color: #333 !important;
        }
        .dpad-btn {
            background: #f0f0f0 !important;
            border-color: rgba(0,0,0,0.1) !important;
            color: #333 !important;
        }
    `;

    function applyTheme(s) {
        const root = document.documentElement;

        // COLOR THEME (applies in both modes)
        if (s.colorTheme === 'blue-black') {
            root.style.setProperty('--rouge', '#2563eb');
            root.style.setProperty('--rouge-light', '#3b82f6');
            root.style.setProperty('--border', 'rgba(37,99,235,0.18)');
        } else if (s.colorTheme === 'green-black') {
            root.style.setProperty('--rouge', '#16a34a');
            root.style.setProperty('--rouge-light', '#22c55e');
            root.style.setProperty('--border', 'rgba(22,163,74,0.18)');
        } else {
            root.style.setProperty('--rouge', '#c0392b');
            root.style.setProperty('--rouge-light', '#e74c3c');
            root.style.setProperty('--border', 'rgba(192,57,43,0.18)');
        }

        // DARK / LIGHT
        let lightStyle = document.getElementById('__yuraLight');
        if (s.darkMode === false) {
            if (!lightStyle) {
                lightStyle = document.createElement('style');
                lightStyle.id = '__yuraLight';
                document.head.appendChild(lightStyle);
            }
            lightStyle.textContent = LIGHT_CSS;
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            if (lightStyle) lightStyle.remove();
            document.documentElement.removeAttribute('data-theme');
        }

        // ANIMATIONS
        let noAnim = document.getElementById('__noAnim');
        if (s.animations === false) {
            if (!noAnim) {
                noAnim = document.createElement('style');
                noAnim.id = '__noAnim';
                noAnim.textContent = '* { animation: none !important; transition: none !important; }';
                document.head.appendChild(noAnim);
            }
        } else {
            if (noAnim) noAnim.remove();
        }
    }

    // Apply immediately on page load — NO flash
    try {
        const saved = localStorage.getItem('yuraSettings');
        if (saved) applyTheme(JSON.parse(saved));
    } catch(e) {}

    window.YuraTheme = { apply: applyTheme };
})();