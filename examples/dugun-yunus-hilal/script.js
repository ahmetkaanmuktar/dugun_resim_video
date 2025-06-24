// 📸 Düğün Fotoğraf Yükleme Sistemi V6.0.0 - TAMAMEN YENİLENDİ
const API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';
let OFFLINE_MODE = false;
let isUploading = false;

console.log('🎉 Düğün Fotoğraf Sistemi V6.0.0 başlatılıyor...');

// DOM hazır olduğunda sistemi başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM yüklendi, sistem başlatılıyor...');
    initializeSystem();
});

// Sistem başlatma
async function initializeSystem() {
    try {
        showMessage('🔄 Sistem kontrolleri yapılıyor...', 'info');
        
        // Backend bağlantısını test et
        await testBackend();
        
        // Form ve galeriyi hazırla
        setupUploadForm();
        setupDragAndDrop();
        await loadGallery();
        
        showMessage('✅ Sistem hazır! Fotoğraflarınızı yükleyebilirsiniz.', 'success');
        
    } catch (error) {
        console.error('❌ Sistem başlatma hatası:', error);
        showMessage('⚠️ Sistem başlatılırken hata oluştu. Sayfa yenilenecek...', 'error');
        setTimeout(() => location.reload(), 3000);
    }
}

// Backend bağlantı testi
async function testBackend() {
    try {
        console.log('🔄 Backend test ediliyor...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
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
        
        return data;
        
    } catch (error) {
        console.error('❌ Backend hatası:', error);
        OFFLINE_MODE = true;
        disableUploadButton();
        throw error;
    }
}

// Upload butonunu aktif et
function enableUploadButton() {
    const btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Fotoğraf Yükle';
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
            if (!OFFLINE_MODE && !isUploading) {
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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi'];
    if (!allowedTypes.includes(file.type)) {
        showMessage('❌ Sadece fotoğraf (JPG, PNG, GIF) ve video (MP4, MOV, AVI) dosyaları yüklenebilir!', 'error');
        event.target.value = '';
        return;
    }
    
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    showMessage(`📁 ${file.name} seçildi (${fileSize} MB) - Yüklemeye hazır!`, 'success');
    
    // Upload label güncelle
    const label = document.querySelector('.file-input-label span');
    if (label) {
        label.textContent = `Seçilen: ${file.name}`;
    }
}

// Upload handler
async function handleUpload(event) {
    event.preventDefault();
    
    if (OFFLINE_MODE) {
        showMessage('❌ İnternet bağlantınızı kontrol edin!', 'error');
        return;
    }
    
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
            
            setTimeout(async () => {
                hideProgressModal();
                showMessage(`✅ ${file.name} başarıyla yüklendi!`, 'success');
                
                // Form temizle
                fileInput.value = '';
                const label = document.querySelector('.file-input-label span');
                if (label) {
                    label.textContent = 'Fotoğraf veya video seçin';
                }
                
                // Galeriyi yenile
                await loadGallery();
                
            }, 1500);
            
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
                        <i class="fas fa-cloud-upload-alt"></i>
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
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="upload-step">
                            <i class="fas fa-cloud"></i>
                            <span>Sunucu</span>
                        </div>
                        <div class="upload-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="upload-step">
                            <i class="fas fa-check-circle"></i>
                            <span>Tamamlandı</span>
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
    if (percent >= 100 && steps[2]) {
        steps[2].classList.add('active');
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

// Galeri yükleme
async function loadGallery() {
    try {
        console.log('📷 Galeri yükleniyor...');
        
        const response = await fetch(`${API_BASE_URL}/api/gallery`);
        if (!response.ok) {
            throw new Error(`Galeri yüklenemedi: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.files && data.files.length > 0) {
            displayGallery(data.files);
            console.log(`✅ ${data.files.length} dosya yüklendi`);
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
        const fileUrl = file.webViewLink || file.url;
        const thumbnailUrl = file.thumbnailLink || file.url || fileUrl;
        const fileName = file.name || 'Bilinmeyen dosya';
        const fileDate = formatDate(file.createdTime);
        
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
                        <div class="file-date">${fileDate}</div>
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
            <p>İlk fotoğrafı yükleyen siz olun!</p>
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
    }, 5000);
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
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

console.log('✅ Düğün Fotoğraf Sistemi V6.0.0 yüklendi!'); 