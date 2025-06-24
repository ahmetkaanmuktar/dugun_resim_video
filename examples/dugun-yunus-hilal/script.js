// 📸 Basit ve Güvenilir Düğün Fotoğraf Sistemi - Multiple File Support
var API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';
var selectedFiles = [];
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
        showMessage('📱 Sistem hazır! Fotoğraflarınızı seçin.', 'success');

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

    // Multiple file selection aktif et
    fileInput.setAttribute('multiple', 'multiple');

    // File input change - multiple files
    fileInput.addEventListener('change', function (e) {
        handleMultipleFileSelection(e.target.files);
    });

    // Label click
    label.addEventListener('click', function (e) {
        if (!isUploading) {
            fileInput.click();
        }
    });

    // Basit drag & drop - multiple files
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
            handleMultipleFileSelection(files);
        }
    });
}

function handleMultipleFileSelection(files) {
    if (!files || files.length === 0) {
        console.log('❌ Dosya seçilmedi');
        return;
    }

    console.log('📁 ' + files.length + ' dosya seçildi');

    // Mevcut seçimi temizle
    selectedFiles = [];

    // Her dosyayı kontrol et ve ekle
    var validFiles = [];
    var invalidCount = 0;

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (validateFile(file)) {
            validFiles.push(file);
        } else {
            invalidCount++;
        }
    }

    // Geçerli dosyaları sakla
    selectedFiles = validFiles;

    if (selectedFiles.length > 0) {
        // UI'yi güncelle
        updateMultipleFileLabel();
        enableUploadButton();

        var message = '✅ ' + selectedFiles.length + ' dosya seçildi!';
        if (invalidCount > 0) {
            message += ' (' + invalidCount + ' dosya geçersiz)';
        }
        showMessage(message, 'success');
    } else {
        showMessage('❌ Hiç geçerli dosya seçilmedi!', 'error');
        resetForm();
    }
}

function validateFile(file) {
    // Boyut kontrolü - 50MB
    var maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        console.warn('❌ Büyük dosya:', file.name);
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
        console.warn('❌ Geçersiz format:', file.name);
        return false;
    }

    return true;
}

function updateMultipleFileLabel() {
    var label = document.querySelector('.file-input-label span');
    if (label && selectedFiles.length > 0) {
        if (selectedFiles.length === 1) {
            var fileSize = (selectedFiles[0].size / 1024 / 1024).toFixed(1);
            label.textContent = '✓ ' + selectedFiles[0].name + ' (' + fileSize + ' MB)';
        } else {
            var totalSize = 0;
            for (var i = 0; i < selectedFiles.length; i++) {
                totalSize += selectedFiles[i].size;
            }
            var totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);
            label.textContent = '✓ ' + selectedFiles.length + ' dosya seçildi (' + totalSizeMB + ' MB)';
        }
        label.parentElement.classList.add('file-selected');
    }
}

function enableUploadButton() {
    var btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = false;
        if (selectedFiles.length === 1) {
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Fotoğrafı Yükle';
        } else {
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> ' + selectedFiles.length + ' Dosyayı Yükle';
        }
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

    if (!selectedFiles || selectedFiles.length === 0) {
        showMessage('📁 Önce dosya seçin!', 'error');
        return;
    }

    // Upload başlat
    startMultipleUpload();
}

function startMultipleUpload() {
    isUploading = true;

    console.log('🚀 ' + selectedFiles.length + ' dosya yüklenmeye başlıyor...');

    // UI'yi güncelle
    disableUploadButton('<i class="fas fa-spinner fa-spin"></i> Yükleniyor...');
    showProgressModal();
    updateProgress(0, 'Yükleme başlatılıyor...');

    // Dosyaları sırayla yükle
    uploadFilesSequentially(0, [], []);
}

