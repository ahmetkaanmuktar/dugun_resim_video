//  2025 Basit Mobil Düğün Fotoğraf Sistemi
var selectedFiles = [];
var isUploading = false;
var isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
var API_BASE_URL = 'https://dugun-wep-app-heroku-03a36843f3d6.herokuapp.com';

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () { initializeSystem(); }, 100);
});

function initializeSystem() {
    hideLoadingScreen();
    setupFileInput();
    var uploadForm = document.getElementById('uploadForm');
    if (uploadForm) uploadForm.addEventListener('submit', handleUpload);
    testBackend();
    showMessage(' Sistem hazır!', 'success');
}

function hideLoadingScreen() {
    var loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'none';
}

function setupFileInput() {
    var fileInput = document.getElementById('fileInput');
    var label = document.querySelector('.file-input-label');
    if (!fileInput || !label) return;
    
    fileInput.setAttribute('multiple', 'multiple');
    fileInput.setAttribute('accept', 'image/*,video/*');
    fileInput.style.position = 'absolute';
    fileInput.style.left = '0';
    fileInput.style.top = '0';
    fileInput.style.width = '100%';
    fileInput.style.height = '100%';
    fileInput.style.opacity = '0';
    fileInput.style.cursor = 'pointer';
    fileInput.style.zIndex = '2';

    fileInput.addEventListener('change', function (e) {
        if (!e.target.files || e.target.files.length === 0) return;
        addNewFiles(e.target.files);
        e.target.value = '';
    });

    label.addEventListener('click', function (e) {
        if (isUploading) {
            e.preventDefault();
            e.stopPropagation();
            showMessage(' Yükleme devam ediyor...', 'warning');
            return false;
        }
    });

    if (isMobile) {
        label.addEventListener('touchstart', function (e) {
            label.style.transform = 'scale(0.98)';
            label.style.opacity = '0.9';
        }, { passive: true });
        label.addEventListener('touchend', function (e) {
            setTimeout(function() {
                label.style.transform = 'scale(1)';
                label.style.opacity = '1';
            }, 100);
        }, { passive: true });
    }
}

function addNewFiles(files) {
    var addedCount = 0;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (isFileAlreadySelected(file) || !validateFile(file)) continue;
        file.uniqueId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        selectedFiles.push(file);
        addedCount++;
        createThumbnail(file);
    }
    if (addedCount > 0) showMessage(' ' + addedCount + ' dosya eklendi!', 'success');
    updateUI();
}

function isFileAlreadySelected(newFile) {
    for (var i = 0; i < selectedFiles.length; i++) {
        if (selectedFiles[i].name === newFile.name && selectedFiles[i].size === newFile.size) return true;
    }
    return false;
}

function validateFile(file) {
    var isVideo = file.type.startsWith('video/') || file.name.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
    var maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize || file.size < 100) return false;
    var validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

function createThumbnail(file) {
    var previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;
    var thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'thumbnail-item';
    thumbnailDiv.setAttribute('data-file-id', file.uniqueId);
    var fileSize = (file.size / 1024 / 1024).toFixed(1);
    var fileName = file.name.length > 15 ? file.name.substring(0, 12) + '...' + file.name.substring(file.name.lastIndexOf('.')) : file.name;

    if (file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(heic|heif)$/)) {
        var reader = new FileReader();
        reader.onload = function (e) {
            thumbnailDiv.innerHTML = '<div class="thumbnail-image"><img src="' + e.target.result + '" alt="' + file.name + '"><button class="remove-btn" onclick="removeFile(\'' + file.uniqueId + '\')"><i class="fas fa-times"></i></button></div><div class="thumbnail-info"><div class="file-name" title="' + file.name + '">' + fileName + '</div><div class="file-size">' + fileSize + ' MB</div></div>';
        };
        reader.readAsDataURL(file);
    } else {
        thumbnailDiv.innerHTML = '<div class="thumbnail-image video-thumbnail"><i class="fas fa-play-circle"></i><div class="video-overlay">VIDEO</div><button class="remove-btn" onclick="removeFile(\'' + file.uniqueId + '\')"><i class="fas fa-times"></i></button></div><div class="thumbnail-info"><div class="file-name" title="' + file.name + '">' + fileName + '</div><div class="file-size">' + fileSize + ' MB</div></div>';
    }
    previewContainer.appendChild(thumbnailDiv);
    setTimeout(() => thumbnailDiv.classList.add('animate-in'), 50);
}

