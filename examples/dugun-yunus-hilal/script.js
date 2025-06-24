// Düğün Fotoğraf Yükleme Sistemi - Heroku Backend
const API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';

// Offline mode flag
let OFFLINE_MODE = false;

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎉 Düğün Fotoğraf Sistemi başlatılıyor...');
    initializeApp();
    setupUploadForm();
    loadGallery();
    setupDragAndDrop();
    
    // Cache temizleme bildirimi
    showNotification('🔄 Sistem başlatılıyor...', 'info');
});

// Uygulama başlatma
function initializeApp() {
    console.log('📸 Sistem kontrolleri yapılıyor...');
    testBackendConnection();
}

// Backend bağlantı testi
async function testBackendConnection() {
    try {
        console.log('🔄 Backend bağlantı testi başlatılıyor...');
        const response = await fetch(`${API_BASE_URL}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Backend bağlantısı başarılı:', data);
        OFFLINE_MODE = false;
        
        // Backend'in storage tipini kontrol et
        if (data.storage === 'local_with_drive_backup') {
            showNotification('✅ Sistem hazır! Fotoğraf ve videolarınızı yükleyebilirsiniz.', 'success');
            
            // Upload butonunu aktif et
            const uploadBtn = document.querySelector('.upload-btn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Yükle';
                uploadBtn.style.opacity = '1';
            }
        }
    } catch (error) {
        console.error('❌ Backend bağlantı hatası:', error);
        OFFLINE_MODE = true;
        
        showNotification('⚠️ Sunucu bağlantısı kurulamıyor. Lütfen sayfayı yenileyin.', 'error');
        
        // Offline mode için upload butonunu disable et
        const uploadBtn = document.querySelector('.upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Bağlantı Hatası';
            uploadBtn.style.opacity = '0.6';
        }
        
        // 30 saniye sonra tekrar dene
        setTimeout(() => {
            console.log('🔄 Backend tekrar kontrol ediliyor...');
            testBackendConnection();
        }, 30000);
    }
}

// Upload form setup
function setupUploadForm() {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    
    if (form && fileInput) {
        form.addEventListener('submit', handleFileUpload);
        fileInput.addEventListener('change', handleFileSelect);
    } else {
        console.error('❌ Upload form elemanları bulunamadı!');
    }
}

// Dosya seçimi handler
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
        
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            showNotification('❌ Dosya boyutu 50MB\'dan küçük olmalıdır!', 'error');
            event.target.value = '';
            return;
        }
        
        if (OFFLINE_MODE) {
            showNotification(`📁 Dosya seçildi: ${file.name} (${fileSize} MB) - Sunucu bağlantısı bekleniyor...`, 'warning');
        } else {
            showNotification(`📁 Dosya seçildi: ${file.name} (${fileSize} MB) - Yüklemeye hazır!`, 'success');
        }
    }
}

// Dosya yükleme handler
async function handleFileUpload(event) {
    event.preventDefault();
    
    if (OFFLINE_MODE) {
        showNotification('❌ Sunucu bağlantısı yok. Lütfen bekleyin ve tekrar deneyin.', 'error');
        return;
    }
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('📁 Lütfen bir dosya seçin!', 'error');
        return;
    }
    
    const uploadBtn = document.querySelector('.upload-btn');
    const originalText = uploadBtn.innerHTML;
    
    try {
        console.log('🚀 Dosya yükleme başlatılıyor:', file.name);
        
        // Upload butonunu disable et
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        
        // FormData oluştur
        const formData = new FormData();
        formData.append('file', file);
        
        // Progress bar göster
        showUploadProgress(0, 'Yükleme başlatılıyor...');
        
        // Minimum 5 saniye progress bar göster
        const uploadPromise = uploadFileWithProgress(formData);
        const minTimePromise = new Promise(resolve => setTimeout(resolve, 5000));
        
        const [response] = await Promise.all([uploadPromise, minTimePromise]);
        
        if (response.success) {
            showUploadProgress(100, 'Tamamlandı!');
            setTimeout(() => {
                hideUploadProgress();
                showNotification(`✅ Dosya başarıyla yüklendi! ${response.drive_status === 'backed_up' ? '(Google Drive\'a yedeklendi)' : '(Sunucuda saklanıyor)'}`, 'success');
                fileInput.value = ''; // Input'u temizle
                loadGallery(); // Galeriyi yenile
            }, 1000);
        } else {
            throw new Error(response.error || 'Yükleme başarısız');
        }
        
    } catch (error) {
        console.error('❌ Upload hatası:', error);
        hideUploadProgress();
        showNotification('❌ Dosya yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        // Upload butonunu restore et
        setTimeout(() => {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
        }, 1000);
    }
}

// Progress ile dosya yükleme
async function uploadFileWithProgress(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Progress tracking
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                showUploadProgress(percentComplete, `Yükleniyor... ${Math.round(percentComplete)}%`);
            }
        });
        
        // Response handling
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('✅ Sunucu yanıtı:', response);
                    resolve(response);
                } catch (error) {
                    console.error('❌ JSON parse hatası:', error);
                    reject(new Error('Sunucu yanıtı işlenemedi'));
                }
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    console.error('❌ Sunucu hatası:', errorResponse);
                    reject(new Error(errorResponse.error || 'Sunucu hatası'));
                } catch (error) {
                    reject(new Error(`Sunucu hatası: ${xhr.status}`));
                }
            }
        });
        
        xhr.addEventListener('error', () => {
            console.error('❌ Ağ hatası');
            reject(new Error('Ağ hatası oluştu'));
        });
        
        // Request gönder - Cache buster kullanma
        xhr.open('POST', `${API_BASE_URL}/api/upload`);
        xhr.send(formData);
    });
}

// Gelişmiş upload progress göster
function showUploadProgress(percent, message = '') {
    let progressModal = document.getElementById('uploadProgressModal');
    
    if (!progressModal) {
        progressModal = document.createElement('div');
        progressModal.id = 'uploadProgressModal';
        progressModal.innerHTML = `
            <div class="progress-modal-overlay">
                <div class="progress-modal-content">
                    <div class="progress-header">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <h3>Dosya Yükleniyor</h3>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                            <div class="progress-text">0%</div>
                        </div>
                        <div class="progress-message">Hazırlanıyor...</div>
                    </div>
                    <div class="progress-animation">
                        <div class="upload-icon">
                            <i class="fas fa-file-image"></i>
                        </div>
                        <div class="upload-arrow">
                            <i class="fas fa-arrow-up"></i>
                        </div>
                        <div class="cloud-icon">
                            <i class="fas fa-cloud"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(progressModal);
    }
    
    const progressFill = progressModal.querySelector('.progress-fill');
    const progressText = progressModal.querySelector('.progress-text');
    const progressMessage = progressModal.querySelector('.progress-message');
    
    progressFill.style.width = `${Math.min(percent, 100)}%`;
    progressText.textContent = `${Math.round(Math.min(percent, 100))}%`;
    progressMessage.textContent = message;
    
    // Renk değişimi
    if (percent >= 100) {
        progressFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
        progressModal.querySelector('.progress-header i').className = 'fas fa-check-circle';
        progressModal.querySelector('.progress-header h3').textContent = 'Yükleme Tamamlandı';
    } else if (percent >= 50) {
        progressFill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
    }
    
    progressModal.style.display = 'flex';
}

// Upload progress gizle
function hideUploadProgress() {
    const progressModal = document.getElementById('uploadProgressModal');
    if (progressModal) {
        progressModal.style.display = 'none';
    }
}

// Galeri yükleme
async function loadGallery() {
    try {
        if (OFFLINE_MODE) {
            displayOfflineGallery();
            return;
        }
        
        console.log('📷 Galeri yükleniyor...');
        const response = await fetch(`${API_BASE_URL}/api/gallery`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success && data.files) {
            console.log(`✅ ${data.files.length} dosya bulundu`);
            displayGallery(data.files);
        } else {
            displayEmptyGallery();
        }
    } catch (error) {
        console.error('⚠️ Galeri yüklenemedi:', error);
        displayOfflineGallery();
    }
}

// Offline galeri göster
function displayOfflineGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    
    gallery.innerHTML = `
        <div class="empty-gallery">
            <i class="fas fa-clock" style="font-size: 48px; margin-bottom: 15px; color: #f59e0b;"></i>
            <h3>Backend Hazırlanıyor</h3>
            <p>Render.com'da backend uyandırılıyor. 2-3 dakika bekleyin...</p>
            <div style="margin-top: 20px;">
                <button onclick="testBackendConnection()" class="retry-btn">
                    <i class="fas fa-sync-alt"></i> Tekrar Dene
                </button>
            </div>
        </div>
    `;
}

