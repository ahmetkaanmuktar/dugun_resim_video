// Düğün Fotoğraf Yükleme Sistemi - Basit Backend Entegrasyonu
const API_BASE_URL = 'https://dugun-web-app.onrender.com';

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupUploadForm();
    loadGallery();
    setupDragAndDrop();
});

// Uygulama başlatma
function initializeApp() {
    console.log('📸 Düğün Fotoğraf Sistemi başlatıldı');
    testBackendConnection();
}

// Backend bağlantı testi
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('✅ Backend bağlantısı başarılı:', data);
        
        // Backend'in storage tipini kontrol et
        if (data.storage === 'local_with_drive_backup') {
            showNotification('✅ Sistem hazır! Dosyalar önce siteye, sonra Drive\'a yüklenecek.', 'success');
        }
    } catch (error) {
        console.error('❌ Backend bağlantı hatası:', error);
        showNotification('Sunucu bağlantısında sorun var. Lütfen daha sonra tekrar deneyin.', 'error');
    }
}

// Upload form setup
function setupUploadForm() {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    
    if (form && fileInput) {
        form.addEventListener('submit', handleFileUpload);
        fileInput.addEventListener('change', handleFileSelect);
    }
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
        
        // Upload progress göster
        showUploadProgress(0);
        
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
        hideUploadProgress();
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
                showUploadProgress(percentComplete);
            }
        });
        
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
        xhr.open('POST', `${API_BASE_URL}/api/upload`);
        xhr.send(formData);
    });
}

// Upload progress göster
function showUploadProgress(percent) {
    let progressBar = document.getElementById('uploadProgress');
    
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'uploadProgress';
        progressBar.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <span class="progress-text">0%</span>
            </div>
        `;
        
        // Stil ekle
        progressBar.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 300px;
        `;
        
        document.body.appendChild(progressBar);
    }
    
    const progressFill = progressBar.querySelector('.progress-fill');
    const progressText = progressBar.querySelector('.progress-text');
    
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
    
    progressBar.style.display = 'block';
}

// Upload progress gizle
function hideUploadProgress() {
    const progressBar = document.getElementById('uploadProgress');
    if (progressBar) {
        progressBar.style.display = 'none';
    }
}

// Galeri yükleme
async function loadGallery() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/gallery`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success && data.files) {
            displayGallery(data.files);
        } else {
            displayEmptyGallery();
        }
    } catch (error) {
        console.error('Galeri yükleme hatası:', error);
        displayEmptyGallery();
    }
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
    window.open(fileUrl, '_blank');
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
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
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
        'success': '#10B981',
        'error': '#EF4444',
        'warning': '#F59E0B',
        'info': '#3B82F6'
    };
    return colors[type] || '#3B82F6';
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