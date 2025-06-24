// 📸 Modern Düğün Fotoğraf Sistemi - Google Drive Entegrasyonu
const API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';
let OFFLINE_MODE = false;
let isUploading = false;

console.log('🎉 Modern Düğün Fotoğraf Sistemi başlatılıyor...');

// DOM hazır olduğunda sistemi başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM yüklendi, sistem başlatılıyor...');
    initializeSystem();
});

// Sistem başlatma
async function initializeSystem() {
    try {
        showMessage('🔄 Sistem hazırlanıyor...', 'info');
        
        // Backend bağlantısını test et
        await testBackend();
        
        // Form ve galeriyi hazırla
        setupUploadForm();
        setupDragAndDrop();
        await loadGallery();
        
        showMessage('✅ Sistem hazır! Fotoğraflarınızı yükleyebilirsiniz.', 'success');
        
    } catch (error) {
        console.error('❌ Sistem başlatma hatası:', error);
        showMessage('⚠️ Sistem başlatılırken hata oluştu.', 'error');
        
        // Offline mode'da da çalışabilir
        setupUploadForm();
        setupDragAndDrop();
        displayEmptyGallery();
    }
}

// Backend bağlantı testi
async function testBackend() {
    try {
        console.log('🔄 Backend test ediliyor...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Backend yanıt vermedi: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Backend çalışıyor:', data);
        
        OFFLINE_MODE = false;
        enableUploadButton();
        
        // Debug bilgilerini kontrol et
        try {
            await checkDriveConnection();
        } catch (debugError) {
            console.warn('Drive bağlantısı kontrol edilemedi:', debugError);
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ Backend hatası:', error);
        OFFLINE_MODE = true;
        disableUploadButton();
        throw error;
    }
}

// Drive bağlantısını kontrol et
async function checkDriveConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/debug`);
        if (response.ok) {
            const debug = await response.json();
            console.log('🔍 Debug bilgileri:', debug);
            
            if (!debug.has_credentials) {
                console.warn('⚠️ Google Drive kimlik bilgileri eksik');
            }
            if (!debug.folder_accessible) {
                console.warn('⚠️ Google Drive klasörüne erişim yok');
            }
        }
    } catch (error) {
        console.warn('Debug endpoint erişilemedi:', error);
    }
}

// Upload butonunu aktif et
function enableUploadButton() {
    const btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Fotoğraf Yükle';
        btn.style.opacity = '1';
    }
}

// Upload butonunu pasif et
function disableUploadButton() {
    const btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Bağlantı Hatası';
        btn.style.opacity = '0.6';
    }
}

// Upload form setup
function setupUploadForm() {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    
    if (!form || !fileInput) {
        console.error('❌ Upload form bulunamadı!');
        return;
    }
    
    console.log('📝 Upload form hazırlanıyor...');
    
    // Form submit handler
    form.addEventListener('submit', handleUpload);
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelection);
    
    // Label click handler
    const label = document.querySelector('.file-input-label');
    if (label) {
        label.addEventListener('click', () => {
            if (!isUploading) {
                fileInput.click();
            }
        });
    }
}

// Dosya seçimi handler
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 Dosya seçildi:', file.name, file.size, 'bytes');
    
    // Dosya boyut kontrolü
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showMessage('❌ Dosya boyutu 50MB\'dan büyük olamaz!', 'error');
        event.target.value = '';
        return;
    }
    
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi'];
    if (!allowedTypes.includes(file.type)) {
        showMessage('❌ Sadece fotoğraf (JPG, PNG, GIF, WEBP) ve video (MP4, MOV, AVI) dosyaları desteklenir!', 'error');
        event.target.value = '';
        return;
    }
    
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    showMessage(`📁 ${file.name} seçildi (${fileSize} MB)`, 'success');
    
    // Upload label güncelle
    const label = document.querySelector('.file-input-label span');
    if (label) {
        label.textContent = `✓ ${file.name} seçildi`;
        label.parentElement.classList.add('file-selected');
    }
}

// Upload handler
async function handleUpload(event) {
    event.preventDefault();
    
    if (isUploading) {
        showMessage('⏳ Zaten bir yükleme işlemi devam ediyor...', 'warning');
        return;
    }
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('📁 Lütfen önce bir dosya seçin!', 'error');
        return;
    }
    
    isUploading = true;
    
    try {
        console.log('🚀 Upload başlatılıyor:', file.name);
        
        // Progress modal göster
        showProgressModal();
        updateProgress(0, 'Yükleme hazırlanıyor...');
        
        // FormData oluştur
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload işlemini başlat
        const result = await uploadWithProgress(formData);
        
        if (result.success) {
            updateProgress(100, 'Tamamlandı!');
            
            const driveStatus = result.drive_status === 'backed_up' ? 
                '✅ Google Drive\'a yedeklendi!' : 
                '💾 Sunucuda saklandı';
            
            setTimeout(async () => {
                hideProgressModal();
                showMessage(`✅ ${file.name} başarıyla yüklendi! ${driveStatus}`, 'success');
                
                // Form temizle
                fileInput.value = '';
                const label = document.querySelector('.file-input-label span');
                if (label) {
                    label.textContent = 'Fotoğraf veya video seçin';
                    label.parentElement.classList.remove('file-selected');
                }
                
                // Galeriyi yenile
                await loadGallery();
                
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Yükleme başarısız');
        }
        
    } catch (error) {
        console.error('❌ Upload hatası:', error);
        hideProgressModal();
        showMessage(`❌ Yükleme hatası: ${error.message}`, 'error');
        
    } finally {
        isUploading = false;
    }
}

// Progress ile upload
function uploadWithProgress(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Progress tracking
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(percent, `Yükleniyor... ${percent}%`);
            }
        });
        
        // Response handler
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Sunucu yanıtı okunamadı'));
                }
            } else {
                reject(new Error(`Sunucu hatası: ${xhr.status}`));
            }
        });
        
        // Error handler
        xhr.addEventListener('error', () => {
            reject(new Error('İnternet bağlantısı hatası'));
        });
        
        // Send request
        xhr.open('POST', `${API_BASE_URL}/api/upload`);
        xhr.send(formData);
    });
}

// Progress modal göster
function showProgressModal() {
    let modal = document.getElementById('progressModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'progressModal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <i class="fas fa-cloud-upload-alt pulse"></i>
                        <h3>Fotoğraf Yükleniyor</h3>
                    </div>
                    <div class="progress-wrapper">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">0%</div>
                        <div class="progress-message">Hazırlanıyor...</div>
                    </div>
                    <div class="upload-animation">
                        <div class="upload-step active">
                            <i class="fas fa-file-image"></i>
                            <span>Dosya</span>
                        </div>
                        <div class="upload-arrow">
                            <i class="fas fa-arrow-right bounce"></i>
                        </div>
                        <div class="upload-step">
                            <i class="fas fa-server"></i>
                            <span>Sunucu</span>
                        </div>
                        <div class="upload-arrow">
                            <i class="fas fa-arrow-right bounce"></i>
                        </div>
                        <div class="upload-step">
                            <i class="fab fa-google-drive"></i>
                            <span>Drive</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
}

// Progress güncelle
function updateProgress(percent, message) {
    const modal = document.getElementById('progressModal');
    if (!modal) return;
    
    const fill = modal.querySelector('.progress-fill');
    const text = modal.querySelector('.progress-text');
    const msg = modal.querySelector('.progress-message');
    const steps = modal.querySelectorAll('.upload-step');
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
    if (msg) msg.textContent = message;
    
    // Step animasyonları
    if (percent > 30 && steps[1]) {
        steps[1].classList.add('active');
    }
    if (percent > 70 && steps[2]) {
        steps[2].classList.add('active');
    }
    if (percent >= 100) {
        steps.forEach(step => step.classList.add('completed'));
        if (fill) fill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
}

// Progress modal gizle
function hideProgressModal() {
    const modal = document.getElementById('progressModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Galeri yükleme - Hem local hem Drive dosyalarını göster
async function loadGallery() {
    try {
        console.log('📷 Galeri yükleniyor...');
        
        // Hem local hem Drive dosyalarını al
        const [localResponse, driveResponse] = await Promise.allSettled([
            fetch(`${API_BASE_URL}/api/gallery`),
            fetch(`${API_BASE_URL}/api/drive-gallery`).catch(e => ({ ok: false }))
        ]);
        
        let allFiles = [];
        
        // Local dosyalar
        if (localResponse.status === 'fulfilled' && localResponse.value.ok) {
            const localData = await localResponse.value.json();
            if (localData.success && localData.files) {
                allFiles = [...allFiles, ...localData.files.map(f => ({...f, source: 'local'}))];
            }
        }
        
        // Drive dosyalar
        if (driveResponse.status === 'fulfilled' && driveResponse.value.ok) {
            const driveData = await driveResponse.value.json();
            if (driveData.success && driveData.files) {
                allFiles = [...allFiles, ...driveData.files.map(f => ({...f, source: 'drive'}))];
            }
        }
        
        if (allFiles.length > 0) {
            // Tarih sırasına göre sırala (en yeni önce)
            allFiles.sort((a, b) => new Date(b.createdTime || b.uploadTime || 0) - new Date(a.createdTime || a.uploadTime || 0));
            displayGallery(allFiles);
            console.log(`✅ ${allFiles.length} dosya bulundu`);
        } else {
            displayEmptyGallery();
            console.log('📁 Galeri boş');
        }
        
    } catch (error) {
        console.error('⚠️ Galeri yüklenemedi:', error);
        displayEmptyGallery();
    }
}

// Galeri görüntüleme
function displayGallery(files) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    
    gallery.innerHTML = files.map(file => {
        const isImage = file.mimeType && file.mimeType.startsWith('image/');
        const isVideo = file.mimeType && file.mimeType.startsWith('video/');
        const fileUrl = file.webViewLink || file.url || file.downloadUrl;
        const thumbnailUrl = file.thumbnailLink || file.url || fileUrl;
        const fileName = file.name || 'Bilinmeyen dosya';
        const fileDate = formatDate(file.createdTime || file.uploadTime);
        const sourceIcon = file.source === 'drive' ? 'fab fa-google-drive' : 'fas fa-server';
        const sourceColor = file.source === 'drive' ? '#4285f4' : '#6b7280';
        
        return `
            <div class="gallery-item" onclick="openLightbox('${fileUrl}', '${fileName}', ${isVideo})">
                <div class="gallery-item-content">
                    ${isImage ? `
                        <img src="${thumbnailUrl}" alt="${fileName}" loading="lazy" />
                    ` : isVideo ? `
                        <div class="video-thumbnail">
                            <img src="${thumbnailUrl}" alt="${fileName}" loading="lazy" />
                            <div class="play-button">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                    ` : `
                        <div class="file-placeholder">
                            <i class="fas fa-file"></i>
                        </div>
                    `}
                    <div class="gallery-item-info">
                        <div class="file-name">${fileName}</div>
                        <div class="file-meta">
                            <span class="file-date">${fileDate}</span>
                            <i class="${sourceIcon}" style="color: ${sourceColor};" title="${file.source === 'drive' ? 'Google Drive' : 'Sunucu'}"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Boş galeri
function displayEmptyGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    
    gallery.innerHTML = `
        <div class="empty-gallery">
            <i class="fas fa-images"></i>
            <h3>Henüz fotoğraf yok</h3>
            <p>İlk fotoğrafı yükleyerek galeriye hayat verin!</p>
            <button onclick="document.getElementById('fileInput').click()" class="retry-btn">
                <i class="fas fa-plus"></i> İlk Fotoğrafı Yükle
            </button>
        </div>
    `;
}

