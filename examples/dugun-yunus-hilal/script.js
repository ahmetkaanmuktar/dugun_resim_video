// 📸 Hızlı Paralel Upload Düğün Fotoğraf Sistemi
var API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';
var selectedFiles = [];
var isUploading = false;
var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Sistem başlatma
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Hızlı Upload Sistem başlatılıyor...');
    console.log('🔍 Platform:', isIOS ? 'iOS' : isMobile ? 'Mobile' : 'Desktop');

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
        var previewContainer = document.getElementById('previewContainer');

        if (!fileInput || !uploadForm || !uploadBtn || !previewContainer) {
            console.error('❌ Temel elementler bulunamadı!');
            return;
        }

        // Loading screen'i gizle
        hideLoadingScreen();

        // File input sistemini başlat
        setupFileInput();

        // Form submit
        uploadForm.addEventListener('submit', handleUpload);

        // Backend test et
        testBackend();

        console.log('✅ Hızlı sistem hazır!');
        showMessage('🚀 Hızlı yükleme sistemi hazır!', 'success');

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

    // Multiple file selection - her zaman aktif
    fileInput.setAttribute('multiple', 'multiple');
    fileInput.setAttribute('accept', 'image/*,video/*');

    // iOS için özel style ayarları
    if (isIOS) {
        fileInput.style.position = 'absolute';
        fileInput.style.left = '-9999px';
        fileInput.style.opacity = '0';
        fileInput.style.pointerEvents = 'none';
        console.log('📱 iOS file input ayarlandı');
    }

    // File input change - thumbnail sistemi
    fileInput.addEventListener('change', function (e) {
        console.log('📁 File input change triggered:', e.target.files ? e.target.files.length : 0, 'files');

        if (!e.target.files || e.target.files.length === 0) {
            console.warn('⚠️ Dosya seçimi boş');
            return;
        }

        addNewFiles(e.target.files);

        // Input'u temizle ki aynı dosyalar tekrar seçilebilsin
        e.target.value = '';
    });

    // Label click - dosya eklemek için
    label.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (isUploading) {
            showMessage('⏳ Yükleme devam ediyor...', 'warning');
            return;
        }

        console.log('🖱️ Label clicked - opening file picker');
        triggerFileInput();
    });

    // Touch events için optimizasyon
    if (isIOS || isMobile) {
        label.addEventListener('touchstart', function (e) {
            e.preventDefault();
            label.style.transform = 'scale(0.98)';
        });

        label.addEventListener('touchend', function (e) {
            e.preventDefault();
            label.style.transform = 'scale(1)';

            setTimeout(function () {
                if (!isUploading) {
                    triggerFileInput();
                }
            }, 100);
        });
    }

    // Drag & Drop - sadece desktop'ta
    if (!isMobile) {
        setupDragDrop(label);
    }
}

function triggerFileInput() {
    var fileInput = document.getElementById('fileInput');

    if (isIOS) {
        // iOS'da özel file picker açma
        fileInput.style.position = 'static';
        fileInput.style.left = 'auto';
        fileInput.style.opacity = '1';
        fileInput.style.pointerEvents = 'auto';

        setTimeout(function () {
            fileInput.click();

            setTimeout(function () {
                fileInput.style.position = 'absolute';
                fileInput.style.left = '-9999px';
                fileInput.style.opacity = '0';
                fileInput.style.pointerEvents = 'none';
            }, 100);
        }, 50);
    } else {
        fileInput.click();
    }
}

function setupDragDrop(label) {
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
            addNewFiles(files);
        }
    });
}