// Galeri görüntüleme
function displayGallery(files) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    
    if (!files || files.length === 0) {
        displayEmptyGallery();
        return;
    }
    
    gallery.innerHTML = files.map(file => {
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
function displayEmptyGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    
    gallery.innerHTML = `
        <div class="empty-gallery">
            <i class="fas fa-images"></i>
            <h3>Henüz Fotoğraf Yok</h3>
            <p>İlk fotoğrafı yükleyen siz olun! Yukarıdaki yükleme bölümünü kullanarak anılarınızı paylaşabilirsiniz.</p>
        </div>
    `;
}

// Drag & Drop setup
function setupDragAndDrop() {
    const uploadCard = document.querySelector('.upload-card');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadCard || !fileInput) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadCard.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadCard.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadCard.addEventListener(eventName, unhighlight, false);
    });
    
    uploadCard.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadCard.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        uploadCard.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: { files } });
        }
    }
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
        max-width: 350px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Close butonu
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 8000); // 8 saniye göster
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': 'linear-gradient(135deg, #4ade80, #22c55e)',
        'error': 'linear-gradient(135deg, #ef4444, #dc2626)',
        'warning': 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        'info': 'linear-gradient(135deg, #667eea, #764ba2)'
    };
    return colors[type] || colors.info;
}

