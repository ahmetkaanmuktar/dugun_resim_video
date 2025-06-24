// 📸 Basit ve Güvenilir Düğün Fotoğraf Sistemi
var API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';
var currentFile = null;
var isUploading = false;

// Sistem başlatma - basit ve etkili
document.addEventListener('DOMContentLoaded', function () {
    console.log('📱 Sistem başlatılıyor...');
    setTimeout(function () {
        initializeSystem();
    }, 100);
});

function initializeSystem() {
    try {
        // Temel elementleri al
        var fileInput = document.getElementById('fileInput');
        var uploadForm = document.getElementById('uploadForm');
        var uploadBtn = document.querySelector('.upload-btn');

        if (!fileInput || !uploadForm || !uploadBtn) {
            console.error('❌ Temel elementler bulunamadı!');
            return;
        }

        // Loading screen'i gizle
        hideLoadingScreen();

        // File input event'leri
        setupFileInput();

        // Form submit
        uploadForm.addEventListener('submit', handleUpload);

        // Backend test et
        testBackend();

        console.log('✅ Sistem hazır!');
        showMessage('📱 Sistem hazır! Fotoğrafınızı seçin.', 'success');

    } catch (error) {
        console.error('❌ Sistem başlatma hatası:', error);
        showMessage('❌ Sistem başlatılırken hata oluştu. Sayfayı yenileyin.', 'error');
    }
}

function hideLoadingScreen() {
    var loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function setupFileInput() {
    var fileInput = document.getElementById('fileInput');
    var label = document.querySelector('.file-input-label');

    if (!fileInput || !label) return;

    // File input change - en basit yöntem
    fileInput.addEventListener('change', function (e) {
        handleFileSelection(e.target.files[0]);
    });

    // Label click
    label.addEventListener('click', function (e) {
        if (!isUploading) {
            fileInput.click();
        }
    });

    // Basit drag & drop
    label.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        label.classList.add('drag-over');
    });

    label.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        label.classList.remove('drag-over');
    });

    label.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        label.classList.remove('drag-over');

        var files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelection(files[0]);
        }
    });
}

function handleFileSelection(file) {
    if (!file) {
        console.log('❌ Dosya seçilmedi');
        return;
    }

    console.log('📁 Dosya seçildi:', file.name, '(', (file.size / 1024 / 1024).toFixed(2), 'MB)');

    // Dosya kontrolü
    if (!validateFile(file)) {
        return;
    }

    // Global dosyayı sakla
    currentFile = file;

    // UI'yi güncelle
    updateFileLabel(file);
    enableUploadButton();

    showMessage('✅ ' + file.name + ' seçildi. Yükle butonuna tıklayın!', 'success');
}

function validateFile(file) {
    // Boyut kontrolü - 50MB
    var maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage('❌ Dosya boyutu çok büyük! Maksimum 50MB olmalı.', 'error');
        return false;
    }

    // Tip kontrolü - basit ve etkili
    var fileName = file.name.toLowerCase();
    var validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.heic'];
    var isValid = false;

    for (var i = 0; i < validExtensions.length; i++) {
        if (fileName.endsWith(validExtensions[i])) {
            isValid = true;
            break;
        }
    }

    // MIME type de kontrol et
    if (!isValid && file.type) {
        var validTypes = ['image/', 'video/'];
        for (var j = 0; j < validTypes.length; j++) {
            if (file.type.startsWith(validTypes[j])) {
                isValid = true;
                break;
            }
        }
    }

    if (!isValid) {
        showMessage('❌ Desteklenmeyen dosya formatı! JPG, PNG, MP4 gibi fotoğraf/video dosyaları seçin.', 'error');
        return false;
    }

    return true;
}

function updateFileLabel(file) {
    var label = document.querySelector('.file-input-label span');
    if (label) {
        var fileSize = (file.size / 1024 / 1024).toFixed(1);
        label.textContent = '✓ ' + file.name + ' (' + fileSize + ' MB)';
        label.parentElement.classList.add('file-selected');
    }
}

function enableUploadButton() {
    var btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Fotoğrafı Yükle';
        btn.style.opacity = '1';
    }
}

function disableUploadButton(text) {
    var btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = text || '<i class="fas fa-exclamation-triangle"></i> Bekleyin...';
        btn.style.opacity = '0.7';
    }
}