function removeFile(fileId) {
    if (isUploading) {
        showMessage(' Yükleme devam ediyor!', 'warning');
        return;
    }
    selectedFiles = selectedFiles.filter(file => file.uniqueId !== fileId);
    var element = document.querySelector('[data-file-id="' + fileId + '"]');
    if (element && element.parentNode) element.parentNode.removeChild(element);
    updateUI();
    showMessage(' Dosya kaldırıldı', 'info');
}

function updateUI() {
    var previewContainer = document.getElementById('previewContainer');
    var fileStats = document.getElementById('fileStats');
    var fileCountElement = document.getElementById('fileCount');
    var totalSizeElement = document.getElementById('totalSize');
    var uploadBtn = document.querySelector('.upload-btn');

    var totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    var totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);

    if (fileCountElement) fileCountElement.textContent = selectedFiles.length;
    if (totalSizeElement) totalSizeElement.textContent = totalSizeMB + ' MB';
    if (fileStats) fileStats.style.display = selectedFiles.length > 0 ? 'flex' : 'none';
    if (previewContainer) previewContainer.style.display = selectedFiles.length > 0 ? 'block' : 'none';

    if (uploadBtn) {
        if (selectedFiles.length > 0) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> ' + selectedFiles.length + ' Dosyayı Yükle';
            uploadBtn.style.opacity = '1';
        } else {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Önce dosya seçin';
            uploadBtn.style.opacity = '0.6';
        }
    }
}

function testBackend() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/', true);
    xhr.timeout = 3000;
    xhr.onload = () => showMessage(xhr.status >= 200 && xhr.status < 300 ? ' Sunucu hazır!' : ' Sunucu sorunu var.', xhr.status >= 200 && xhr.status < 300 ? 'info' : 'warning');
    xhr.onerror = () => showMessage(' İnternet bağlantınızı kontrol edin.', 'warning');
    xhr.send();
}

function handleUpload(event) {
    event.preventDefault();
    if (isUploading || !selectedFiles || selectedFiles.length === 0) {
        showMessage(' Önce dosya seçin!', 'error');
        return false;
    }
    startUpload();
    return false;
}

function startUpload() {
    isUploading = true;
    disableUploadButton();
    showProgressModal();
    updateProgress(0, 'Dosyalar hazırlanıyor...');
    uploadFilesParallel(selectedFiles);
}

function uploadFilesParallel(filesToUpload) {
    var uploadPromises = filesToUpload.map((file, i) => uploadSingleFile(file, i + 1, filesToUpload.length));
    Promise.allSettled(uploadPromises).then(handleUploadResults);
}

function uploadSingleFile(file, fileIndex, totalFiles) {
    return new Promise(resolve => {
        var uploaderName = document.getElementById('uploaderName');
        var formData = new FormData();
        formData.append('file', file);
        if (uploaderName && uploaderName.value.trim()) formData.append('uploader_name', uploaderName.value.trim());

        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) {
                var fileProgress = Math.round((e.loaded / e.total) * 100);
                var overallProgress = 10 + Math.round(((fileIndex - 1) / totalFiles) * 80) + Math.round((fileProgress / totalFiles) * 80 / 100);
                updateProgress(overallProgress, 'Yükleniyor: ' + file.name + ' (' + fileProgress + '%)');
            }
        });
        xhr.onload = () => resolve({ file: file, success: xhr.status >= 200 && xhr.status < 300 });
        xhr.onerror = () => resolve({ file: file, success: false });
        xhr.timeout = 30000;
        xhr.open('POST', API_BASE_URL + '/upload', true);
        xhr.send(formData);
    });
}

