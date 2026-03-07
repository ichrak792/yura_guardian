document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const dateButtons = document.querySelectorAll('.date-btn');
    const statCards = document.querySelectorAll('.stat-card');
    const alertCards = document.querySelectorAll('.alert-card');
    const noAlertsMessage = document.querySelector('.no-alerts');

    console.log('✅ Chargé - Alertes:', alertCards.length);

    // ===== CLIC SUR LES STATS (filtrage automatique) =====
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const isDanger = this.classList.contains('danger-stat');
            const isWarning = this.classList.contains('warning-stat');
            const isInfo = this.classList.contains('info-stat');
            const isSuccess = this.classList.contains('success-stat');
            
            // Retirer active de tous les filtres
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Filtrer selon le type de stat
            if (isDanger) {
                filterByType('danger');
                document.querySelector('[data-filter="danger"]').classList.add('active');
            } else if (isWarning) {
                filterByType('warning');
                document.querySelector('[data-filter="warning"]').classList.add('active');
            } else if (isInfo) {
                filterByType('info');
                document.querySelector('[data-filter="info"]').classList.add('active');
            } else if (isSuccess) {
                filterByType('success');
                document.querySelector('[data-filter="success"]').classList.add('active');
            }
            
            // Effet visuel
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
        
        // Curseur pointer
        card.style.cursor = 'pointer';
    });

    // ===== FILTRES PAR TYPE =====
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            filterByType(filter);
        });
    });

    function filterByType(filter) {
        let visibleCount = 0;
        
        alertCards.forEach(card => {
            if (filter === 'all' || card.dataset.type === filter) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        updateNoAlertsMessage(visibleCount);
        console.log(`✅ ${visibleCount} alertes affichées (type: ${filter})`);
    }

    // ===== FILTRES PAR DATE =====
    dateButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            dateButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.dataset.period;
            filterByDate(period);
        });
    });

    function filterByDate(period) {
        let visibleCount = 0;

        alertCards.forEach(card => {
            const timeElement = card.querySelector('.alert-time');
            if (!timeElement) {
                card.style.display = 'flex';
                visibleCount++;
                return;
            }
            
            const timeText = timeElement.textContent;
            const timeMatch = timeText.match(/(\d+)\s*(minute|heure|jour|semaine|mois)/i);
            
            let showCard = false;

            if (period === 'all') {
                showCard = true;
            } else if (timeMatch) {
                const value = parseInt(timeMatch[1]);
                const unit = timeMatch[2].toLowerCase();
                
                if (period === 'today') {
                    // Moins de 24 heures
                    if (unit === 'minute' || (unit === 'heure' && value < 24)) {
                        showCard = true;
                    }
                } else if (period === 'week') {
                    // Moins de 7 jours
                    if (unit === 'minute' || unit === 'heure' || (unit === 'jour' && value <= 7)) {
                        showCard = true;
                    }
                } else if (period === 'month') {
                    // Moins de 30 jours
                    if (unit === 'minute' || unit === 'heure' || (unit === 'jour' && value <= 30)) {
                        showCard = true;
                    }
                }
            }

            if (showCard) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        updateNoAlertsMessage(visibleCount);
        updateSystemStatus();
        console.log(`✅ ${visibleCount} alertes affichées (période: ${period})`);
    }

    // ===== METTRE À JOUR L'ÉTAT DU SYSTÈME =====
    function updateSystemStatus() {
        // Compter les alertes critiques visibles
        const visibleDangerAlerts = Array.from(alertCards).filter(card => {
            return card.dataset.type === 'danger' && card.style.display !== 'none';
        });

        const successCard = document.querySelector('.success-stat');
        const successIcon = successCard.querySelector('.stat-icon');
        const successTitle = successCard.querySelector('p');
        
        if (visibleDangerAlerts.length > 0) {
            // Système ANORMAL
            successCard.style.borderLeftColor = '#dc2626';
            successCard.style.background = 'linear-gradient(to right, #fee, white)';
            successIcon.textContent = '⚠️';
            successTitle.textContent = 'Anormal';
            successCard.querySelector('h3').textContent = visibleDangerAlerts.length;
        } else {
            // Système NORMAL
            successCard.style.borderLeftColor = '#10b981';
            successCard.style.background = 'white';
            successIcon.textContent = '✅';
            successTitle.textContent = 'OK';
            
            const allSuccess = Array.from(alertCards).filter(c => c.dataset.type === 'success' && c.style.display !== 'none');
            successCard.querySelector('h3').textContent = allSuccess.length;
        }
    }

    // ===== BARRE DE RECHERCHE =====
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            let visibleCount = 0;
            
            alertCards.forEach(card => {
                const title = card.querySelector('.alert-title').textContent.toLowerCase();
                const message = card.querySelector('.alert-message').textContent.toLowerCase();
                const zone = card.querySelector('.alert-zone').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || message.includes(searchTerm) || zone.includes(searchTerm)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            if (clearSearch) {
                clearSearch.style.display = searchTerm ? 'block' : 'none';
            }
            
            updateNoAlertsMessage(visibleCount);
            updateSystemStatus();
        });

        if (clearSearch) {
            clearSearch.addEventListener('click', function() {
                searchInput.value = '';
                clearSearch.style.display = 'none';
                alertCards.forEach(card => card.style.display = 'flex');
                updateNoAlertsMessage(alertCards.length);
                updateSystemStatus();
            });
        }
    }

    // ===== BOUTON RÉSOUDRE =====
    document.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.alert-card');
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0.3';
            card.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                card.remove();
                checkIfEmpty();
                updateSystemStatus();
            }, 300);
        });
    });

    // ===== BOUTON SUPPRIMER =====
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!confirm('Supprimer cette alerte ?')) return;
            
            const card = this.closest('.alert-card');
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(100px)';
            
            setTimeout(() => {
                card.remove();
                checkIfEmpty();
                updateSystemStatus();
            }, 300);
        });
    });

    // ===== BOUTON VOIR =====
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.alert-card');
            const title = card.querySelector('.alert-title').textContent;
            const message = card.querySelector('.alert-message').textContent;
            const zone = card.querySelector('.alert-zone').textContent;
            const value = card.querySelector('.alert-value').textContent;
            
            alert(`📋 DÉTAILS\n\n${title}\n\n${message}\n\n${zone}\n${value}`);
        });
    });

    function updateNoAlertsMessage(count) {
        if (count === 0) {
            noAlertsMessage.style.display = 'block';
        } else {
            noAlertsMessage.style.display = 'none';
        }
    }

    function checkIfEmpty() {
        const visible = Array.from(alertCards).filter(c => {
            return document.body.contains(c) && c.style.display !== 'none';
        });
        updateNoAlertsMessage(visible.length);
    }

    // Animation au chargement
    alertCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // État initial du système
    updateSystemStatus();
    
    console.log('✅ Tout est prêt!');
});
