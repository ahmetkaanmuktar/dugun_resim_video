// Düğün Fotoğraf Yükleme Sistemi - Modern API Integration
const API_BASE_URL = 'https://dugun-yunus-hilal-backend.onrender.com';

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
    
    // Backend bağlantısını test et
    testBackendConnection();
}

// Backend bağlantı testi
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        const data = await response.json();
        console.log('✅ Backend bağlantısı başarılı:', data);
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
            fileInput.value = '';
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
        
        // Dosyayı yükle
        const response = await uploadFileWithProgress(formData);
        
        if (response.success) {
            showNotification('✅ Dosya başarıyla yüklendi!', 'success');
            fileInput.value = ''; // Input'u temizle
            loadGallery(); // Galeriyi yenile
        } else {
            throw new Error(response.message || 'Yükleme başarısız');
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
            try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
            } catch (error) {
                reject(new Error('Sunucu yanıtı işlenemedi'));
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
        const data = await response.json();
        
        if (data.success && data.files) {
            displayGallery(data.files);
        } else {
            console.log('Galeri boş veya yüklenemedi');
            displayEmptyGallery();
        }
        
    } catch (error) {
        console.error('Galeri yükleme hatası:', error);
        displayEmptyGallery();
    }
}

// Galeri görüntüleme
function displayGallery(files) {
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (!galleryGrid) return;
    
    if (files.length === 0) {
        displayEmptyGallery();
        return;
    }
    
    galleryGrid.innerHTML = files.map(file => `
        <div class="gallery-item" data-file-id="${file.id}">
            <div class="gallery-image">
                ${file.type.startsWith('image/') ? 
                    `<img src="${file.thumbnail || file.url}" alt="${file.name}" loading="lazy">` :
                    `<div class="video-thumbnail">
                        <i class="fas fa-play-circle"></i>
                        <span>${file.name}</span>
                    </div>`
                }
            </div>
            <div class="gallery-info">
                <span class="file-name">${file.name}</span>
                <span class="file-date">${formatDate(file.uploadDate)}</span>
            </div>
        </div>
    `).join('');
    
    // Gallery item click events
    galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const fileId = item.dataset.fileId;
            const file = files.find(f => f.id === fileId);
            if (file) {
                openFileModal(file);
            }
        });
    });
}

// Boş galeri göster
function displayEmptyGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <h3>Henüz fotoğraf yüklenmemiş</h3>
                <p>İlk fotoğrafı yüklemek için yukarıdaki formu kullanın!</p>
            </div>
        `;
    }
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
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openFileModal(file) {
    // Modal implementation
    const modal = document.createElement('div');
    modal.className = 'file-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <div class="modal-body">
                ${file.type.startsWith('image/') ? 
                    `<img src="${file.url}" alt="${file.name}">` :
                    `<video controls><source src="${file.url}" type="${file.type}"></video>`
                }
            </div>
            <div class="modal-footer">
                <h3>${file.name}</h3>
                <p>Yüklenme: ${formatDate(file.uploadDate)}</p>
                <a href="${file.url}" download="${file.name}" class="download-btn">
                    <i class="fas fa-download"></i> İndir
                </a>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close events
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
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
    
    .file-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }
    
    .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        position: relative;
    }
    
    .modal-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 2rem;
        cursor: pointer;
        color: #6B7280;
        z-index: 1;
    }
    
    .modal-body img,
    .modal-body video {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
    }
    
    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #E5E7EB;
    }
    
    .download-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #3B82F6;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 500;
        margin-top: 1rem;
    }
    
    .download-btn:hover {
        background: #2563EB;
    }
`;
document.head.appendChild(style); 