function handleUploadResults(results) {
    var successCount = 0;
    var successFiles = [];
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
            successFiles.push(result.value.file);
        }
    });
    updateProgress(100, 'Upload tamamlandı!');
    setTimeout(() => {
        hideProgressModal();
        isUploading = false;
        if (successCount > 0) {
            showMessage(' ' + successCount + ' dosya başarıyla yüklendi!', 'success');
            removeSuccessfulFiles(successFiles);
        }
        updateUI();
    }, 1000);
}

function disableUploadButton() {
    var uploadBtn = document.querySelector('.upload-btn');
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        uploadBtn.style.opacity = '0.6';
    }
}

function removeSuccessfulFiles(successFiles) {
    successFiles.forEach(successFile => {
        selectedFiles = selectedFiles.filter(file => file.uniqueId !== successFile.uniqueId);
        var element = document.querySelector('[data-file-id="' + successFile.uniqueId + '"]');
        if (element && element.parentNode) element.parentNode.removeChild(element);
    });
}

function clearAllFiles() {
    if (isUploading) {
        showMessage(' Yükleme devam ediyor!', 'warning');
        return;
    }
    selectedFiles = [];
    var previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
    updateUI();
    showMessage(' Tüm dosyalar temizlendi', 'info');
}

function showProgressModal() {
    var modal = document.getElementById('progressModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'progressModal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content"><div class="modal-header"><h3><i class="fas fa-cloud-upload-alt"></i> Dosyalar Yükleniyor</h3></div><div class="progress-container"><div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div><div class="progress-text" id="progressText">0%</div></div><div class="progress-message" id="progressMessage">Hazırlanıyor...</div></div>';
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function updateProgress(percent, message) {
    var progressFill = document.getElementById('progressFill');
    var progressText = document.getElementById('progressText');
    var progressMessage = document.getElementById('progressMessage');
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = Math.round(percent) + '%';
    if (progressMessage) progressMessage.textContent = message;
}

function hideProgressModal() {
    var modal = document.getElementById('progressModal');
    if (modal) modal.style.display = 'none';
}

function showMessage(text, type) {
    var messageDiv = document.createElement('div');
    messageDiv.className = 'message-toast message-' + type;
    messageDiv.innerHTML = getMessageIcon(type) + ' ' + text;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.classList.add('show'), 100);
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageDiv.parentNode) messageDiv.parentNode.removeChild(messageDiv);
        }, 300);
    }, 2500);
}

function getMessageIcon(type) {
    const icons = {
        'success': '<i class="fas fa-check-circle"></i>',
        'error': '<i class="fas fa-exclamation-circle"></i>',
        'warning': '<i class="fas fa-exclamation-triangle"></i>',
        'info': '<i class="fas fa-info-circle"></i>'
    };
    return icons[type] || icons['info'];
}

function copyToClipboard() {
    var url = 'https://ahmetkaanmuktar.github.io/dugun_resim_video/examples/dugun-yunus-hilal/';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showMessage(' Link kopyalandı!', 'success')).catch(() => fallbackCopyToClipboard(url));
    } else {
        fallbackCopyToClipboard(url);
    }
}

function fallbackCopyToClipboard(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showMessage(' Link kopyalandı!', 'success');
    } catch (err) {
        showMessage(' Kopyalama başarısız.', 'error');
    }
    document.body.removeChild(textArea);
}

function downloadQRCode() {
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=https://ahmetkaanmuktar.github.io/dugun_resim_video/examples/dugun-yunus-hilal/';
    var link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'dugun-qr-kod.png';
    link.target = '_blank';
    link.click();
    showMessage(' QR kod indiriliyor...', 'info');
}