function addNewFiles(files) {
    console.log('📁 ' + files.length + ' yeni dosya ekleniyor...');

    // FileList'i Array'e çevir
    var fileArray = [];
    for (var i = 0; i < files.length; i++) {
        fileArray.push(files[i]);
    }

    var addedCount = 0;
    var duplicateCount = 0;
    var invalidCount = 0;

    for (var j = 0; j < fileArray.length; j++) {
        var file = fileArray[j];

        // Duplicate kontrolü
        if (isFileAlreadySelected(file)) {
            duplicateCount++;
            console.warn('⚠️ Dosya zaten seçilmiş:', file.name);
            continue;
        }

        // Dosya geçerliliği kontrolü
        if (!validateFile(file)) {
            invalidCount++;
            console.warn('❌ Geçersiz dosya:', file.name);
            continue;
        }

        // Benzersiz ID oluştur
        file.uniqueId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Dosyayı ekle
        selectedFiles.push(file);
        addedCount++;

        // Thumbnail oluştur
        createThumbnail(file);

        console.log('✅ Dosya eklendi:', file.name);
    }

    // Sonuç mesajı
    var message = '';
    if (addedCount > 0) {
        message = '✅ ' + addedCount + ' dosya eklendi!';
        if (duplicateCount > 0) message += ' (' + duplicateCount + ' duplicate atlandı)';
        if (invalidCount > 0) message += ' (' + invalidCount + ' geçersiz atlandı)';
        showMessage(message, 'success');
    } else if (duplicateCount > 0) {
        showMessage('⚠️ Seçilen dosyalar zaten eklenmiş!', 'warning');
    } else if (invalidCount > 0) {
        showMessage('❌ Seçilen dosyalar geçersiz format!', 'error');
    }

    // UI'yi güncelle
    updateUI();
}

function isFileAlreadySelected(newFile) {
    for (var i = 0; i < selectedFiles.length; i++) {
        var existingFile = selectedFiles[i];
        if (existingFile.name === newFile.name &&
            existingFile.size === newFile.size &&
            existingFile.lastModified === newFile.lastModified) {
            return true;
        }
    }
    return false;
}

function validateFile(file) {
    // Boyut kontrolü - 50MB
    var maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        console.warn('❌ Büyük dosya:', file.name, 'Size:', file.size);
        return false;
    }

    // Minimum boyut kontrolü (1KB)
    if (file.size < 1024) {
        console.warn('❌ Çok küçük dosya:', file.name, 'Size:', file.size);
        return false;
    }

    // Format kontrolü
    var fileName = file.name.toLowerCase();
    var validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.mp4', '.mov', '.avi'];
    var isValidExtension = false;

    for (var i = 0; i < validExtensions.length; i++) {
        if (fileName.endsWith(validExtensions[i])) {
            isValidExtension = true;
            break;
        }
    }

    // MIME type kontrolü
    var isValidMime = false;
    if (file.type) {
        var validMimeTypes = ['image/', 'video/'];
        for (var j = 0; j < validMimeTypes.length; j++) {
            if (file.type.startsWith(validMimeTypes[j])) {
                isValidMime = true;
                break;
            }
        }
    }

    // iOS'da HEIC dosyaları type olarak boş gelebilir
    if (isIOS && (fileName.endsWith('.heic') || fileName.endsWith('.heif'))) {
        isValidMime = true;
    }

    return isValidExtension || isValidMime;
}