function testBackend() {
    console.log('🔍 Backend test ediliyor...');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/', true);
    xhr.timeout = 10000; // 10 saniye

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ Backend çalışıyor');
            showMessage('🌐 Sunucu bağlantısı başarılı!', 'info');
        } else {
            console.warn('⚠️ Backend yanıt vermiyor:', xhr.status);
            showMessage('⚠️ Sunucu bağlantısında sorun var, yine de deneyin.', 'warning');
        }
    };

    xhr.onerror = function () {
        console.warn('❌ Backend bağlantı hatası');
        showMessage('⚠️ İnternet bağlantınızı kontrol edin.', 'warning');
    };

    xhr.ontimeout = function () {
        console.warn('⏰ Backend timeout');
        showMessage('⚠️ Sunucu yavaş yanıt veriyor.', 'warning');
    };

    xhr.send();
}

function handleUpload(event) {
    event.preventDefault();

    if (isUploading) {
        showMessage('⏳ Zaten bir yükleme işlemi devam ediyor...', 'warning');
        return;
    }

    if (!currentFile) {
        showMessage('📁 Önce bir dosya seçin!', 'error');
        return;
    }

    // Upload başlat
    startUpload();
}

function startUpload() {
    isUploading = true;

    console.log('🚀 Upload başlatılıyor:', currentFile.name);

    // UI'yi güncelle
    disableUploadButton('<i class="fas fa-spinner fa-spin"></i> Yükleniyor...');
    showProgressModal();
    updateProgress(0, 'Yükleme başlatılıyor...');

    // FormData hazırla
    var formData = new FormData();
    formData.append('file', currentFile);

    // XMLHttpRequest ile upload
    var xhr = new XMLHttpRequest();

    // Progress tracking
    if (xhr.upload) {
        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                var percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(percent, 'Yükleniyor... ' + percent + '%');
            }
        });
    }

    // Success handler
    xhr.addEventListener('load', function () {
        if (xhr.status === 200) {
            try {
                var response = JSON.parse(xhr.responseText);
                handleUploadSuccess(response);
            } catch (error) {
                handleUploadError('Sunucu yanıtı okunamadı');
            }
        } else {
            handleUploadError('Sunucu hatası: ' + xhr.status);
        }
    });

    // Error handler
    xhr.addEventListener('error', function () {
        handleUploadError('İnternet bağlantısı hatası');
    });

    // Timeout handler
    xhr.timeout = 300000; // 5 dakika
    xhr.addEventListener('timeout', function () {
        handleUploadError('Yükleme çok uzun sürdü');
    });

    // Send request
    xhr.open('POST', API_BASE_URL + '/api/upload');
    xhr.send(formData);
}

function handleUploadSuccess(response) {
    console.log('✅ Upload başarılı:', response);

    updateProgress(100, 'Tamamlandı!');

    var driveStatus = response.drive_status === 'backed_up' ?
        '🔄 Google Drive\'a yedeklendi!' :
        '💾 Sunucuda saklandı';

    setTimeout(function () {
        hideProgressModal();
        showMessage('✅ ' + currentFile.name + ' başarıyla yüklendi! ' + driveStatus, 'success');

        // Formu temizle
        resetForm();

    }, 2000);
}

function handleUploadError(errorMessage) {
    console.error('❌ Upload hatası:', errorMessage);

    hideProgressModal();
    showMessage('❌ Yükleme hatası: ' + errorMessage, 'error');

    // Upload state'i sıfırla
    isUploading = false;
    enableUploadButton();
}

function resetForm() {
    // Global state temizle
    currentFile = null;
    isUploading = false;

    // File input temizle
    var fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }

    // Label'i sıfırla
    var label = document.querySelector('.file-input-label span');
    if (label) {
        label.textContent = 'Fotoğraf veya video seçin';
        label.parentElement.classList.remove('file-selected');
    }

    // Button'u sıfırla
    disableUploadButton('<i class="fas fa-cloud-upload-alt"></i> Önce dosya seçin');
}

// Progress Modal Functions
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
            '</div>' +
            '</div>';

        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
}

function updateProgress(percent, message) {
    var modal = document.getElementById('progressModal');
    if (!modal) return;

    var fill = modal.querySelector('.progress-fill');
    var text = modal.querySelector('.progress-text');
    var msg = modal.querySelector('.progress-message');

    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = percent + '%';
    if (msg) msg.textContent = message;

    if (percent >= 100) {
        if (fill) fill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
}

function hideProgressModal() {
    var modal = document.getElementById('progressModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Toast Messages
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
    setTimeout(function () {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, type === 'error' ? 8000 : 5000);
}

function getMessageIcon(type) {
    var icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

console.log('✅ Basit ve Güvenilir Düğün Fotoğraf Sistemi yüklendi!'); 