// CSS animasyonları
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
    
    .drag-over {
        border: 2px dashed #3B82F6 !important;
        background-color: rgba(59, 130, 246, 0.1) !important;
    }
    
    .progress-container {
        text-align: center;
    }
    
    .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #E5E7EB;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 1rem;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3B82F6, #10B981);
        transition: width 0.3s ease;
    }
    
    .progress-text {
        font-weight: 600;
        color: #374151;
    }
    
    .empty-gallery {
        text-align: center;
        padding: 3rem;
        color: #6B7280;
    }
    
    .empty-gallery i {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .retry-btn {
        background: #3B82F6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
    }
    
    .retry-btn:hover {
        background: #2563EB;
        transform: translateY(-2px);
    }
    
    .gallery-item {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    
    .gallery-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .gallery-item img {
        width: 100%;
        height: 200px;
        object-fit: cover;
    }
    
    .gallery-item-info {
        padding: 1rem;
    }
    
    .gallery-item-name {
        font-weight: 600;
        color: #374151;
        display: block;
        margin-bottom: 0.5rem;
    }
    
    .gallery-item-date {
        font-size: 0.9rem;
        color: #6B7280;
    }
    
    .video-thumbnail {
        position: relative;
    }
    
    .video-thumbnail i {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3rem;
        color: white;
        opacity: 0.8;
    }
    
    .file-icon {
        height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #F3F4F6;
    }
    
    .file-icon i {
        font-size: 3rem;
        color: #9CA3AF;
    }
`;
document.head.appendChild(style);

// CSS Animation injector
function injectAnimationCSS() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            margin-left: auto;
        }
        
        .retry-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 0.7rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: transform 0.2s ease;
        }
        
        .retry-btn:hover {
            transform: translateY(-2px);
        }
        
        .lightbox-content {
            position: relative;
        }
        
        .lightbox-close {
            position: absolute;
            top: -20px;
            right: -20px;
            background: rgba(255,255,255,0.9);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            font-size: 20px;
            cursor: pointer;
            z-index: 10001;
        }
        
        .file-input-label small {
            display: block;
            margin-top: 0.5rem;
            color: #6b7280;
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
}

// Sayfa yüklendiğinde CSS'i inject et
injectAnimationCSS();

console.log('✅ Düğün Fotoğraf Sistemi tamamen yüklendi!'); 