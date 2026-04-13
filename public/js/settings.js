document.addEventListener('DOMContentLoaded', function() {
    // Slider vitesse robot
    const robotSpeed = document.getElementById('robotSpeed');
    if (robotSpeed) {
        const speedValue = robotSpeed.nextElementSibling;
        robotSpeed.addEventListener('input', function() {
            speedValue.textContent = this.value;
        });
    }
    
    // ⭐ AJOUTER CET EVENT LISTENER POUR LE BOUTON ENREGISTRER
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
        console.log('✅ Bouton Enregistrer connecté!');
    } else {
        console.error('❌ Bouton save-btn introuvable!');
    }
    
    // Bouton Réinitialiser (si il existe)
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    console.log('⚙️ Paramètres chargés');
});

function saveSettings() {
    console.log('💾 Fonction saveSettings() appelée!');
    
    const settings = {
        soundAlerts: document.getElementById('soundAlerts')?.checked || false,
        pushNotifs: document.getElementById('pushNotifs')?.checked || false,
        criticalOnly: document.getElementById('criticalOnly')?.checked || false,
        autoMode: document.getElementById('autoMode')?.checked || false,
        robotSpeed: document.getElementById('robotSpeed')?.value || 50,
        motionSensitivity: document.getElementById('motionSensitivity')?.value || 'medium',
        autoRecord: document.getElementById('autoRecord')?.checked || false,
        videoQuality: document.getElementById('videoQuality')?.value || 'high',
        nightVision: document.getElementById('nightVision')?.checked || false,
        twoFactor: document.getElementById('twoFactor')?.checked || false,
        sessionTimeout: document.getElementById('sessionTimeout')?.value || 30
    };
    
    console.log('📦 Paramètres à enregistrer:', settings);
    
    fetch('/dashboard/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(data => {
        console.log('📨 Réponse serveur:', data);
        if (data.success) {
            showNotification('✅ Paramètres sauvegardés avec succès!', 'success');
        } else {
            showNotification('❌ Erreur lors de la sauvegarde', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('❌ Erreur de connexion au serveur', 'error');
    });
}

function resetSettings() {
    if (confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) {
        location.reload();
    }
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: ${type === 'success' ? '#10b981' : '#dc2626'};
        color: white;
        padding: 15px 30px;
        border-radius: 12px;
        font-weight: bold;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.5s ease;
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);