// Dosya sıkıştırma fonksiyonu
function compressImage(file, maxWidth, quality) {
    return new Promise(function (resolve, reject) {
        // Video dosyalarını sıkıştırma
        if (file.type.startsWith('video/') || file.name.toLowerCase().match(/\.(mp4|mov|avi)$/)) {
            resolve(file);
            return;
        }

        // Küçük dosyaları sıkıştırma (1MB altı)
        if (file.size < 1024 * 1024) {
            resolve(file);
            return;
        }

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var img = new Image();

        img.onload = function () {
            // Yeni boyutları hesapla
            var ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            var newWidth = img.width * ratio;
            var newHeight = img.height * ratio;

            canvas.width = newWidth;
            canvas.height = newHeight;

            // Resmi çiz
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Blob'a çevir
            canvas.toBlob(function (blob) {
                if (blob) {
                    // Dosya adını koru ama sıkıştırıldığını belirt
                    blob.name = file.name;
                    blob.lastModified = file.lastModified;
                    console.log('🗜️ Sıkıştırıldı:', file.name, 'Eski:', (file.size / 1024).toFixed(1) + 'KB', 'Yeni:', (blob.size / 1024).toFixed(1) + 'KB');
                    resolve(blob);
                } else {
                    resolve(file);
                }
            }, file.type, quality);
        };

        img.onerror = function () {
            resolve(file);
        };

        var reader = new FileReader();
        reader.onload = function (e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function createThumbnail(file) {
    var previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;

    // Thumbnail container oluştur
    var thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'thumbnail-item';
    thumbnailDiv.setAttribute('data-file-id', file.uniqueId);

    var fileSize = (file.size / 1024 / 1024).toFixed(1);
    var fileName = file.name;

    // Uzun dosya adlarını kısalt
    if (fileName.length > 15) {
        var ext = fileName.substring(fileName.lastIndexOf('.'));
        fileName = fileName.substring(0, 12) + '...' + ext;
    }

    // Dosya tipine göre thumbnail
    if (file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(heic|heif)$/)) {
        // Resim thumbnail'i
        var reader = new FileReader();
        reader.onload = function (e) {
            thumbnailDiv.innerHTML =
                '<div class="thumbnail-image">' +
                '<img src="' + e.target.result + '" alt="' + file.name + '">' +
                '<button class="remove-btn" onclick="removeFile(\'' + file.uniqueId + '\')">' +
                '<i class="fas fa-times"></i>' +
                '</button>' +
                '</div>' +
                '<div class="thumbnail-info">' +
                '<div class="file-name" title="' + file.name + '">' + fileName + '</div>' +
                '<div class="file-size">' + fileSize + ' MB</div>' +
                '</div>';
        };
        reader.readAsDataURL(file);
    } else {
        // Video thumbnail'i
        thumbnailDiv.innerHTML =
            '<div class="thumbnail-image video-thumbnail">' +
            '<i class="fas fa-play-circle"></i>' +
            '<div class="video-overlay">VIDEO</div>' +
            '<button class="remove-btn" onclick="removeFile(\'' + file.uniqueId + '\')">' +
            '<i class="fas fa-times"></i>' +
            '</button>' +
            '</div>' +
            '<div class="thumbnail-info">' +
            '<div class="file-name" title="' + file.name + '">' + fileName + '</div>' +
            '<div class="file-size">' + fileSize + ' MB</div>' +
            '</div>';
    }

    // Container'a ekle
    previewContainer.appendChild(thumbnailDiv);

    // Animate in
    setTimeout(function () {
        thumbnailDiv.classList.add('animate-in');
    }, 50);
}

function removeFile(fileId) {
    console.log('🗑️ Dosya kaldırılıyor:', fileId);

    // Array'den kaldır
    selectedFiles = selectedFiles.filter(function (file) {
        return file.uniqueId !== fileId;
    });

    // DOM'dan kaldır
    var thumbnailElement = document.querySelector('[data-file-id="' + fileId + '"]');
    if (thumbnailElement) {
        thumbnailElement.classList.add('animate-out');
        setTimeout(function () {
            if (thumbnailElement.parentNode) {
                thumbnailElement.parentNode.removeChild(thumbnailElement);
            }
        }, 300);
    }

    // UI'yi güncelle
    updateUI();

    showMessage('🗑️ Dosya kaldırıldı', 'info');
}

function updateUI() {
    var previewContainer = document.getElementById('previewContainer');
    var fileStats = document.getElementById('fileStats');
    var fileCountElement = document.getElementById('fileCount');
    var totalSizeElement = document.getElementById('totalSize');
    var uploadBtn = document.querySelector('.upload-btn');

    // Dosya sayısı ve toplam boyut hesapla
    var totalSize = 0;
    for (var i = 0; i < selectedFiles.length; i++) {
        totalSize += selectedFiles[i].size;
    }
    var totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);

    // Bilgileri güncelle
    if (fileCountElement) {
        fileCountElement.textContent = selectedFiles.length;
    }

    if (totalSizeElement) {
        totalSizeElement.textContent = totalSizeMB + ' MB';
    }

    // File stats'ı göster/gizle
    if (fileStats) {
        if (selectedFiles.length > 0) {
            fileStats.style.display = 'flex';
        } else {
            fileStats.style.display = 'none';
        }
    }

    // Preview container'ı göster/gizle
    if (previewContainer) {
        if (selectedFiles.length > 0) {
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
    }

    // Upload butonunu aktif/pasif yap
    if (uploadBtn) {
        if (selectedFiles.length > 0) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-rocket"></i> ' + selectedFiles.length + ' Dosyayı Hızlıca Yükle';
            uploadBtn.style.opacity = '1';
        } else {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Önce dosya seçin';
            uploadBtn.style.opacity = '0.6';
        }
    }
}

function testBackend() {
    console.log('🔍 Backend test ediliyor...');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/', true);
    xhr.timeout = 5000; // Daha hızlı timeout

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ Backend çalışıyor');
            showMessage('🌐 Sunucu hazır - Hızlı yükleme aktif!', 'info');
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

    // Upload başlat - hızlı mode
    startFastUpload();
}

function startFastUpload() {
    isUploading = true;

    console.log('🚀 ' + selectedFiles.length + ' dosya hızlı yükleme başlıyor...');

    // UI'yi güncelle
    disableUploadButton();
    showProgressModal();
    updateProgress(0, 'Dosyalar hazırlanıyor...');

    // Dosyaları sıkıştır ve paralel yükle
    compressAndUploadFiles();
}

function compressAndUploadFiles() {
    console.log('🗜️ Dosyalar sıkıştırılıyor...');

    var compressionPromises = [];

    for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        compressionPromises.push(compressImage(file, 1920, 0.8)); // Max 1920px, %80 kalite
    }

    Promise.all(compressionPromises).then(function (compressedFiles) {
        console.log('✅ Tüm dosyalar sıkıştırıldı, paralel yükleme başlıyor...');
        updateProgress(10, 'Paralel yükleme başlatılıyor...');

        // Paralel yükleme başlat
        uploadFilesParallel(compressedFiles);

    }).catch(function (error) {
        console.error('❌ Sıkıştırma hatası:', error);
        // Sıkıştırma başarısızsa orijinal dosyalarla devam et
        uploadFilesParallel(selectedFiles);
    });
}

function uploadFilesParallel(filesToUpload) {
    var uploadPromises = [];
    var maxConcurrent = 3; // Aynı anda maksimum 3 dosya
    var completed = 0;

    // Dosyaları gruplara böl
    for (var i = 0; i < filesToUpload.length; i += maxConcurrent) {
        var batch = filesToUpload.slice(i, i + maxConcurrent);

        for (var j = 0; j < batch.length; j++) {
            var file = batch[j];
            uploadPromises.push(uploadSingleFile(file, i + j + 1, filesToUpload.length));
        }
    }

    // Tüm upload'ları başlat
    Promise.allSettled(uploadPromises).then(function (results) {
        handleParallelUploadResults(results, filesToUpload);
    });
}

function uploadSingleFile(file, fileIndex, totalFiles) {
    return new Promise(function (resolve, reject) {
        var formData = new FormData();
        formData.append('file', file);

        var xhr = new XMLHttpRequest();

        // Progress tracking
        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                var fileProgress = Math.round((e.loaded / e.total) * 100);
                var overallProgress = 10 + Math.round(((fileIndex - 1) / totalFiles) * 80) + Math.round((fileProgress / totalFiles) * 80 / 100);
                updateProgress(overallProgress, 'Yükleniyor: ' + file.name + ' (' + fileProgress + '%)');
            }
        });

        xhr.addEventListener('load', function () {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log('✅ Upload başarılı:', file.name);
                    resolve({
                        success: true,
                        file: file,
                        response: response
                    });
                } catch (error) {
                    console.error('❌ Parse hatası:', file.name);
                    reject({
                        success: false,
                        file: file,
                        error: 'Sunucu yanıtı okunamadı'
                    });
                }
            } else {
                console.error('❌ HTTP hatası:', file.name, xhr.status);
                reject({
                    success: false,
                    file: file,
                    error: 'Sunucu hatası: ' + xhr.status
                });
            }
        });

        xhr.addEventListener('error', function () {
            console.error('❌ Network hatası:', file.name);
            reject({
                success: false,
                file: file,
                error: 'İnternet bağlantısı hatası'
            });
        });

        // Daha kısa timeout - hızlı yanıt
        xhr.timeout = 60000; // 1 dakika
        xhr.addEventListener('timeout', function () {
            console.error('❌ Timeout:', file.name);
            reject({
                success: false,
                file: file,
                error: 'Yükleme çok uzun sürdü'
            });
        });

        xhr.open('POST', API_BASE_URL + '/api/upload');
        xhr.send(formData);
    });
}

