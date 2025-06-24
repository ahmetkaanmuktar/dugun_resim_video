// 📸 Modern Düğün Fotoğraf Sistemi - Çapraz Platform Uyumlu
var API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';
var GALLERY_API_KEY = 'Bearer dugun-gallery-key-2024';
var OFFLINE_MODE = false;
var isUploading = false;

console.log('🎉 Modern Düğün Fotoğraf Sistemi başlatılıyor...');

// DOM hazır olduğunda sistemi başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM yüklendi, sistem başlatılıyor...');
    initializeSystem();
});

// Sistem başlatma
function initializeSystem() {
    try {
        showMessage('🔄 Sistem hazırlanıyor...', 'info');
        
        // Backend bağlantısını test et
        testBackend()
            .then(function() {
                // Form ve galeriyi hazırla
                setupUploadForm();
                setupDragAndDrop();
                
                // Galeriyi gizle - sadece yükleme özelliği aktif
                hideGallerySection();
                
                showMessage('✅ Sistem hazır! Fotoğraflarınızı yükleyebilirsiniz.', 'success');
            })
            .catch(function(error) {
                console.error('❌ Backend hatası:', error);
                showMessage('⚠️ Sistem başlatılırken hata oluştu.', 'error');
                
                // Offline mode'da da çalışabilir
                setupUploadForm();
                setupDragAndDrop();
                hideGallerySection();
            });
        
    } catch (error) {
        console.error('❌ Sistem başlatma hatası:', error);
        showMessage('⚠️ Sistem başlatılırken hata oluştu.', 'error');
        
        // Fallback - temel form çalışması
        setupUploadForm();
        setupDragAndDrop();
        hideGallerySection();
    }
}

// Galeri bölümünü gizle
function hideGallerySection() {
    var gallerySection = document.querySelector('.gallery-section');
    if (gallerySection) {
        gallerySection.style.display = 'none';
        console.log('📷 Galeri bölümü gizlendi (gizlilik için)');
    }
}

// Backend bağlantı testi - Promise tabanlı eski tarayıcı desteği
function testBackend() {
    return new Promise(function(resolve, reject) {
        try {
            console.log('🔄 Backend test ediliyor...');
            
            // XMLHttpRequest kullan - daha uyumlu
            var xhr = new XMLHttpRequest();
            xhr.open('GET', API_BASE_URL + '/', true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.timeout = 15000;
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        console.log('✅ Backend çalışıyor:', data);
                        
                        OFFLINE_MODE = false;
                        enableUploadButton();
                        
                        // Debug bilgilerini kontrol et
                        checkDriveConnection();
                        
                        resolve(data);
                    } catch (parseError) {
                        console.error('JSON parse hatası:', parseError);
                        reject(parseError);
                    }
                } else {
                    reject(new Error('Backend yanıt vermedi: ' + xhr.status));
                }
            };
            
            xhr.onerror = function() {
                console.error('❌ Network hatası');
                OFFLINE_MODE = true;
                disableUploadButton();
                reject(new Error('Network hatası'));
            };
            
            xhr.ontimeout = function() {
                console.error('❌ Timeout hatası');
                OFFLINE_MODE = true;
                disableUploadButton();
                reject(new Error('Timeout hatası'));
            };
            
            xhr.send();
            
        } catch (error) {
            console.error('❌ Backend test hatası:', error);
            OFFLINE_MODE = true;
            disableUploadButton();
            reject(error);
        }
    });
}

// Drive bağlantısını kontrol et
function checkDriveConnection() {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE_URL + '/api/debug', true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var debug = JSON.parse(xhr.responseText);
                    console.log('🔍 Debug bilgileri:', debug);
                    
                    if (!debug.has_credentials) {
                        console.warn('⚠️ Google Drive kimlik bilgileri eksik');
                    }
                    if (!debug.folder_accessible) {
                        console.warn('⚠️ Google Drive klasörüne erişim yok');
                    }
                } catch (e) {
                    console.warn('Debug parse hatası:', e);
                }
            }
        };
        xhr.onerror = function() {
            console.warn('Debug endpoint erişilemedi');
        };
        xhr.send();
    } catch (error) {
        console.warn('Debug kontrol hatası:', error);
    }
}

// Upload butonunu aktif et
function enableUploadButton() {
    var btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Fotoğraf Yükle';
        btn.style.opacity = '1';
    }
}

