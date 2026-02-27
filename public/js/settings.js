document.addEventListener('DOMContentLoaded', function() {
    // Slider vitesse robot
    const robotSpeed = document.getElementById('robotSpeed');
    const speedValue = robotSpeed.nextElementSibling;
    
    robotSpeed.addEventListener('input', function() {
        speedValue.textContent = this.value;
    });
    
    console.log('⚙️ Paramètres chargés');
});

function saveSettings() {
    const settings = {
        soundAlerts: document.getElementById('soundAlerts').checked,
        pushNotifs: document.getElementById('pushNotifs').checked,
        criticalOnly: document.getElementById('criticalOnly').checked,
        autoMode: document.getElementById('autoMode').checked,
        robotSpeed: document.getElementById('robotSpeed').value,
        motionSensitivity: document.getElementById('motionSensitivity').value,
        autoRecord: document.getElementById('autoRecord').checked,
        videoQuality: document.getElementById('videoQuality').value,
        nightVision: document.getElementById('nightVision').checked,
        twoFactor: document.getElementById('twoFactor').checked,
        sessionTimeout: document.getElementById('sessionTimeout').value
    };
    
    fetch('/dashboard/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('✅ Paramètres sauvegardés avec succès!', 'success');
        } else {
            showNotification('❌ Erreur lors de la sauvegarde', 'error');
        }
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