function handleParallelUploadResults(results, filesToUpload) {
    var successFiles = [];
    var errorFiles = [];

    results.forEach(function (result) {
        if (result.status === 'fulfilled') {
            successFiles.push(result.value);
        } else {
            errorFiles.push(result.reason);
        }
    });

    console.log('📊 Paralel upload tamamlandı. Başarılı:', successFiles.length, 'Hatalı:', errorFiles.length);

    updateProgress(100, 'Tamamlandı!');

    setTimeout(function () {
        hideProgressModal();

        var message = '';
        if (successFiles.length > 0 && errorFiles.length === 0) {
            message = '🚀 ' + successFiles.length + ' dosya hızlıca yüklendi!';
            showMessage(message, 'success');
            clearAllFiles();
        } else if (successFiles.length > 0 && errorFiles.length > 0) {
            message = '⚠️ ' + successFiles.length + ' dosya yüklendi, ' + errorFiles.length + ' dosyada hata oluştu.';
            showMessage(message, 'warning');
            removeSuccessfulFiles(successFiles);
        } else {
            message = '❌ Hiçbir dosya yüklenemedi! (' + errorFiles.length + ' hata)';
            showMessage(message, 'error');
        }

        isUploading = false;
        updateUI();

    }, 1000); // Daha hızlı sonuç gösterimi
}

