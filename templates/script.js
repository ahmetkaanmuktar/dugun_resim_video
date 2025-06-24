// Etkinlik Fotoğraf Sistemi JavaScript Fonksiyonları
const API_BASE_URL = 'http://localhost:5000';
const CACHE_BUSTER = '?v=' + new Date().getTime(); // Cache buster

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    addEventListeners();
    checkMobileDevice();
    loadGallery();
    
    // Cache temizleme bildirimi
    showNotification('🔄 Template yenilendi! Cache temizleniyor...', 'info');
    console.log('🔄 Cache buster aktif: ' + CACHE_BUSTER);
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
    
    // Backend bağlantısını test et
    testBackendConnection();
}

// Backend bağlantı testi
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/${CACHE_BUSTER}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('✅ Backend bağlantısı başarılı:', data);
        
        // Backend'in storage tipini kontrol et
        if (data.storage === 'local_with_drive_backup') {
            showNotification('✅ Sistem hazır! Dosyalar siteye yükleniyor (Drive yönlendirmesi yok).', 'success');
        }
    } catch (error) {
        console.error('❌ Backend henüz aktif değil:', error);
        showNotification('⚠️ Backend henüz aktif değil. Drive yönlendirmesi engellenmiştir.', 'warning');
    }
}

// Event listener'ları ekle
function addEventListeners() {
    // Upload form setup
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    
    if (form && fileInput) {
        form.addEventListener('submit', handleFileUpload);
        fileInput.addEventListener('change', handleFileSelect);
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

// Dosya seçimi handler
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
        
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            showNotification('Dosya boyutu 50MB\'dan küçük olmalıdır!', 'error');
            event.target.value = '';
            return;
        }
        
        showNotification(`Dosya seçildi: ${file.name} (${fileSize} MB)`, 'success');
    }
}

// Dosya yükleme handler
async function handleFileUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Lütfen bir dosya seçin!', 'error');
        return;
    }
    
    const uploadBtn = document.querySelector('.upload-btn');
    const originalText = uploadBtn.innerHTML;
    
    try {
        // Upload butonunu disable et
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        
        // FormData oluştur
        const formData = new FormData();
        formData.append('file', file);
        
        // Dosyayı backend'e yükle
        const response = await uploadFileWithProgress(formData);
        
        if (response.success) {
            showNotification(`✅ Dosya başarıyla yüklendi! ${response.drive_status === 'backed_up' ? '(Drive\'a da yedeklendi)' : '(Sitede saklanıyor)'}`, 'success');
            fileInput.value = ''; // Input'u temizle
            loadGallery(); // Galeriyi yenile
        } else {
            throw new Error(response.error || 'Yükleme başarısız');
        }
        
    } catch (error) {
        console.error('Upload hatası:', error);
        showNotification('❌ Dosya yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        // Upload butonunu restore et
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
    }
}

// Progress ile dosya yükleme
async function uploadFileWithProgress(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Response handling
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Sunucu yanıtı işlenemedi'));
                }
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    reject(new Error(errorResponse.error || 'Sunucu hatası'));
                } catch (error) {
                    reject(new Error(`Sunucu hatası: ${xhr.status}`));
                }
            }
        });
        
        xhr.addEventListener('error', () => {
            reject(new Error('Ağ hatası oluştu'));
        });
        
        // Request gönder
        xhr.open('POST', `${API_BASE_URL}/api/upload${CACHE_BUSTER}`);
        xhr.send(formData);
    });
}

// Galeri yükleme
async function loadGallery() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/gallery${CACHE_BUSTER}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const galleryContainer = document.getElementById('galleryGrid') || document.getElementById('gallery');
        if (!galleryContainer) return;
        
        if (data.success && data.files && data.files.length > 0) {
            displayGallery(data.files, galleryContainer);
        } else {
            displayEmptyGallery(galleryContainer);
        }
    } catch (error) {
        console.error('⚠️ Backend bağlantısı yok - galeri gösterilmiyor:', error);
        const galleryContainer = document.getElementById('galleryGrid') || document.getElementById('gallery');
        if (galleryContainer) {
            galleryContainer.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-server" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h3>Backend Bağlantısı Yok</h3>
                    <p>Sunucu henüz aktif değil. Lütfen admin ile iletişime geçin.</p>
                </div>
            `;
        }
    }
}

// Galeri görüntüleme
function displayGallery(files, container) {
    container.innerHTML = files.map(file => {
        const isImage = file.mimeType && file.mimeType.startsWith('image/');
        const isVideo = file.mimeType && file.mimeType.startsWith('video/');
        const fileUrl = file.webViewLink || file.url;
        const thumbnailUrl = file.thumbnailLink || file.url;
        const date = formatDate(file.createdTime);
        
        return `
            <div class="gallery-item" onclick="openFileModal('${fileUrl}')">
                <div class="gallery-item-inner">
                    ${isImage ? `
                        <img src="${thumbnailUrl}" alt="${file.name}" loading="lazy">
                    ` : isVideo ? `
                        <div class="video-thumbnail">
                            <img src="${thumbnailUrl}" alt="${file.name}" loading="lazy">
                            <i class="fas fa-play-circle"></i>
                        </div>
                    ` : `
                        <div class="file-icon">
                            <i class="fas fa-file"></i>
                        </div>
                    `}
                    <div class="gallery-item-info">
                        <span class="gallery-item-name">${file.name}</span>
                        <span class="gallery-item-date">${date}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Boş galeri göster
function displayEmptyGallery(container) {
    container.innerHTML = `
        <div class="empty-gallery">
            <i class="fas fa-images"></i>
            <h3>Henüz Fotoğraf Yok</h3>
            <p>İlk fotoğrafı yükleyen siz olun! Yukarıdaki yükleme bölümünü kullanarak anılarınızı paylaşabilirsiniz.</p>
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openFileModal(fileUrl) {
    // Drive yönlendirmesi yerine lightbox kullan
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    
    // Cache buster ekle
    const fileUrlWithCacheBuster = fileUrl.includes('?') ? 
        fileUrl + '&cb=' + new Date().getTime() : 
        fileUrl + '?cb=' + new Date().getTime();
    
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            <img src="${fileUrlWithCacheBuster}" alt="Görüntü" style="max-width: 90%; max-height: 90%; border-radius: 8px;">
        </div>
    `;
    
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    lightbox.onclick = (e) => {
        if (e.target === lightbox) lightbox.remove();
    };
    
    document.body.appendChild(lightbox);
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