// Upload butonunu pasif et
function disableUploadButton() {
    var btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Bağlantı Hatası';
        btn.style.opacity = '0.6';
    }
}

// Upload form setup
function setupUploadForm() {
    var form = document.getElementById('uploadForm');
    var fileInput = document.getElementById('fileInput');
    
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
    var label = document.querySelector('.file-input-label');
    if (label) {
        label.addEventListener('click', function() {
            if (!isUploading) {
                fileInput.click();
            }
        });
    }
}

// Dosya seçimi handler
function handleFileSelection(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 Dosya seçildi:', file.name, file.size, 'bytes');
    
    // Dosya boyut kontrolü
    var maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showMessage('❌ Dosya boyutu 50MB\'dan büyük olamaz!', 'error');
        event.target.value = '';
        return;
    }
    
    // Dosya tipi kontrolü - daha uyumlu kontrol
    var allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi'];
    var isValidType = false;
    
    for (var i = 0; i < allowedTypes.length; i++) {
        if (file.type === allowedTypes[i]) {
            isValidType = true;
            break;
        }
    }
    
    // Dosya uzantısı kontrolü (fallback)
    if (!isValidType) {
        var fileName = file.name.toLowerCase();
        var validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi'];
        
        for (var j = 0; j < validExtensions.length; j++) {
            if (fileName.indexOf(validExtensions[j]) !== -1) {
                isValidType = true;
                break;
            }
        }
    }
    
    if (!isValidType) {
        showMessage('❌ Sadece fotoğraf (JPG, PNG, GIF, WEBP) ve video (MP4, MOV, AVI) dosyaları desteklenir!', 'error');
        event.target.value = '';
        return;
    }
    
    var fileSize = (file.size / 1024 / 1024).toFixed(2);
    showMessage('📁 ' + file.name + ' seçildi (' + fileSize + ' MB)', 'success');
    
    // Upload label güncelle
    var label = document.querySelector('.file-input-label span');
    if (label) {
        label.textContent = '✓ ' + file.name + ' seçildi';
        label.parentElement.classList.add('file-selected');
    }
}

// Upload handler
function handleUpload(event) {
    event.preventDefault();
    
    if (isUploading) {
        showMessage('⏳ Zaten bir yükleme işlemi devam ediyor...', 'warning');
        return;
    }
    
    var fileInput = document.getElementById('fileInput');
    var file = fileInput.files[0];
    
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
        var formData = new FormData();
        formData.append('file', file);
        
        // Upload işlemini başlat
        uploadWithProgress(formData)
            .then(function(result) {
                if (result.success) {
                    updateProgress(100, 'Tamamlandı!');
                    
                    var driveStatus = result.drive_status === 'backed_up' ? 
                        '✅ Google Drive\'a yedeklendi!' : 
                        '💾 Sunucuda saklandı';
                    
                    setTimeout(function() {
                        hideProgressModal();
                        showMessage('✅ ' + file.name + ' başarıyla yüklendi! ' + driveStatus, 'success');
                        
                        // Form temizle
                        fileInput.value = '';
                        var label = document.querySelector('.file-input-label span');
                        if (label) {
                            label.textContent = 'Fotoğraf veya video seçin';
                            label.parentElement.classList.remove('file-selected');
                        }
                        
                        isUploading = false;
                        
                    }, 2000);
                    
                } else {
                    throw new Error(result.error || 'Yükleme başarısız');
                }
            })
            .catch(function(error) {
                console.error('❌ Upload hatası:', error);
                hideProgressModal();
                showMessage('❌ Yükleme hatası: ' + error.message, 'error');
                isUploading = false;
            });
        
    } catch (error) {
        console.error('❌ Upload genel hatası:', error);
        hideProgressModal();
        showMessage('❌ Yükleme hatası: ' + error.message, 'error');
        isUploading = false;
    }
}