function disableUploadButton() {
    var btn = document.querySelector('.upload-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-rocket fa-spin"></i> Hızlı Yükleniyor...';
        btn.style.opacity = '0.7';
    }
}

function removeSuccessfulFiles(successFiles) {
    for (var i = 0; i < successFiles.length; i++) {
        var successFileId = successFiles[i].file.uniqueId;
        removeFile(successFileId);
    }
}

function clearAllFiles() {
    selectedFiles = [];
    var previewContainer = document.getElementById('previewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    updateUI();
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
            '<i class="fas fa-rocket pulse"></i>' +
            '<h3>Hızlı Yükleme</h3>' +
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

    if (fill) {
        fill.style.width = percent + '%';
        // Hızlı yükleme için farklı renkler
        if (percent < 30) {
            fill.style.background = 'linear-gradient(90deg, #3b82f6, #1d4ed8)'; // Mavi
        } else if (percent < 70) {
            fill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)'; // Turuncu
        } else {
            fill.style.background = 'linear-gradient(90deg, #10b981, #059669)'; // Yeşil
        }
    }
    if (text) text.textContent = percent + '%';
    if (msg) msg.textContent = message;
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

    var existing = document.querySelector('.message-toast');
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }

    var toast = document.createElement('div');
    toast.className = 'message-toast ' + type;
    toast.innerHTML =
        '<div class="toast-content">' +
        '<i class="fas fa-' + getMessageIcon(type) + '"></i>' +
        '<span>' + text + '</span>' +
        '</div>';

    document.body.appendChild(toast);

    setTimeout(function () {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, type === 'error' ? 8000 : 4000); // Daha hızlı mesaj temizleme
}

function getMessageIcon(type) {
    var icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'rocket'
    };
    return icons[type] || 'info-circle';
}

// Link kopyalama fonksiyonu
function copyToClipboard() {
    var url = 'https://ahmetkaanmuktar.github.io/dugun_resim_video/examples/dugun-yunus-hilal/';

    if (navigator.clipboard && navigator.clipboard.writeText) {
        // Modern browsers
        navigator.clipboard.writeText(url).then(function () {
            showMessage('🔗 Link panoya kopyalandı!', 'success');
        }).catch(function (err) {
            fallbackCopyToClipboard(url);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(url);
    }
}

function fallbackCopyToClipboard(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        if (successful) {
            showMessage('🔗 Link panoya kopyalandı!', 'success');
        } else {
            showMessage('❌ Link kopyalanamadı. Manuel olarak kopyalayın.', 'error');
        }
    } catch (err) {
        showMessage('❌ Link kopyalanamadı. Manuel olarak kopyalayın.', 'error');
    }

    document.body.removeChild(textArea);
}

console.log('✅ Hızlı Paralel Upload Düğün Sistemi yüklendi!'); 