// Lightbox açma
function openLightbox(url, filename, isVideo = false) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="lightbox-media">
                ${isVideo ? `
                    <video controls autoplay>
                        <source src="${url}" type="video/mp4">
                        Video yüklenemedi.
                    </video>
                ` : `
                    <img src="${url}" alt="${filename}" />
                `}
            </div>
            <div class="lightbox-info">
                <h4>${filename}</h4>
            </div>
        </div>
    `;
    
    // Click dışında kapatma
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.remove();
        }
    });
    
    document.body.appendChild(lightbox);
}

// Drag & Drop
function setupDragAndDrop() {
    const dropZone = document.querySelector('.file-input-label');
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('fileInput');
            fileInput.files = files;
            handleFileSelection({ target: { files } });
        }
    }
}

// Mesaj gösterme
function showMessage(text, type = 'info') {
    // Eski mesajı kaldır
    const existing = document.querySelector('.message-toast');
    if (existing) existing.remove();
    
    // Yeni mesaj oluştur
    const toast = document.createElement('div');
    toast.className = `message-toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getMessageIcon(type)}"></i>
            <span>${text}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Otomatik kaldır
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 6000);
}

// Mesaj ikonu
function getMessageIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Tarih formatla
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

console.log('✅ Modern Düğün Fotoğraf Sistemi yüklendi!'); 