function uploadFilesSequentially(currentIndex, successFiles, errorFiles) {
    if (currentIndex >= selectedFiles.length) {
        // Tüm dosyalar işlendi
        handleAllUploadsComplete(successFiles, errorFiles);
        return;
    }

    var currentFile = selectedFiles[currentIndex];
    var progress = Math.round((currentIndex / selectedFiles.length) * 100);

    updateProgress(progress, (currentIndex + 1) + '/' + selectedFiles.length + ': ' + currentFile.name);

    // FormData hazırla
    var formData = new FormData();
    formData.append('file', currentFile);

    // XMLHttpRequest ile upload
    var xhr = new XMLHttpRequest();

    // Success handler
    xhr.addEventListener('load', function () {
        if (xhr.status === 200) {
            try {
                var response = JSON.parse(xhr.responseText);
                successFiles.push({
                    file: currentFile,
                    response: response
                });
                console.log('✅ Başarılı:', currentFile.name);
            } catch (error) {
                errorFiles.push({
                    file: currentFile,
                    error: 'Sunucu yanıtı okunamadı'
                });
                console.error('❌ Parse hatası:', currentFile.name);
            }
        } else {
            errorFiles.push({
                file: currentFile,
                error: 'Sunucu hatası: ' + xhr.status
            });
            console.error('❌ HTTP hatası:', currentFile.name, xhr.status);
        }

        // Sonraki dosyaya geç
        uploadFilesSequentially(currentIndex + 1, successFiles, errorFiles);
    });

    // Error handler
    xhr.addEventListener('error', function () {
        errorFiles.push({
            file: currentFile,
            error: 'İnternet bağlantısı hatası'
        });
        console.error('❌ Network hatası:', currentFile.name);

        // Sonraki dosyaya geç
        uploadFilesSequentially(currentIndex + 1, successFiles, errorFiles);
    });

    // Timeout handler
    xhr.timeout = 300000; // 5 dakika
    xhr.addEventListener('timeout', function () {
        errorFiles.push({
            file: currentFile,
            error: 'Yükleme çok uzun sürdü'
        });
        console.error('❌ Timeout:', currentFile.name);

        // Sonraki dosyaya geç
        uploadFilesSequentially(currentIndex + 1, successFiles, errorFiles);
    });

    // Send request
    xhr.open('POST', API_BASE_URL + '/api/upload');
    xhr.send(formData);
}

function handleAllUploadsComplete(successFiles, errorFiles) {
    console.log('📊 Upload tamamlandı. Başarılı:', successFiles.length, 'Hatalı:', errorFiles.length);

    updateProgress(100, 'Tamamlandı!');

    setTimeout(function () {
        hideProgressModal();

        var message = '';
        if (successFiles.length > 0 && errorFiles.length === 0) {
            // Tümü başarılı
            message = '✅ ' + successFiles.length + ' dosya başarıyla yüklendi!';
            showMessage(message, 'success');
        } else if (successFiles.length > 0 && errorFiles.length > 0) {
            // Kısmen başarılı
            message = '⚠️ ' + successFiles.length + ' dosya yüklendi, ' + errorFiles.length + ' dosyada hata oluştu.';
            showMessage(message, 'warning');
        } else {
            // Hepsi başarısız
            message = '❌ Hiçbir dosya yüklenemedi! (' + errorFiles.length + ' hata)';
            showMessage(message, 'error');
        }

        // Detaylı sonuç göster
        if (errorFiles.length > 0) {
            setTimeout(function () {
                var errorDetails = 'Hatalı dosyalar:\n';
                for (var i = 0; i < Math.min(errorFiles.length, 3); i++) {
                    errorDetails += '• ' + errorFiles[i].file.name + ': ' + errorFiles[i].error + '\n';
                }
                if (errorFiles.length > 3) {
                    errorDetails += '... ve ' + (errorFiles.length - 3) + ' dosya daha';
                }
                showMessage(errorDetails, 'error');
            }, 3000);
        }

        // Formu temizle
        resetForm();

    }, 2000);
}

function resetForm() {
    // Global state temizle
    selectedFiles = [];
    isUploading = false;

    // File input temizle
    var fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }

    // Label'i sıfırla
    var label = document.querySelector('.file-input-label span');
    if (label) {
        label.textContent = 'Fotoğraf veya video seçin (Birden fazla seçebilirsiniz)';
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
            '<h3>Fotoğraflar Yükleniyor</h3>' +
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
    }, type === 'error' ? 10000 : 6000);
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

console.log('✅ Multiple File Upload Düğün Sistemi yüklendi!'); 