// Progress ile upload - Promise tabanlı
function uploadWithProgress(formData) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        
        // Progress tracking
        if (xhr.upload) {
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable) {
                    var percent = Math.round((e.loaded / e.total) * 100);
                    updateProgress(percent, 'Yükleniyor... ' + percent + '%');
                }
            });
        }
        
        // Response handler
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Sunucu yanıtı okunamadı'));
                }
            } else {
                reject(new Error('Sunucu hatası: ' + xhr.status));
            }
        });
        
        // Error handler
        xhr.addEventListener('error', function() {
            reject(new Error('İnternet bağlantısı hatası'));
        });
        
        // Timeout handler
        xhr.timeout = 300000; // 5 dakika
        xhr.addEventListener('timeout', function() {
            reject(new Error('Yükleme zaman aşımı'));
        });
        
        // Send request
        xhr.open('POST', API_BASE_URL + '/api/upload');
        xhr.send(formData);
    });
}

// Progress modal göster
function showProgressModal() {
    var modal = document.getElementById('progressModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'progressModal';
        modal.innerHTML = 
            '<div class="modal-overlay">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<i class="fas fa-cloud-upload-alt pulse"></i>' +
                        '<h3>Fotoğraf Yükleniyor</h3>' +
                    '</div>' +
                    '<div class="progress-wrapper">' +
                        '<div class="progress-bar">' +
                            '<div class="progress-fill"></div>' +
                        '</div>' +
                        '<div class="progress-text">0%</div>' +
                        '<div class="progress-message">Hazırlanıyor...</div>' +
                    '</div>' +
                    '<div class="upload-animation">' +
                        '<div class="upload-step active">' +
                            '<i class="fas fa-file-image"></i>' +
                            '<span>Dosya</span>' +
                        '</div>' +
                        '<div class="upload-arrow">' +
                            '<i class="fas fa-arrow-right bounce"></i>' +
                        '</div>' +
                        '<div class="upload-step">' +
                            '<i class="fas fa-server"></i>' +
                            '<span>Sunucu</span>' +
                        '</div>' +
                        '<div class="upload-arrow">' +
                            '<i class="fas fa-arrow-right bounce"></i>' +
                        '</div>' +
                        '<div class="upload-step">' +
                            '<i class="fab fa-google-drive"></i>' +
                            '<span>Drive</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
}

// Progress güncelle
function updateProgress(percent, message) {
    var modal = document.getElementById('progressModal');
    if (!modal) return;
    
    var fill = modal.querySelector('.progress-fill');
    var text = modal.querySelector('.progress-text');
    var msg = modal.querySelector('.progress-message');
    var steps = modal.querySelectorAll('.upload-step');
    
    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = percent + '%';
    if (msg) msg.textContent = message;
    
    // Step animasyonları
    if (percent > 30 && steps[1]) {
        steps[1].classList.add('active');
    }
    if (percent > 70 && steps[2]) {
        steps[2].classList.add('active');
    }
    if (percent >= 100) {
        for (var i = 0; i < steps.length; i++) {
            steps[i].classList.add('completed');
        }
        if (fill) fill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
}

// Progress modal gizle
function hideProgressModal() {
    var modal = document.getElementById('progressModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Drag & Drop - eski tarayıcı desteği
function setupDragAndDrop() {
    var dropZone = document.querySelector('.file-input-label');
    if (!dropZone) return;
    
    var events = ['dragenter', 'dragover', 'dragleave', 'drop'];
    
    for (var i = 0; i < events.length; i++) {
        dropZone.addEventListener(events[i], preventDefaults, false);
    }
    
    dropZone.addEventListener('dragenter', highlight, false);
    dropZone.addEventListener('dragover', highlight, false);
    dropZone.addEventListener('dragleave', unhighlight, false);
    dropZone.addEventListener('drop', unhighlight, false);
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
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            var fileInput = document.getElementById('fileInput');
            fileInput.files = files;
            handleFileSelection({ target: { files: files } });
        }
    }
}

// Mesaj gösterme - eski tarayıcı uyumlu
function showMessage(text, type) {
    type = type || 'info';
    
    // Eski mesajı kaldır
    var existing = document.querySelector('.message-toast');
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }
    
    // Yeni mesaj oluştur
    var toast = document.createElement('div');
    toast.className = 'message-toast ' + type;
    toast.innerHTML = 
        '<div class="toast-content">' +
            '<i class="fas fa-' + getMessageIcon(type) + '"></i>' +
            '<span>' + text + '</span>' +
        '</div>';
    
    document.body.appendChild(toast);
    
    // Otomatik kaldır
    setTimeout(function() {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 6000);
}

// Mesaj ikonu
function getMessageIcon(type) {
    var icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

console.log('✅ Modern Düğün Fotoğraf Sistemi yüklendi!'); 