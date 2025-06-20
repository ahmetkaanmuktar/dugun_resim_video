// Etkinlik Fotoğraf Sistemi JavaScript Fonksiyonları

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    addEventListeners();
    checkMobileDevice();
});

// Uygulama başlatma
function initializeApp() {
    console.log('📸 Etkinlik Fotoğraf Sistemi başlatıldı');
    
    // Loading overlay'i gizle
    hideLoading();
    
    // Sayfa ziyaretini kaydet
    trackPageVisit();
    
    // QR kod bilgilerini kontrol et
    validateQRCode();
}

// Event listener'ları ekle
function addEventListeners() {
    // Upload butonu tıklama eventi
    const uploadBtn = document.querySelector('.upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleUploadClick);
    }
    
    // QR butonları
    const downloadBtn = document.querySelector('[onclick="downloadQR()"]');
    const shareBtn = document.querySelector('[onclick="shareQR()"]');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadQR);
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', shareQR);
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Upload butonu tıklama handler
function handleUploadClick(event) {
    event.preventDefault();
    
    showLoading('Google Drive\'a yönlendiriliyor...');
    
    // Analytics tracking
    trackEvent('upload_clicked', {
        event_name: getEventName(),
        timestamp: new Date().toISOString()
    });
    
    // Kısa bir gecikme sonra yönlendir
    setTimeout(() => {
        window.open(event.target.href, '_blank', 'noopener,noreferrer');
        hideLoading();
    }, 1000);
}

// QR kodu indir
function downloadQR() {
    try {
        const qrImage = document.querySelector('.qr-code');
        if (!qrImage) {
            showNotification('QR kod bulunamadı!', 'error');
            return;
        }
        
        // Canvas oluştur ve QR kodu çiz
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = qrImage.naturalWidth || 300;
        canvas.height = qrImage.naturalHeight || 300;
        
        ctx.drawImage(qrImage, 0, 0);
        
        // İndir
        const link = document.createElement('a');
        link.download = `qr-kod-${getEventName()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        showNotification('QR kod indirildi!', 'success');
        trackEvent('qr_downloaded');
        
    } catch (error) {
        console.error('QR kod indirme hatası:', error);
        showNotification('QR kod indirilemedi', 'error');
    }
}

// QR kodu paylaş
async function shareQR() {
    try {
        const currentUrl = window.location.href;
        const eventName = getEventName();
        
        // Web Share API destekleniyorsa kullan
        if (navigator.share) {
            await navigator.share({
                title: `📸 ${eventName} - Fotoğraf Yükleme`,
                text: `${eventName} etkinliği için fotoğraflarınızı yükleyin!`,
                url: currentUrl
            });
            
            showNotification('Paylaşım başarılı!', 'success');
            trackEvent('qr_shared', { method: 'native' });
            
        } else {
            // Fallback: URL'yi kopyala
            await navigator.clipboard.writeText(currentUrl);
            showNotification('Sayfa bağlantısı kopyalandı!', 'success');
            trackEvent('qr_shared', { method: 'clipboard' });
        }
        
    } catch (error) {
        console.error('Paylaşım hatası:', error);
        
        // Fallback: URL'yi seç
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showNotification('Bağlantı kopyalandı!', 'success');
    }
}

// Loading overlay göster
function showLoading(message = 'Yükleniyor...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');
    
    if (text) {
        text.textContent = message;
    }
    
    overlay.classList.add('show');
}

// Loading overlay gizle
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('show');
}

// Bildirim göster
function showNotification(message, type = 'info') {
    // Existing notification varsa kaldır
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Yeni notification oluştur
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Stil ekle
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Close butonu
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Otomatik kapanma
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Notification icon helper
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Notification color helper
function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

// Event name helper
function getEventName() {
    const title = document.querySelector('.header-title');
    return title ? title.textContent.trim() : 'Etkinlik';
}

// Mobile device kontrolü
function checkMobileDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
        
        // Mobile'da daha iyi UX için
        const uploadBtn = document.querySelector('.upload-btn');
        if (uploadBtn) {
            uploadBtn.style.fontSize = '1.3rem';
            uploadBtn.style.padding = '1.2rem 2.5rem';
        }
    }
}

// Keyboard navigation
function handleKeyboardNavigation(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        const focused = document.activeElement;
        
        if (focused.classList.contains('upload-btn')) {
            event.preventDefault();
            focused.click();
        }
        
        if (focused.classList.contains('qr-btn')) {
            event.preventDefault();
            focused.click();
        }
    }
}

// QR kod validasyonu
function validateQRCode() {
    const qrImage = document.querySelector('.qr-code');
    if (qrImage) {
        qrImage.addEventListener('error', () => {
            console.warn('QR kod yüklenemedi');
            qrImage.style.display = 'none';
            
            // Placeholder göster
            const placeholder = document.createElement('div');
            placeholder.innerHTML = `
                <div style="width: 200px; height: 200px; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #6b7280;">
                    <i class="fas fa-qrcode" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>QR kod oluşturuluyor...</p>
                </div>
            `;
            qrImage.parentNode.insertBefore(placeholder, qrImage);
        });
    }
}

// Analytics tracking
function trackEvent(eventName, eventData = {}) {
    try {
        // Google Analytics varsa
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
        
        // Console'da log
        console.log(`📊 Event: ${eventName}`, eventData);
        
        // Local storage'a kaydet (debugging için)
        const events = JSON.parse(localStorage.getItem('event_logs') || '[]');
        events.push({
            name: eventName,
            data: eventData,
            timestamp: new Date().toISOString()
        });
        
        // Son 100 eventi sakla
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('event_logs', JSON.stringify(events));
        
    } catch (error) {
        console.error('Analytics tracking hatası:', error);
    }
}

// Sayfa ziyareti tracking
function trackPageVisit() {
    trackEvent('page_view', {
        event_name: getEventName(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href
    });
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('JavaScript hatası:', event.error);
    
    trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Offline detection
window.addEventListener('online', function() {
    showNotification('İnternet bağlantısı yeniden kuruldu', 'success');
});

window.addEventListener('offline', function() {
    showNotification('İnternet bağlantısı kesildi', 'warning');
});

// CSS animasyonları için
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .mobile-device .upload-btn {
        transform: scale(1.05);
    }
`;

document.head.appendChild(style); 