let stream = null;
let isRecording = false;
let recordingTime = 0;
let recordingInterval = null;
let durationInterval = null;
let startTime = null;
let snapshotCounter = 0;

// Démarrer la caméra
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 1920, 
                height: 1080 
            }, 
            audio: false 
        });
        
        const video = document.getElementById('cameraFeed');
        const placeholder = document.getElementById('placeholder');
        const overlay = document.getElementById('overlay');
        
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        overlay.style.display = 'flex';
        
        // Activer les boutons
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('recordBtn').disabled = false;
        document.getElementById('snapshotBtn').disabled = false;
        
        // Démarrer le chronomètre
        startTime = Date.now();
        durationInterval = setInterval(updateDuration, 1000);
        
        // Démarrer le timestamp
        setInterval(updateTimestamp, 1000);
        updateTimestamp();
        
        console.log('📹 Caméra démarrée');
        showNotification('📹 Caméra activée', 'success');
        
    } catch (error) {
        console.error('Erreur caméra:', error);
        showNotification('❌ Impossible d\'accéder à la caméra', 'error');
    }
}

// Arrêter la caméra
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    const video = document.getElementById('cameraFeed');
    const placeholder = document.getElementById('placeholder');
    const overlay = document.getElementById('overlay');
    
    video.style.display = 'none';
    placeholder.style.display = 'flex';
    overlay.style.display = 'none';
    
    // Désactiver les boutons
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('recordBtn').disabled = true;
    document.getElementById('snapshotBtn').disabled = true;
    
    // Arrêter le chronomètre
    clearInterval(durationInterval);
    document.getElementById('duration').textContent = '00:00:00';
    
    // Arrêter l'enregistrement si actif
    if (isRecording) {
        toggleRecord();
    }
    
    console.log('📹 Caméra arrêtée');
    showNotification('⏹️ Caméra désactivée', 'info');
}

// Toggle enregistrement
function toggleRecord() {
    const btn = document.getElementById('recordBtn');
    const indicator = document.getElementById('recIndicator');
    
    if (!isRecording) {
        // Démarrer l'enregistrement
        isRecording = true;
        recordingTime = 0;
        btn.classList.add('recording');
        btn.innerHTML = '⏹️ Arrêter enregistrement';
        indicator.style.display = 'flex';
        
        recordingInterval = setInterval(() => {
            recordingTime++;
            const mins = Math.floor(recordingTime / 60);
            const secs = recordingTime % 60;
            document.getElementById('recTime').textContent = 
                `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 1000);
        
        showNotification('⏺️ Enregistrement démarré', 'success');
    } else {
        // Arrêter l'enregistrement
        isRecording = false;
        btn.classList.remove('recording');
        btn.innerHTML = '⏺️ Enregistrer';
        indicator.style.display = 'none';
        clearInterval(recordingInterval);
        
        showNotification('✅ Enregistrement sauvegardé', 'success');
    }
}

// Prendre une capture
function takeSnapshot() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('snapshotCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/png');
    
    // Ajouter à la galerie
    addToGallery(imageData);
    
    // Incrémenter le compteur
    snapshotCounter++;
    document.getElementById('snapshotCount').textContent = snapshotCounter;
    
    // Effet flash
    const view = document.getElementById('cameraView');
    view.style.animation = 'flash 0.3s ease';
    setTimeout(() => view.style.animation = '', 300);
    
    showNotification('📸 Capture enregistrée', 'success');
}

// Ajouter capture à la galerie
function addToGallery(imageData) {
    const gallery = document.getElementById('gallery');
    const grid = document.getElementById('galleryGrid');
    
    gallery.style.display = 'block';
    
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `<img src="${imageData}" alt="Capture">`;
    item.onclick = () => window.open(imageData);
    
    grid.prepend(item);
}

// Plein écran
function toggleFullscreen() {
    const view = document.getElementById('cameraView');
    if (!document.fullscreenElement) {
        view.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Mettre à jour les filtres
function updateFilters() {
    const video = document.getElementById('cameraFeed');
    const brightness = document.getElementById('brightness').value;
    const contrast = document.getElementById('contrast').value;
    const sharpness = document.getElementById('sharpness').value;
    
    video.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    
    // Mettre à jour les valeurs affichées
    document.querySelectorAll('.range-val').forEach((el, i) => {
        el.textContent = [brightness, contrast, sharpness][i] + '%';
    });
}

// Toggle vision nocturne
function toggleNightVision() {
    const video = document.getElementById('cameraFeed');
    const isActive = document.getElementById('nightMode').checked;
    
    if (isActive) {
        video.style.filter = 'grayscale(100%) contrast(150%) brightness(120%)';
        showNotification('🌙 Vision nocturne activée', 'info');
    } else {
        updateFilters();
    }
}

// Toggle grille
function toggleGrid() {
    const grid = document.getElementById('gridLines');
    const isActive = document.getElementById('gridToggle').checked;
    grid.style.display = isActive ? 'block' : 'none';
}

// Toggle détection de mouvement
function toggleMotionDetection() {
    const isActive = document.getElementById('motionDetect').checked;
    showNotification(
        isActive ? '🎯 Détection activée' : '🎯 Détection désactivée', 
        'info'
    );
}

// Mettre à jour le timestamp
function updateTimestamp() {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR');
    document.getElementById('timestamp').textContent = time;
}

// Mettre à jour la durée
function updateDuration() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    
    document.getElementById('duration').textContent = 
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Changer résolution
function changeResolution() {
    if (stream) {
        showNotification('🔄 Résolution changée', 'info');
    }
}

// Notification
function showNotification(message, type) {
    const colors = {
        success: '#10b981',
        error: '#dc2626',
        info: '#2563eb'
    };
    
    const notif = document.createElement('div');
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: ${colors[type]};
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

// Animation flash
const style = document.createElement('style');
style.textContent = `
    @keyframes flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; background: white; }
    }
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('📹 Module caméra chargé');