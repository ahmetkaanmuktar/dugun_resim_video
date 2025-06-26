import os
import json
import time
from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import logging
from datetime import datetime
import math

app = Flask(__name__)
CORS(app, 
     origins=["https://ahmetkaanmuktar.github.io", "http://localhost:3000", "http://127.0.0.1:5000"],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Güvenlik ve takip için logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Güvenlik log dosyası
SECURITY_LOG_FILE = 'uploads/security_log.txt'

def log_security_event(event_type, user_name, file_name, ip_address, user_agent, additional_info=""):
    """Güvenlik olaylarını kaydet"""
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {event_type} | User: {user_name} | File: {file_name} | IP: {ip_address} | Agent: {user_agent[:100]} | Info: {additional_info}\n"
        
        # Uploads klasörü yoksa oluştur
        if not os.path.exists('uploads'):
            os.makedirs('uploads')
            
        with open(SECURITY_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_entry)
        
        # Konsola da yazdır
        print(f"🔒 SECURITY LOG: {log_entry.strip()}")
        
    except Exception as e:
        print(f"Security logging hatası: {e}")

# Render için environment variable'ları
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'avi', 'webp', 'mkv', 'webm', 'heic', 'heif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Maximum file size: 100MB for videos, 50MB for images
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Google servis hesabı JSON'u environment variable'dan al, yoksa dosyadan oku
SERVICE_ACCOUNT_JSON = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON', '')
SERVICE_ACCOUNT_JSON_B64 = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON_B64', '')
SERVICE_ACCOUNT_FILE = 'service_account.json'

# Base64 encoded JSON varsa önce onu decode et
if SERVICE_ACCOUNT_JSON_B64:
    try:
        import base64
        SERVICE_ACCOUNT_JSON = base64.b64decode(SERVICE_ACCOUNT_JSON_B64).decode('utf-8')
        print("Base64 encoded service account JSON başarıyla decode edildi")
    except Exception as e:
        print(f"Base64 decode hatası: {e}")

# Eğer environment variable boşsa, dosyadan oku
if not SERVICE_ACCOUNT_JSON and os.path.exists(SERVICE_ACCOUNT_FILE):
    try:
        print(f"Service account dosyası okundu: {os.path.abspath(SERVICE_ACCOUNT_FILE)}")
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            SERVICE_ACCOUNT_JSON = f.read()
    except Exception as e:
        print(f"Service account dosyası okuma hatası: {e}")

# ÖNEMLİ: Aşağıdaki adımları izleyin:
# 1. Google Drive'da yeni bir klasör oluşturun
# 2. Klasörü servis hesabı ile paylaşın: dugun-n-san@dugunnn.iam.gserviceaccount.com
# 3. Klasörün ID'sini aşağıdaki FOLDER_ID değişkenine yazın
# 4. Uygulamayı yeniden başlatın
# NOT: Klasör ID'si, klasör URL'sindeki "folders/" sonrasındaki koddur
# Örnek: https://drive.google.com/drive/folders/BURAYA_YENI_KLASOR_ID_GELECEK?usp=sharing
FOLDER_ID = os.getenv('GOOGLE_DRIVE_FOLDER_ID', '1IHkzE-ki4tfFFwOZ4i5TLVlD5a_ifkqP')
# Daha geniş izinler kullanalım
SCOPES = ['https://www.googleapis.com/auth/drive']

def get_credentials():
    """Google Drive API kimlik bilgilerini al"""
    try:
        # Doğrudan SERVICE_ACCOUNT_JSON değişkeninden al
        try:
            json_data = json.loads(SERVICE_ACCOUNT_JSON)
            print("SERVICE_ACCOUNT_JSON başarıyla ayrıştırıldı")
            
            credentials = service_account.Credentials.from_service_account_info(
                json_data, scopes=SCOPES)
            print("Credentials başarıyla oluşturuldu!")
            return credentials
        except json.JSONDecodeError as je:
            print(f"JSON ayrıştırma hatası: {je}")
        except Exception as e:
            print(f"Credentials oluşturma hatası: {e}")
    except Exception as e:
        print(f"Credentials genel hata: {e}")
    
    print("Kimlik bilgileri oluşturulamadı!")
    return None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def backup_to_drive(filepath, filename):
    """Dosyayı ana Drive klasörüne yedekle (geriye uyumluluk)"""
    return backup_to_drive_folder(filepath, filename, FOLDER_ID)

def backup_to_drive_folder(filepath, filename, folder_id):
    """Dosyayı belirtilen Drive klasörüne yedekle"""
    try:
        print(f"Drive'a yedekleme başlatılıyor: {filename} -> {folder_id}")
        # Doğrudan SERVICE_ACCOUNT_JSON değişkeninden kimlik bilgilerini al
        try:
            json_data = json.loads(SERVICE_ACCOUNT_JSON)
            print(f"Servis hesabı: {json_data.get('client_email')}")
            print(f"Hedef klasör ID: {folder_id}")
            
            credentials = service_account.Credentials.from_service_account_info(
                json_data, scopes=SCOPES)
            
            service = build('drive', 'v3', credentials=credentials)
            
            # Önce klasörün erişilebilir olup olmadığını kontrol et
            try:
                folder_info = service.files().get(fileId=folder_id, fields='id,name').execute()
                print(f"Hedef klasör bulundu: {folder_info.get('name', 'Unknown')}")
            except Exception as e:
                print(f"Klasör erişim hatası: {e}")
                return None
                
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }
            media = MediaFileUpload(filepath, resumable=True)
            file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            print(f"Drive yedekleme başarılı: {filename} -> {file.get('id')}")
            return file.get('id')
        except Exception as e:
            print(f"Drive yedekleme hatası (kimlik bilgileri): {e}")
            return None
    except Exception as e:
        print(f"Drive backup genel hata: {e}")
        return None

@app.route('/')
def home():
    return jsonify({
        'message': 'Düğün Fotoğraf Yükleme API çalışıyor!', 
        'status': 'online',
        'storage': 'local_with_drive_backup',
        'folder_id': FOLDER_ID,
        'has_credentials': SERVICE_ACCOUNT_JSON is not None,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/health')
@app.route('/healthz')
def health_check():
    """Health check endpoint for keeping Render awake"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend is alive and running!',
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'uptime': 'Backend active'
    }), 200

@app.route('/wake')
def wake_up():
    """Wake up endpoint to manually restart the backend"""
    return jsonify({
        'status': 'awake', 
        'message': '🚀 Backend uyanıyor! Lütfen 30-60 saniye bekleyin...',
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    }), 200

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Yüklenen dosyaları serve et"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        print("\n--- UPLOAD BAŞLATILIYOR ---")
        print(f"Request method: {request.method}")
        print(f"Content-Type: {request.content_type}")
        print(f"User-Agent: {request.headers.get('User-Agent', 'Unknown')}")
        print(f"Request files: {request.files}")
        print(f"Request form: {request.form}")
        print(f"Content-Length: {request.headers.get('Content-Length', 'Unknown')}")
        
        # Güvenlik bilgileri
        user_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        if 'file' not in request.files:
            print("Hata: 'file' anahtarı bulunamadı")
            print(f"Available keys: {list(request.files.keys())}")
            print(f"Raw data length: {len(request.get_data())}")
            return jsonify({'error': 'Dosya bulunamadı', 'debug': {'available_keys': list(request.files.keys()), 'content_type': request.content_type}}), 400
        
        file = request.files['file']
        uploader_name = request.form.get('uploader_name', '').strip()
        
        # İSİM ZORUNLU KONTROL - Backend'de de kontrol et
        if not uploader_name or len(uploader_name) < 2:
            log_security_event("UPLOAD_REJECTED", uploader_name or "UNKNOWN", file.filename or "unknown_file", user_ip, user_agent, "İsim eksik veya çok kısa")
            return jsonify({'error': 'İsim zorunludur! En az 2 karakter olmalıdır.'}), 400
        
        # File size calculation
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        # Video file detection
        is_video = (file.content_type and file.content_type.startswith('video/')) or \
                   (file.filename and any(file.filename.lower().endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']))
        
        print(f"Dosya adı: {file.filename}")
        print(f"Content-Type: {file.content_type}")
        print(f"Dosya boyutu: {file_size} bytes ({file_size / 1024 / 1024:.1f} MB)")
        print(f"Video dosyası: {is_video}")
        print(f"Yükleyen: {uploader_name if uploader_name else 'Anonim'}")
        
        # File size validation
        max_size = 100 * 1024 * 1024 if is_video else 50 * 1024 * 1024  # 100MB for video, 50MB for image
        if file_size > max_size:
            max_mb = 100 if is_video else 50
            print(f"Hata: Dosya çok büyük: {file_size} > {max_size}")
            return jsonify({'error': f'Dosya çok büyük! {"Video" if is_video else "Resim"} dosyaları max {max_mb}MB olabilir.'}), 400
        
        if not file or file.filename == '':
            print("Hata: Dosya adı boş veya dosya yok")
            return jsonify({'error': 'Dosya seçilmedi'}), 400
        
        if file and allowed_file(file.filename):
            # Unique filename oluştur (kullanıcı adı ile)
            timestamp = int(time.time())
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            
            # Dosya adına kullanıcı bilgisini ekle
            if uploader_name:
                uploader_safe = secure_filename(uploader_name)[:20]  # İlk 20 karakter
                unique_filename = f"{uploader_safe}_{name}_{timestamp}{ext}"
            else:
                unique_filename = f"anonim_{name}_{timestamp}{ext}"
            
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            print(f"{'📹 Video' if is_video else '📸 Resim'} dosyası kaydediliyor: {filepath}")
            file.save(filepath)
            
            # Saved file size verification
            saved_size = os.path.getsize(filepath)
            print(f"Dosya başarıyla kaydedildi: {filepath}")
            print(f"Kaydedilen boyut: {saved_size} bytes ({saved_size / 1024 / 1024:.1f} MB)")
            
            if saved_size != file_size:
                print(f"⚠️ Boyut uyuşmazlığı: Beklenen {file_size}, Kaydedilen {saved_size}")
            
            # Drive'a yedekleme (opsiyonel - hata olursa da devam eder)
            print(f"Drive'a yedekleme başlatılıyor...")
            
            # Düğün kodunu form'dan al (eğer varsa)
            wedding_code = request.form.get('wedding_code', '').strip()
            drive_folder_id = FOLDER_ID  # Default ana klasör
            
            # Eğer düğün kodu belirtilmişse, o düğünün klasörüne yükle
            if wedding_code:
                wedding_info = get_wedding_info(wedding_code)
                if wedding_info and wedding_info.get('drive_folder_id'):
                    drive_folder_id = wedding_info['drive_folder_id']
                    print(f"Düğün klasörüne yükleniyor: {wedding_code} -> {drive_folder_id}")
            
            drive_id = backup_to_drive_folder(filepath, unique_filename, drive_folder_id)
            drive_status = "backed_up" if drive_id else "local_only"
            print(f"Drive yedekleme durumu: {drive_status}, Drive ID: {drive_id}")
            
            # Başarılı upload'u güvenlik loguna kaydet
            log_security_event("FILE_UPLOADED", uploader_name, unique_filename, user_ip, user_agent, 
                             f"Size: {file_size}bytes, Drive: {drive_status}, DriveID: {drive_id}")
            
            result = {
                'success': True, 
                'filename': unique_filename,
                'url': url_for('uploaded_file', filename=unique_filename, _external=True),
                'drive_id': drive_id,
                'drive_status': drive_status
            }
            print(f"Başarılı sonuç: {result}")
            print("--- UPLOAD TAMAMLANDI ---\n")
            return jsonify(result), 200
        else:
            print(f"Hata: Geçersiz dosya formatı. Dosya: {file.filename}")
            return jsonify({'error': 'Geçersiz dosya formatı. Desteklenen: JPG, PNG, GIF, MP4, MOV, AVI, MKV, WEBM, HEIC, HEIF'}), 400
    
    except Exception as e:
        print(f"Upload genel hata: {e}")
        import traceback
        print(f"Stack trace: {traceback.format_exc()}")
        return jsonify({'error': f'Sunucu hatası: {str(e)}'}), 500

@app.route('/api/gallery', methods=['GET'])
def gallery():
    try:
        # Basit güvenlik kontrolü
        auth_header = request.headers.get('Authorization')
        if not auth_header or auth_header != 'Bearer dugun-gallery-key-2024':
            return jsonify({'success': False, 'error': 'Yetkisiz erişim'}), 403
        
        # Uploads klasöründeki dosyaları al
        files = []
        upload_path = app.config['UPLOAD_FOLDER']
        
        if os.path.exists(upload_path):
            for filename in os.listdir(upload_path):
                if allowed_file(filename):
                    filepath = os.path.join(upload_path, filename)
                    if os.path.isfile(filepath):
                        # Dosya bilgilerini al
                        stat = os.stat(filepath)
                        file_size = stat.st_size
                        created_time = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(stat.st_ctime))
                        
                        # MIME type belirle
                        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                        mime_type = 'image/jpeg'  # default
                        if ext in ['png']: mime_type = 'image/png'
                        elif ext in ['gif']: mime_type = 'image/gif'
                        elif ext in ['mp4']: mime_type = 'video/mp4'
                        elif ext in ['mov']: mime_type = 'video/quicktime'
                        elif ext in ['avi']: mime_type = 'video/x-msvideo'
                        elif ext in ['webp']: mime_type = 'image/webp'
                        
                        file_url = url_for('uploaded_file', filename=filename, _external=True)
                        
                        files.append({
                            'id': filename,
                            'name': filename,
                            'mimeType': mime_type,
                            'thumbnailLink': file_url if mime_type.startswith('image/') else None,
                            'webViewLink': file_url,
                            'iconLink': file_url,
                            'createdTime': created_time,
                            'size': file_size
                        })
        
        # Dosyaları tarihe göre sırala (en yeni önce)
        files.sort(key=lambda x: x.get('createdTime', ''), reverse=True)
        
        return jsonify({'success': True, 'files': files, 'count': len(files), 'source': 'local_storage'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Galeri yüklenemedi: {str(e)}'}), 500

@app.route('/api/drive-gallery', methods=['GET'])
def drive_gallery():
    """Google Drive'daki dosyaları listele"""
    try:
        # Basit güvenlik kontrolü
        auth_header = request.headers.get('Authorization')
        if not auth_header or auth_header != 'Bearer dugun-gallery-key-2024':
            return jsonify({'success': False, 'error': 'Yetkisiz erişim'}), 403
            
        print("\n--- DRIVE GALERİ BAŞLATILIYOR ---")
        credentials = get_credentials()
        
        if not credentials:
            print("Drive kimlik bilgileri bulunamadı")
            return jsonify({'success': False, 'error': 'Drive kimlik bilgileri bulunamadı'}), 400
        
        print("Drive servisi kuruluyor...")
        service = build('drive', 'v3', credentials=credentials)
        
        # Klasördeki dosyaları listele
        print(f"Klasör dosyaları alınıyor: {FOLDER_ID}")
        results = service.files().list(
            q=f"parents in '{FOLDER_ID}' and (mimeType contains 'image/' or mimeType contains 'video/')",
            pageSize=100,
            fields="nextPageToken, files(id, name, mimeType, size, createdTime, thumbnailLink, webViewLink, iconLink, webContentLink)"
        ).execute()
        
        drive_files = results.get('files', [])
        print(f"Drive'da {len(drive_files)} dosya bulundu")
        
        # Dosyaları dönüştür
        formatted_files = []
        for file in drive_files:
            formatted_files.append({
                'id': file.get('id'),
                'name': file.get('name'),
                'mimeType': file.get('mimeType'),
                'size': int(file.get('size', 0)) if file.get('size') else 0,
                'createdTime': file.get('createdTime'),
                'thumbnailLink': file.get('thumbnailLink'),
                'webViewLink': file.get('webViewLink'),
                'iconLink': file.get('iconLink'),
                'downloadUrl': file.get('webContentLink')
            })
        
        # Dosyaları tarihe göre sırala (en yeni önce)
        formatted_files.sort(key=lambda x: x.get('createdTime', ''), reverse=True)
        
        print(f"Drive galeri başarıyla hazırlandı: {len(formatted_files)} dosya")
        print("--- DRIVE GALERİ TAMAMLANDI ---\n")
        
        return jsonify({
            'success': True, 
            'files': formatted_files, 
            'count': len(formatted_files), 
            'source': 'google_drive'
        })
    
    except Exception as e:
        print(f"Drive galeri hatası: {e}")
        return jsonify({'success': False, 'error': f'Drive galeri yüklenemedi: {str(e)}'}), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    """Site istatistikleri"""
    try:
        upload_path = app.config['UPLOAD_FOLDER']
        total_files = 0
        total_size = 0
        file_types = {}
        
        if os.path.exists(upload_path):
            for filename in os.listdir(upload_path):
                if allowed_file(filename):
                    filepath = os.path.join(upload_path, filename)
                    if os.path.isfile(filepath):
                        total_files += 1
                        total_size += os.path.getsize(filepath)
                        
                        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown'
                        file_types[ext] = file_types.get(ext, 0) + 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_files': total_files,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'file_types': file_types,
                'storage_type': 'local_with_drive_backup'
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/debug', methods=['GET'])
def debug_info():
    """Debug bilgileri - Drive bağlantısı test"""
    try:
        print("\n--- DEBUG BAŞLATILIYOR ---")
        # Credentials test
        credentials = get_credentials()
        has_credentials = credentials is not None
        print(f"Kimlik bilgileri oluşturuldu: {has_credentials}")
        
        # Drive bağlantı testi
        drive_test_result = None
        if credentials:
            try:
                print(f"Drive API bağlantısı kuruluyor...")
                service = build('drive', 'v3', credentials=credentials)
                
                # Önce dosya listesini kontrol et
                print(f"Dosya listesi alınıyor...")
                results = service.files().list(
                    pageSize=5,
                    fields="nextPageToken, files(id, name)"
                ).execute()
                files = results.get('files', [])
                print(f"Erişilebilir dosya sayısı: {len(files)}")
                
                # Klasör erişim testi
                print(f"Klasör erişimi test ediliyor: {FOLDER_ID}")
                try:
                    folder_info = service.files().get(fileId=FOLDER_ID, fields='id,name,permissions').execute()
                    drive_test_result = {
                        'folder_accessible': True,
                        'folder_name': folder_info.get('name', 'Unknown'),
                        'folder_id': folder_info.get('id')
                    }
                    print(f"Drive bağlantısı başarılı! Klasör adı: {folder_info.get('name', 'Unknown')}")
                except Exception as e:
                    drive_test_result = {
                        'folder_accessible': False,
                        'error': str(e)
                    }
                    print(f"Drive klasör erişim hatası: {e}")
            except Exception as e:
                drive_test_result = {
                    'api_accessible': False,
                    'error': str(e)
                }
                print(f"Drive API genel hata: {e}")
        
        print("--- DEBUG TAMAMLANDI ---\n")
        return jsonify({
            'success': True,
            'debug_info': {
                'has_service_account_json': SERVICE_ACCOUNT_JSON is not None,
                'has_credentials': has_credentials,
                'folder_id': FOLDER_ID,
                'drive_test': drive_test_result,
                'uploads_folder_exists': os.path.exists(app.config['UPLOAD_FOLDER']),
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }
        })
    
    except Exception as e:
        print(f"Debug genel hata: {e}")
        return jsonify({'success': False, 'error': str(e), 'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')})

# Galeri görüntüleme için özel endpoint (güvenli)
@app.route('/gallery-view', methods=['GET'])
def gallery_view():
    """Güvenli galeri görüntüleme sayfası"""
    return '''
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Düğün Fotoğraf Galerisi</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; background: #f5f5f5; }
            .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem; }
            .gallery img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            h1 { color: #333; margin-bottom: 1rem; }
            .info { color: #666; margin-bottom: 2rem; }
        </style>
    </head>
    <body>
        <h1>🎉 Düğün Fotoğraf Galerisi</h1>
        <div class="info">Sadece davetliler için özel galeri</div>
        <div id="gallery" class="gallery"></div>
        
        <script>
            async function loadGallery() {
                try {
                    const response = await fetch('/api/gallery', {
                        headers: { 'Authorization': 'Bearer dugun-gallery-key-2024' }
                    });
                    const data = await response.json();
                    
                    const gallery = document.getElementById('gallery');
                    if (data.success && data.files.length > 0) {
                        gallery.innerHTML = data.files.map(file => 
                            `<img src="${file.webViewLink}" alt="${file.name}" onclick="window.open('${file.webViewLink}', '_blank')">`
                        ).join('');
                    } else {
                        gallery.innerHTML = '<p>Henüz fotoğraf yüklenmemiş.</p>';
                    }
                } catch (error) {
                    document.getElementById('gallery').innerHTML = '<p>Galeri yüklenemedi.</p>';
                }
            }
            
            loadGallery();
        </script>
    </body>
    </html>
    '''

@app.route('/admin')
def admin_panel():
    """Ana admin paneli"""
    return '''
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔧 Admin Paneli</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; color: white; padding: 20px;
            }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
            .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .card {
                background: rgba(255,255,255,0.1); backdrop-filter: blur(20px);
                border-radius: 20px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);
                transition: all 0.3s ease; text-decoration: none; color: white;
            }
            .card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.15); }
            .card i { font-size: 2.5rem; margin-bottom: 20px; display: block; }
            .card h3 { font-size: 1.3rem; margin-bottom: 10px; }
            .card p { opacity: 0.9; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-cog"></i> Admin Paneli</h1>
                <p>Düğün sistemi yönetim paneli</p>
            </div>
            
            <div class="cards">
                <a href="/admin/wedding-codes" class="card">
                    <i class="fas fa-heart" style="color: #ff6b6b;"></i>
                    <h3>Düğün Yönetimi</h3>
                    <p>Düğün kodları oluştur, görüntüle ve yönet</p>
                </a>
                
                <a href="/admin/codes-dashboard" class="card">
                    <i class="fas fa-chart-bar" style="color: #10b981;"></i>
                    <h3>İstatistikler</h3>
                    <p>Düğün kodları ve kullanım istatistikleri</p>
                </a>
                
                <a href="/admin/security-dashboard" class="card">
                    <i class="fas fa-shield-alt" style="color: #f59e0b;"></i>
                    <h3>Güvenlik</h3>
                    <p>Güvenlik logları ve sistem izleme</p>
                </a>
                
                <a href="/wedding-owner/dashboard" class="card">
                    <i class="fas fa-users" style="color: #3b82f6;"></i>
                    <h3>Düğün Sahibi Paneli</h3>
                    <p>Genel kullanıcı paneli görünümü</p>
                </a>
            </div>
        </div>
        
        <script>
            // Auth kontrol
            const adminToken = 'admin-security-key-2025';
            const authHeader = 'Bearer ' + adminToken;
            
            // Sayfa yüklendiğinde admin kontrolü
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Admin paneli yüklendi');
            });
        </script>
    </body>
    </html>
    '''

@app.route('/admin/security-logs', methods=['GET'])
def security_logs():
    """Admin güvenlik logları - Gizli endpoint"""
    try:
        # Basit güvenlik kontrolü
        auth_header = request.headers.get('Authorization')
        if not auth_header or auth_header != 'Bearer admin-security-key-2025':
            return jsonify({'success': False, 'error': 'Yetkisiz erişim - Admin gerekli'}), 403
        
        # Security log dosyasını oku
        if not os.path.exists(SECURITY_LOG_FILE):
            return jsonify({'success': True, 'logs': [], 'message': 'Henüz log kaydı yok'})
        
        with open(SECURITY_LOG_FILE, 'r', encoding='utf-8') as f:
            logs = f.readlines()
        
        # Son 100 log kaydını al (en yeni önce)
        recent_logs = logs[-100:][::-1]
        
        return jsonify({
            'success': True, 
            'logs': recent_logs,
            'total_count': len(logs),
            'showing': len(recent_logs),
            'message': 'Güvenlik logları başarıyla yüklendi'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Log okuma hatası: {str(e)}'}), 500

@app.route('/admin/security-dashboard', methods=['GET'])
def security_dashboard():
    """Admin güvenlik dashboard - Web interface"""
    return '''
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔒 Güvenlik Dashboard</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; margin-bottom: 20px; text-align: center; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .logs-container { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; max-height: 600px; overflow-y: auto; }
            .log-entry { padding: 10px; border-bottom: 1px solid #e9ecef; font-family: 'Courier New', monospace; font-size: 12px; }
            .log-upload { background: #d4edda; } .log-rejected { background: #f8d7da; }
            .refresh-btn { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
            .refresh-btn:hover { background: #218838; }
            .search-box { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔒 Düğün Fotoğraf Sistemi - Güvenlik Dashboard</h1>
            
            <div class="stats" id="stats">
                <div class="stat-card">
                    <h3>📊 Toplam Upload</h3>
                    <div id="totalUploads">Yükleniyor...</div>
                </div>
                <div class="stat-card">
                    <h3>❌ Reddedilen</h3>
                    <div id="rejectedCount">Yükleniyor...</div>
                </div>
                <div class="stat-card">
                    <h3>👥 Benzersiz Kullanıcı</h3>
                    <div id="uniqueUsers">Yükleniyor...</div>
                </div>
                <div class="stat-card">
                    <h3>📈 Bugün</h3>
                    <div id="todayCount">Yükleniyor...</div>
                </div>
            </div>
            
            <button class="refresh-btn" onclick="loadLogs()">🔄 Logları Yenile</button>
            <input type="text" class="search-box" id="searchBox" placeholder="🔍 Log ara... (kullanıcı adı, dosya adı, IP)" onkeyup="filterLogs()">
            
            <div class="logs-container" id="logsContainer">
                <div style="padding: 20px; text-align: center;">Loglar yükleniyor...</div>
            </div>
        </div>
        
        <script>
            let allLogs = [];
            
            async function loadLogs() {
                try {
                    const response = await fetch('/admin/security-logs', {
                        headers: { 'Authorization': 'Bearer admin-security-key-2025' }
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        allLogs = data.logs;
                        displayLogs(allLogs);
                        updateStats(allLogs);
                    } else {
                        document.getElementById('logsContainer').innerHTML = '<div style="padding: 20px; color: red;">Hata: ' + data.error + '</div>';
                    }
                } catch (error) {
                    document.getElementById('logsContainer').innerHTML = '<div style="padding: 20px; color: red;">Bağlantı hatası: ' + error.message + '</div>';
                }
            }
            
            function displayLogs(logs) {
                const container = document.getElementById('logsContainer');
                if (logs.length === 0) {
                    container.innerHTML = '<div style="padding: 20px; text-align: center;">Henüz log kaydı yok</div>';
                    return;
                }
                
                container.innerHTML = logs.map(log => {
                    const isUpload = log.includes('FILE_UPLOADED');
                    const isRejected = log.includes('UPLOAD_REJECTED');
                    const className = isUpload ? 'log-upload' : (isRejected ? 'log-rejected' : '');
                    return `<div class="log-entry ${className}">${log.trim()}</div>`;
                }).join('');
            }
            
            function updateStats(logs) {
                const uploads = logs.filter(log => log.includes('FILE_UPLOADED')).length;
                const rejected = logs.filter(log => log.includes('UPLOAD_REJECTED')).length;
                const users = new Set(logs.map(log => {
                    const match = log.match(/User: ([^|]+)/);
                    return match ? match[1].trim() : 'Unknown';
                })).size;
                
                const today = new Date().toISOString().split('T')[0];
                const todayLogs = logs.filter(log => log.includes(today)).length;
                
                document.getElementById('totalUploads').textContent = uploads;
                document.getElementById('rejectedCount').textContent = rejected;
                document.getElementById('uniqueUsers').textContent = users;
                document.getElementById('todayCount').textContent = todayLogs;
            }
            
            function filterLogs() {
                const searchTerm = document.getElementById('searchBox').value.toLowerCase();
                const filteredLogs = allLogs.filter(log => log.toLowerCase().includes(searchTerm));
                displayLogs(filteredLogs);
            }
            
            // Sayfa yüklendiğinde logları getir
            loadLogs();
            
            // Her 30 saniyede bir otomatik yenile
            setInterval(loadLogs, 30000);
        </script>
    </body>
    </html>
    '''

@app.route('/wedding-owner/dashboard', methods=['GET'])
def wedding_owner_dashboard():
    """Düğün sahibi için özel galeri dashboard"""
    return '''
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>💒 Düğün Galeri Dashboard</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; padding: 20px; color: white;
            }
            .container { max-width: 1400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
            .header p { font-size: 1.2rem; opacity: 0.9; }
            
            /* Login Section */
            .login-section { 
                background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); 
                border-radius: 20px; padding: 40px; margin-bottom: 30px; 
                border: 1px solid rgba(255,255,255,0.2); max-width: 500px; margin: 0 auto 30px;
            }
            .login-input { 
                width: 100%; padding: 15px 20px; border: 2px solid rgba(255,255,255,0.3); 
                border-radius: 12px; background: rgba(255,255,255,0.1); color: white; 
                font-size: 1.1rem; margin-bottom: 20px; outline: none;
            }
            .login-input::placeholder { color: rgba(255,255,255,0.7); }
            .login-input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.3); }
            .login-btn { 
                width: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                color: white; border: none; padding: 15px; border-radius: 12px; 
                font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s;
            }
            .login-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(16,185,129,0.4); }
            
            /* Dashboard */
            .dashboard { display: none; }
            .stats-grid { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                gap: 20px; margin-bottom: 30px; 
            }
            .stat-card { 
                background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); 
                border-radius: 16px; padding: 25px; text-align: center; 
                border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s;
            }
            .stat-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
            .stat-card i { font-size: 2.5rem; margin-bottom: 15px; opacity: 0.8; }
            .stat-number { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
            .stat-label { font-size: 1rem; opacity: 0.8; }
            
            /* Gallery */
            .gallery-section { 
                background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); 
                border-radius: 20px; padding: 30px; border: 1px solid rgba(255,255,255,0.2); 
            }
            .gallery-header { 
                display: flex; justify-content: space-between; align-items: center; 
                margin-bottom: 25px; flex-wrap: wrap; gap: 15px;
            }
            .search-box { 
                padding: 12px 20px; border: 2px solid rgba(255,255,255,0.3); 
                border-radius: 10px; background: rgba(255,255,255,0.1); 
                color: white; width: 300px; outline: none;
            }
            .search-box::placeholder { color: rgba(255,255,255,0.7); }
            .filter-btns { display: flex; gap: 10px; flex-wrap: wrap; }
            .filter-btn { 
                padding: 10px 20px; border: 2px solid rgba(255,255,255,0.3); 
                border-radius: 8px; background: rgba(255,255,255,0.1); 
                color: white; cursor: pointer; transition: all 0.3s; font-size: 0.9rem;
            }
            .filter-btn.active, .filter-btn:hover { 
                background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.5); 
            }
            
            .gallery-grid { 
                display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
                gap: 20px; max-height: 600px; overflow-y: auto; padding: 10px;
            }
            .gallery-item { 
                position: relative; border-radius: 12px; overflow: hidden; 
                background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); 
                border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s; cursor: pointer;
            }
            .gallery-item:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
            .gallery-item img, .gallery-item video { 
                width: 100%; height: 200px; object-fit: cover; display: block; 
            }
            .gallery-item-info { 
                padding: 15px; background: rgba(255,255,255,0.05); 
            }
            .gallery-item-name { font-weight: 600; margin-bottom: 5px; font-size: 0.9rem; }
            .gallery-item-meta { font-size: 0.8rem; opacity: 0.8; }
            .gallery-item-uploader { 
                color: #10b981; font-weight: 500; margin-top: 5px; font-size: 0.85rem;
            }
            
            /* Video Overlay */
            .video-overlay { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0,0,0,0.7); border-radius: 50%; padding: 15px; 
                pointer-events: none;
            }
            .video-overlay i { font-size: 1.5rem; color: white; }
            
            /* Loading */
            .loading { text-align: center; padding: 40px; opacity: 0.8; }
            .spinner { 
                width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); 
                border-top: 3px solid white; border-radius: 50%; 
                animation: spin 1s linear infinite; margin: 0 auto 15px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            
            /* Responsive */
            @media (max-width: 768px) {
                .header h1 { font-size: 2rem; }
                .gallery-header { flex-direction: column; align-items: stretch; }
                .search-box { width: 100%; }
                .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
                .gallery-item img, .gallery-item video { height: 150px; }
            }
            
            /* Modal */
            .modal { 
                display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.9); z-index: 1000; padding: 20px; 
            }
            .modal-content { 
                position: relative; max-width: 90%; max-height: 90%; margin: auto; 
                top: 50%; transform: translateY(-50%); 
            }
            .modal img, .modal video { 
                width: 100%; height: auto; max-height: 80vh; object-fit: contain; 
                border-radius: 12px; 
            }
            .modal-close { 
                position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); 
                border: none; color: white; font-size: 1.5rem; padding: 10px 15px; 
                border-radius: 50%; cursor: pointer; backdrop-filter: blur(10px);
            }
            .modal-info { 
                background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); 
                border-radius: 12px; padding: 20px; margin-top: 15px; color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-heart"></i> Düğün Galeri Dashboard</h1>
                <p>Tüm düğün fotoğraflarınızı buradan görüntüleyebilirsiniz</p>
            </div>
            
            <!-- Login Section -->
            <div class="login-section" id="loginSection">
                <h3 style="text-align: center; margin-bottom: 25px;"><i class="fas fa-lock"></i> Giriş Yapın</h3>
                <input type="password" class="login-input" id="accessCode" placeholder="Erişim kodunuzu girin..." maxlength="50">
                <button class="login-btn" onclick="login()">
                    <i class="fas fa-sign-in-alt"></i> Giriş Yap
                </button>
                <p style="text-align: center; margin-top: 15px; opacity: 0.8; font-size: 0.9rem;">
                    Erişim kodunuz yoksa düğün organizatörüyle iletişime geçin
                </p>
            </div>
            
            <!-- Dashboard -->
            <div class="dashboard" id="dashboard">
                <!-- Stats -->
                <div class="stats-grid" id="statsGrid">
                    <div class="stat-card">
                        <i class="fas fa-images" style="color: #10b981;"></i>
                        <div class="stat-number" id="totalPhotos">-</div>
                        <div class="stat-label">Toplam Fotoğraf</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-video" style="color: #3b82f6;"></i>
                        <div class="stat-number" id="totalVideos">-</div>
                        <div class="stat-label">Toplam Video</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-users" style="color: #f59e0b;"></i>
                        <div class="stat-number" id="totalUploaders">-</div>
                        <div class="stat-label">Katkıda Bulunan</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-hdd" style="color: #8b5cf6;"></i>
                        <div class="stat-number" id="totalSize">-</div>
                        <div class="stat-label">Toplam Boyut</div>
                    </div>
                </div>
                
                <!-- Gallery -->
                <div class="gallery-section">
                    <div class="gallery-header">
                        <h3><i class="fas fa-photo-video"></i> Tüm Medya Dosyaları</h3>
                        <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                            <input type="text" class="search-box" id="searchBox" placeholder="🔍 İsim, dosya adı ile ara..." onkeyup="filterGallery()">
                            <div class="filter-btns">
                                <button class="filter-btn active" onclick="filterMedia('all')">Tümü</button>
                                <button class="filter-btn" onclick="filterMedia('image')">Fotoğraflar</button>
                                <button class="filter-btn" onclick="filterMedia('video')">Videolar</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="gallery-grid" id="galleryGrid">
                        <div class="loading">
                            <div class="spinner"></div>
                            <p>Medya dosyaları yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal -->
        <div class="modal" id="mediaModal">
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <div class="modal-content" id="modalContent"></div>
        </div>
        
        <script>
            let allFiles = [];
            let filteredFiles = [];
            let currentFilter = 'all';
            
                         // Erişim kodları dinamik olarak yüklenir
             let ACCESS_CODES = {};
            
                         async function loadAccessCodes() {
                 try {
                     const response = await fetch('/admin/wedding-codes', {
                         headers: { 'Authorization': 'Bearer dugun-gallery-key-2024' }
                     });
                     const data = await response.json();
                     if (data.success) {
                         ACCESS_CODES = {};
                         Object.entries(data.codes).forEach(([code, info]) => {
                             if (info.status === 'active') {
                                 ACCESS_CODES[code] = info.name;
                             }
                         });
                     }
                 } catch (error) {
                     console.error('Kod yükleme hatası:', error);
                 }
             }
             
             function login() {
                 const code = document.getElementById('accessCode').value.trim();
                 if (ACCESS_CODES[code]) {
                     document.getElementById('loginSection').style.display = 'none';
                     document.getElementById('dashboard').style.display = 'block';
                     loadGallery();
                     showMessage(`✅ Hoş geldiniz! ${ACCESS_CODES[code]}`, 'success');
                 } else {
                     showMessage('❌ Geçersiz erişim kodu!', 'error');
                 }
             }
            
            async function loadGallery() {
                try {
                    // Local files
                    const localResponse = await fetch('/api/gallery', {
                        headers: { 'Authorization': 'Bearer dugun-gallery-key-2024' }
                    });
                    
                    // Drive files
                    const driveResponse = await fetch('/api/drive-gallery', {
                        headers: { 'Authorization': 'Bearer dugun-gallery-key-2024' }
                    });
                    
                    const localData = await localResponse.json();
                    const driveData = await driveResponse.json();
                    
                    allFiles = [];
                    if (localData.success) allFiles = [...allFiles, ...localData.files.map(f => ({...f, source: 'local'}))];
                    if (driveData.success) allFiles = [...allFiles, ...driveData.files.map(f => ({...f, source: 'drive'}))];
                    
                    updateStats();
                    filterMedia('all');
                    
                } catch (error) {
                    console.error('Gallery yükleme hatası:', error);
                    showMessage('❌ Galeri yüklenirken hata oluştu', 'error');
                }
            }
            
            function updateStats() {
                const photos = allFiles.filter(f => f.mimeType && f.mimeType.startsWith('image/')).length;
                const videos = allFiles.filter(f => f.mimeType && f.mimeType.startsWith('video/')).length;
                const uploaders = new Set(allFiles.map(f => {
                    const match = f.name.match(/^([^_]+)_/);
                    return match ? match[1] : 'Anonim';
                })).size;
                const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
                
                document.getElementById('totalPhotos').textContent = photos;
                document.getElementById('totalVideos').textContent = videos;
                document.getElementById('totalUploaders').textContent = uploaders;
                document.getElementById('totalSize').textContent = formatFileSize(totalSize);
            }
            
            function filterMedia(type) {
                currentFilter = type;
                
                // Update active button
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                
                filteredFiles = allFiles.filter(file => {
                    if (type === 'all') return true;
                    if (type === 'image') return file.mimeType && file.mimeType.startsWith('image/');
                    if (type === 'video') return file.mimeType && file.mimeType.startsWith('video/');
                    return true;
                });
                
                displayGallery();
            }
            
            function filterGallery() {
                const searchTerm = document.getElementById('searchBox').value.toLowerCase();
                const filtered = filteredFiles.filter(file => 
                    file.name.toLowerCase().includes(searchTerm) ||
                    (file.name.match(/^([^_]+)_/) && file.name.match(/^([^_]+)_/)[1].toLowerCase().includes(searchTerm))
                );
                displayGallery(filtered);
            }
            
            function displayGallery(files = filteredFiles) {
                const grid = document.getElementById('galleryGrid');
                
                if (files.length === 0) {
                    grid.innerHTML = '<div class="loading"><p>Bu filtrede dosya bulunamadı</p></div>';
                    return;
                }
                
                grid.innerHTML = files.map(file => {
                    const isVideo = file.mimeType && file.mimeType.startsWith('video/');
                    const uploader = file.name.match(/^([^_]+)_/) ? file.name.match(/^([^_]+)_/)[1] : 'Anonim';
                    const url = file.source === 'drive' ? file.webViewLink : file.webViewLink;
                    const thumbnailUrl = file.source === 'drive' ? (file.thumbnailLink || file.iconLink) : url;
                    
                    return `
                        <div class="gallery-item" onclick="openModal('${url}', '${file.name}', '${uploader}', ${isVideo})">
                            ${isVideo ? 
                                `<video src="${url}" style="pointer-events: none;"></video>
                                 <div class="video-overlay"><i class="fas fa-play"></i></div>` :
                                `<img src="${thumbnailUrl}" alt="${file.name}" loading="lazy">`
                            }
                            <div class="gallery-item-info">
                                <div class="gallery-item-name">${file.name.substring(0, 30)}${file.name.length > 30 ? '...' : ''}</div>
                                <div class="gallery-item-meta">
                                    ${formatFileSize(file.size || 0)} • ${new Date(file.createdTime || Date.now()).toLocaleDateString('tr-TR')}
                                </div>
                                <div class="gallery-item-uploader">👤 ${uploader}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            function openModal(url, name, uploader, isVideo) {
                const modal = document.getElementById('mediaModal');
                const content = document.getElementById('modalContent');
                
                content.innerHTML = `
                    ${isVideo ? 
                        `<video src="${url}" controls style="width: 100%; height: auto; max-height: 80vh;"></video>` :
                        `<img src="${url}" alt="${name}" style="width: 100%; height: auto; max-height: 80vh;">`
                    }
                    <div class="modal-info">
                        <h3>${name}</h3>
                        <p><strong>Yükleyen:</strong> ${uploader}</p>
                        <a href="${url}" target="_blank" style="color: #10b981; text-decoration: none;">
                            <i class="fas fa-external-link-alt"></i> Dosyayı Aç
                        </a>
                    </div>
                `;
                
                modal.style.display = 'block';
            }
            
            function closeModal() {
                document.getElementById('mediaModal').style.display = 'none';
            }
            
            function formatFileSize(bytes) {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }
            
            function showMessage(text, type) {
                // Simple alert for now
                alert(text);
            }
            
            // Enter key support
            document.getElementById('accessCode').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            
                         // Close modal on outside click
             document.getElementById('mediaModal').addEventListener('click', function(e) {
                 if (e.target === this) closeModal();
             });
             
             // Load access codes on page load
             loadAccessCodes();
        </script>
    </body>
    </html>
    '''

@app.route('/admin/wedding-codes', methods=['GET'])
def admin_wedding_codes():
    """Admin - Düğün kodları yönetimi"""
    try:
        # Güvenlik kontrolü - Admin veya gallery erişimi
        auth_header = request.headers.get('Authorization')
        if not auth_header or (auth_header != 'Bearer admin-security-key-2025' and auth_header != 'Bearer dugun-gallery-key-2024'):
            return jsonify({'success': False, 'error': 'Yetkisiz erişim'}), 403
        
        # Kod dosyasını oku (JSON formatında)
        codes_file = 'uploads/wedding_codes.json'
        if os.path.exists(codes_file):
            with open(codes_file, 'r', encoding='utf-8') as f:
                codes_data = json.load(f)
        else:
            # Default kodlar
            codes_data = {
                'dugun2025': {
                    'name': 'Yunus & Hilal Düğünü',
                    'created_date': '2025-01-01',
                    'status': 'active',
                    'usage_count': 0
                },
                'admin123': {
                    'name': 'Admin Erişimi',
                    'created_date': '2025-01-01',
                    'status': 'active',
                    'usage_count': 0
                }
            }
            # İlk kez dosyayı oluştur
            with open(codes_file, 'w', encoding='utf-8') as f:
                json.dump(codes_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'codes': codes_data,
            'total_codes': len(codes_data),
            'active_codes': len([c for c in codes_data.values() if c['status'] == 'active'])
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Kod okuma hatası: {str(e)}'}), 500

@app.route('/admin/wedding-codes', methods=['POST'])
def admin_add_wedding_code():
    """Admin - Yeni düğün kodu ekle + Otomatik Drive klasörü ve site oluştur"""
    try:
        # Admin güvenlik kontrolü
        auth_header = request.headers.get('Authorization')
        if not auth_header or auth_header != 'Bearer admin-security-key-2025':
            return jsonify({'success': False, 'error': 'Yetkisiz erişim - Admin gerekli'}), 403
        
        data = request.get_json()
        code = data.get('code', '').strip()
        name = data.get('name', '').strip()
        
        if not code or not name:
            return jsonify({'success': False, 'error': 'Kod ve isim zorunludur'}), 400
            
        if len(code) < 5:
            return jsonify({'success': False, 'error': 'Kod en az 5 karakter olmalıdır'}), 400
        
        # Kod dosyasını oku
        codes_file = 'uploads/wedding_codes.json'
        if os.path.exists(codes_file):
            with open(codes_file, 'r', encoding='utf-8') as f:
                codes_data = json.load(f)
        else:
            codes_data = {}
        
        # Kod zaten var mı kontrol et
        if code in codes_data:
            return jsonify({'success': False, 'error': 'Bu kod zaten mevcut'}), 400
        
        # ✨ Drive klasörü oluştur
        drive_folder_id = None
        try:
            drive_folder_id = create_wedding_drive_folder(name, code)
            print(f"✅ Drive klasörü oluşturuldu: {drive_folder_id}")
        except Exception as e:
            print(f"⚠️ Drive klasörü oluşturulamadı: {e}")
        
        # Yeni kod ekle
        codes_data[code] = {
            'name': name,
            'created_date': datetime.now().strftime('%Y-%m-%d'),
            'status': 'active',
            'usage_count': 0,
            'drive_folder_id': drive_folder_id,
            'website_url': f'/wedding/{code}',
            'upload_url': f'/wedding/{code}/upload',
            'gallery_url': f'/wedding/{code}/gallery'
        }
        
        # Dosyayı güncelle
        with open(codes_file, 'w', encoding='utf-8') as f:
            json.dump(codes_data, f, ensure_ascii=False, indent=2)
        
        # Güvenlik loguna kaydet
        log_security_event("WEDDING_CREATED", "admin", code, 
                         request.headers.get('X-Forwarded-For', request.remote_addr),
                         request.headers.get('User-Agent', 'Unknown'),
                         f"Wedding: {name}, DriveID: {drive_folder_id}")
        
        return jsonify({
            'success': True,
            'message': f'Düğün "{name}" başarıyla oluşturuldu!',
            'code': code,
            'name': name,
            'drive_folder_id': drive_folder_id,
            'website_url': f'{request.url_root}wedding/{code}',
            'upload_url': f'{request.url_root}wedding/{code}/upload',
            'gallery_url': f'{request.url_root}wedding/{code}/gallery'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Düğün oluşturma hatası: {str(e)}'}), 500

def create_wedding_drive_folder(wedding_name, wedding_code):
    """Düğün için özel Drive klasörü oluştur"""
    try:
        # Service account credentials
        json_data = json.loads(SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            json_data, scopes=SCOPES)
        service = build('drive', 'v3', credentials=credentials)
        
        # Ana "Düğün Fotoğrafları" klasörünün altında yeni klasör oluştur
        folder_metadata = {
            'name': f'{wedding_name} ({wedding_code})',
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [FOLDER_ID]  # Ana klasörün altına ekle
        }
        
        folder = service.files().create(body=folder_metadata, fields='id,name').execute()
        
        # Klasörü herkese açık yap (görüntüleme)
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        service.permissions().create(fileId=folder.get('id'), body=permission).execute()
        
        print(f"✅ Drive klasörü oluşturuldu: {folder.get('name')} - ID: {folder.get('id')}")
        return folder.get('id')
        
    except Exception as e:
        print(f"❌ Drive klasör oluşturma hatası: {e}")
        return None

@app.route('/admin/codes-dashboard', methods=['GET'])
def admin_codes_dashboard():
    """Admin - Kod yönetim dashboard"""
    return '''
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔑 Düğün Kodları Yönetimi</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center; }
            .card { background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-item { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; }
            .form-group { margin-bottom: 20px; }
            .form-label { font-weight: 600; margin-bottom: 8px; display: block; color: #333; }
            .form-input { width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem; outline: none; }
            .form-input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
            .btn { background: #667eea; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: all 0.3s; }
            .btn:hover { background: #5a67d8; transform: translateY(-2px); }
            .btn-danger { background: #ef4444; }
            .btn-danger:hover { background: #dc2626; }
            .codes-list { margin-top: 20px; }
            .code-item { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
            .code-info h4 { margin: 0 0 5px 0; color: #333; }
            .code-info p { margin: 0; color: #666; font-size: 0.9rem; }
            .code-actions { display: flex; gap: 10px; }
            .status-active { color: #10b981; font-weight: 600; }
            .status-inactive { color: #ef4444; font-weight: 600; }
            .usage-badge { background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-key"></i> Düğün Kodları Yönetim Paneli</h1>
                <p>Düğün sahiplerinin erişim kodlarını buradan yönetebilirsiniz</p>
            </div>
            
            <div class="stats" id="statsGrid">
                <div class="stat-item">
                    <h3 id="totalCodes">-</h3>
                    <p>Toplam Kod</p>
                </div>
                <div class="stat-item">
                    <h3 id="activeCodes">-</h3>
                    <p>Aktif Kod</p>
                </div>
                <div class="stat-item">
                    <h3 id="totalUsage">-</h3>
                    <p>Toplam Kullanım</p>
                </div>
            </div>
            
            <div class="card">
                <h3>🆕 Yeni Düğün Kodu Oluştur</h3>
                <form id="codeForm">
                    <div class="form-group">
                        <label class="form-label">Kod:</label>
                        <input type="text" class="form-input" id="newCode" placeholder="Örn: ahmet-ayse-2025" maxlength="30" required>
                        <small style="color: #666;">En az 5 karakter, sadece harf, rakam ve tire kullanın</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Düğün Adı:</label>
                        <input type="text" class="form-input" id="weddingName" placeholder="Örn: Ahmet & Ayşe Düğünü" maxlength="100" required>
                    </div>
                    <button type="submit" class="btn">
                        <i class="fas fa-plus"></i> Kod Oluştur
                    </button>
                </form>
            </div>
            
            <div class="card">
                <h3>📋 Mevcut Kodlar</h3>
                <div class="codes-list" id="codesList">
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 2rem; margin-bottom: 15px;">⏳</div>
                        <p>Kodlar yükleniyor...</p>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            let allCodes = {};
            
            async function loadCodes() {
                try {
                    const response = await fetch('/admin/wedding-codes', {
                        headers: { 'Authorization': 'Bearer admin-security-key-2025' }
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        allCodes = data.codes;
                        updateStats(data);
                        displayCodes();
                    } else {
                        alert('Hata: ' + data.error);
                    }
                } catch (error) {
                    alert('Bağlantı hatası: ' + error.message);
                }
            }
            
            function updateStats(data) {
                document.getElementById('totalCodes').textContent = data.total_codes;
                document.getElementById('activeCodes').textContent = data.active_codes;
                document.getElementById('totalUsage').textContent = Object.values(data.codes).reduce((sum, code) => sum + code.usage_count, 0);
            }
            
            function displayCodes() {
                const container = document.getElementById('codesList');
                
                if (Object.keys(allCodes).length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #666;">Henüz kod oluşturulmamış</p>';
                    return;
                }
                
                container.innerHTML = Object.entries(allCodes).map(([code, info]) => `
                    <div class="code-item">
                        <div class="code-info">
                            <h4>${info.name}</h4>
                            <p><strong>Kod:</strong> ${code} | <strong>Tarih:</strong> ${info.created_date} | 
                               <span class="status-${info.status}">${info.status === 'active' ? 'Aktif' : 'Pasif'}</span> |
                               <span class="usage-badge">${info.usage_count} kullanım</span>
                            </p>
                            ${info.drive_folder_id ? 
                                `<p style="margin-top: 8px; font-size: 0.85rem;">
                                    <i class="fab fa-google-drive" style="color: #f59e0b;"></i> Drive Klasörü: ${info.drive_folder_id.substring(0, 10)}...
                                 </p>` : 
                                '<p style="margin-top: 8px; font-size: 0.85rem; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Drive klasörü oluşturulamadı</p>'
                            }
                            <p style="margin-top: 5px; font-size: 0.85rem;">
                                <strong>🌐 Site:</strong> <a href="${window.location.origin}/wedding/${code}" target="_blank" style="color: #10b981;">/wedding/${code}</a>
                            </p>
                        </div>
                        <div class="code-actions">
                            <button class="btn" onclick="openWedding('${code}')">
                                <i class="fas fa-external-link-alt"></i> Siteyi Aç
                            </button>
                            <button class="btn" onclick="copyCode('${code}')">
                                <i class="fas fa-copy"></i> Kopyala
                            </button>
                            <button class="btn" onclick="shareCode('${code}', '${info.name}')">
                                <i class="fas fa-share"></i> Paylaş
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            
            function copyCode(code) {
                navigator.clipboard.writeText(code).then(() => {
                    alert('✅ Kod kopyalandı: ' + code);
                });
            }
            
            function openWedding(code) {
                window.open(`/wedding/${code}`, '_blank');
            }
            
            function shareCode(code, name) {
                const weddingUrl = window.location.origin + `/wedding/${code}`;
                const dashboardUrl = window.location.origin + '/wedding-owner/dashboard';
                const message = `🎉 ${name} Düğün Galerisi\\n\\n📸 Fotoğraf Yükle & Görüntüle:\\n${weddingUrl}\\n\\n💒 Düğün Sahibi Paneli:\\n${dashboardUrl}\\nKod: ${code}\\n\\n🎊 Tüm düğün anılarını paylaşabilir ve görüntüleyebilirsiniz!`;
                
                if (navigator.share) {
                    navigator.share({
                        title: name + ' - Düğün Galerisi',
                        text: message
                    });
                } else {
                    navigator.clipboard.writeText(message).then(() => {
                        alert('✅ Paylaşım mesajı kopyalandı!\\n\\nWhatsApp veya SMS ile gönderebilirsiniz.');
                    });
                }
            }
            
            document.getElementById('codeForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const code = document.getElementById('newCode').value.trim();
                const name = document.getElementById('weddingName').value.trim();
                
                if (!code || !name) {
                    alert('Lütfen tüm alanları doldurun!');
                    return;
                }
                
                try {
                    const response = await fetch('/admin/wedding-codes', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer admin-security-key-2025'
                        },
                        body: JSON.stringify({ code, name })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('✅ ' + data.message);
                        document.getElementById('codeForm').reset();
                        loadCodes(); // Reload codes
                    } else {
                        alert('❌ Hata: ' + data.error);
                    }
                    
                } catch (error) {
                    alert('❌ Bağlantı hatası: ' + error.message);
                }
            });
            
            // Load codes on page load
            loadCodes();
        </script>
    </body>
    </html>
    '''

@app.route('/wedding/<wedding_code>')
def wedding_website(wedding_code):
    """Her düğün için özel ana sayfa"""
    try:
        # Düğün bilgilerini al
        wedding_info = get_wedding_info(wedding_code)
        if not wedding_info:
            return "Düğün bulunamadı", 404
        
        return f'''
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>💍 {wedding_info['name']} - Düğün Anıları</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ 
                    font-family: 'Segoe UI', sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh; color: white; overflow-x: hidden;
                }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }}
                .hero {{ 
                    background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); 
                    border-radius: 24px; padding: 50px 30px; margin-bottom: 30px; 
                    border: 1px solid rgba(255,255,255,0.2); position: relative; overflow: hidden;
                }}
                .hero::before {{
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: float 6s ease-in-out infinite;
                }}
                .hero h1 {{ font-size: 3rem; margin-bottom: 15px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); position: relative; }}
                .hero p {{ font-size: 1.3rem; opacity: 0.9; margin-bottom: 30px; position: relative; }}
                .heart {{ font-size: 2rem; color: #ff6b6b; animation: heartbeat 2s ease-in-out infinite; }}
                
                .buttons {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }}
                .btn {{
                    background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
                    border: 2px solid rgba(255,255,255,0.3); border-radius: 16px;
                    padding: 25px 20px; color: white; text-decoration: none;
                    transition: all 0.3s ease; position: relative; overflow: hidden;
                }}
                .btn:hover {{
                    transform: translateY(-5px); background: rgba(255,255,255,0.25);
                    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
                }}
                .btn i {{ font-size: 2rem; margin-bottom: 15px; display: block; }}
                .btn h3 {{ font-size: 1.2rem; margin-bottom: 8px; }}
                .btn p {{ font-size: 0.9rem; opacity: 0.8; }}
                
                .qr-section {{
                    background: rgba(255,255,255,0.1); backdrop-filter: blur(20px);
                    border-radius: 20px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);
                }}
                .qr-code {{ 
                    background: white; border-radius: 16px; padding: 20px; 
                    display: inline-block; margin: 20px 0; box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }}
                
                .stats {{
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px; margin-top: 30px;
                }}
                .stat {{
                    background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                    border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);
                }}
                .stat-number {{ font-size: 1.8rem; font-weight: bold; margin-bottom: 5px; }}
                .stat-label {{ font-size: 0.9rem; opacity: 0.8; }}
                
                @keyframes heartbeat {{ 0%, 100% {{ transform: scale(1); }} 50% {{ transform: scale(1.1); }} }}
                @keyframes float {{ 0%, 100% {{ transform: translateY(0px) rotate(0deg); }} 50% {{ transform: translateY(-20px) rotate(180deg); }} }}
                
                @media (max-width: 768px) {{
                    .hero {{ padding: 30px 20px; }}
                    .hero h1 {{ font-size: 2.2rem; }}
                    .hero p {{ font-size: 1.1rem; }}
                    .buttons {{ grid-template-columns: 1fr; }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="hero">
                    <h1><i class="fas fa-heart heart"></i> {wedding_info['name']}</h1>
                    <p>Düğün anılarımızı buradan paylaşabilirsiniz</p>
                    <p style="font-size: 1rem; opacity: 0.7;">Düğün Kodu: <strong>{wedding_code}</strong></p>
                </div>
                
                <div class="buttons">
                    <a href="/wedding/{wedding_code}/upload" class="btn">
                        <i class="fas fa-cloud-upload-alt" style="color: #10b981;"></i>
                        <h3>Fotoğraf Yükle</h3>
                        <p>Çektiğiniz fotoğraf ve videoları buradan yükleyin</p>
                    </a>
                    
                    <a href="/wedding/{wedding_code}/gallery" class="btn">
                        <i class="fas fa-images" style="color: #3b82f6;"></i>
                        <h3>Galeriyi Gör</h3>
                        <p>Tüm düğün fotoğraflarını görüntüleyin</p>
                    </a>
                    
                    <a href="https://drive.google.com/drive/folders/{wedding_info.get('drive_folder_id', '')}" target="_blank" class="btn">
                        <i class="fab fa-google-drive" style="color: #f59e0b;"></i>
                        <h3>Drive Klasörü</h3>
                        <p>Google Drive'da tüm dosyalar</p>
                    </a>
                </div>
                
                <div class="qr-section">
                    <h3><i class="fas fa-qrcode"></i> Bu Sayfayı Paylaş</h3>
                    <p>QR kodu okutarak diğer konuklar da fotoğraf yükleyebilir</p>
                    
                    <div class="qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data={request.url}" alt="QR Kod">
                    </div>
                    
                    <p style="margin-top: 15px; font-size: 0.9rem; opacity: 0.8;">
                        🔗 <strong>{request.url}</strong>
                    </p>
                </div>
                
                <div class="stats" id="weddingStats">
                    <div class="stat">
                        <div class="stat-number" id="photoCount">-</div>
                        <div class="stat-label">Fotoğraf</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" id="videoCount">-</div>
                        <div class="stat-label">Video</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" id="uploaderCount">-</div>
                        <div class="stat-label">Katkıda Bulunan</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" id="totalSize">-</div>
                        <div class="stat-label">Toplam Boyut</div>
                    </div>
                </div>
            </div>
            
            <script>
                // İstatistikleri yükle
                async function loadStats() {{
                    try {{
                        const response = await fetch('/api/wedding-stats/{wedding_code}');
                        const data = await response.json();
                        
                        if (data.success) {{
                            document.getElementById('photoCount').textContent = data.stats.photos;
                            document.getElementById('videoCount').textContent = data.stats.videos;
                            document.getElementById('uploaderCount').textContent = data.stats.uploaders;
                            document.getElementById('totalSize').textContent = data.stats.total_size;
                        }}
                    }} catch (error) {{
                        console.log('İstatistik yüklenemedi:', error);
                    }}
                }}
                
                loadStats();
            </script>
        </body>
        </html>
        '''
        
    except Exception as e:
        return f"Hata: {str(e)}", 500

@app.route('/wedding/<wedding_code>/upload')
def wedding_upload_page(wedding_code):
    """Her düğün için özel upload sayfası"""
    try:
        wedding_info = get_wedding_info(wedding_code)
        if not wedding_info:
            return "Düğün bulunamadı", 404
        
        # Mevcut upload sayfasını düğüne özel yapılandır
        return f'''
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>📸 {wedding_info['name']} - Fotoğraf Yükleme</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                /* Mevcut style.css'i buraya kopyala ve düğüne özel yapılandır */
                body {{ 
                    font-family: 'Segoe UI', sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh; padding: 20px; color: white; margin: 0;
                }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .wedding-header {{
                    text-align: center; background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(20px); border-radius: 20px; padding: 30px;
                    margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.2);
                }}
                .wedding-header h1 {{ font-size: 2rem; margin-bottom: 10px; }}
                .wedding-header p {{ opacity: 0.9; }}
                .back-btn {{
                    position: absolute; top: 20px; left: 20px;
                    background: rgba(255,255,255,0.2); border: none; color: white;
                    padding: 12px 15px; border-radius: 10px; text-decoration: none;
                    transition: all 0.3s ease;
                }}
                .back-btn:hover {{ background: rgba(255,255,255,0.3); }}
            </style>
        </head>
        <body>
            <a href="/wedding/{wedding_code}" class="back-btn">
                <i class="fas fa-arrow-left"></i> Geri
            </a>
            
            <div class="container">
                <div class="wedding-header">
                    <h1><i class="fas fa-heart" style="color: #ff6b6b;"></i> {wedding_info['name']}</h1>
                    <p>Fotoğraf ve videolarınızı yükleyin</p>
                </div>
                
                <!-- Burada normal upload form'u olacak -->
                <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 20px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
                    <h3 style="text-align: center; margin-bottom: 20px;">📸 Fotoğraf/Video Yükle</h3>
                    <p style="text-align: center; margin-bottom: 30px; opacity: 0.9;">
                        Düğün anılarınızı diğer konuklarla paylaşın
                    </p>
                    
                    <!-- Upload form buraya gelecek -->
                    <div style="text-align: center; padding: 40px; border: 2px dashed rgba(255,255,255,0.3); border-radius: 16px;">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.7;"></i>
                        <p>Upload formu yakında aktif olacak...</p>
                        <p style="margin-top: 10px; opacity: 0.7; font-size: 0.9rem;">
                            Şimdilik ana upload sayfasını kullanabilirsiniz
                        </p>
                        <a href="https://ahmetkaanmuktar.github.io/dugun_resim_video/examples/dugun-yunus-hilal/" 
                           style="display: inline-block; margin-top: 20px; background: #10b981; color: white; 
                                  padding: 12px 25px; border-radius: 10px; text-decoration: none;">
                            Ana Upload Sayfası
                        </a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        '''
        
    except Exception as e:
        return f"Hata: {str(e)}", 500

@app.route('/wedding/<wedding_code>/gallery')
def wedding_gallery_page(wedding_code):
    """Her düğün için özel galeri sayfası"""
    try:
        wedding_info = get_wedding_info(wedding_code)
        if not wedding_info:
            return "Düğün bulunamadı", 404
        
        return f'''
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🎉 {wedding_info['name']} - Galeri</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body {{ 
                    font-family: 'Segoe UI', sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh; padding: 20px; color: white; margin: 0;
                }}
                .container {{ max-width: 1200px; margin: 0 auto; }}
                .back-btn {{
                    position: absolute; top: 20px; left: 20px;
                    background: rgba(255,255,255,0.2); border: none; color: white;
                    padding: 12px 15px; border-radius: 10px; text-decoration: none;
                    transition: all 0.3s ease;
                }}
                .back-btn:hover {{ background: rgba(255,255,255,0.3); }}
                .gallery-header {{
                    text-align: center; background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(20px); border-radius: 20px; padding: 30px;
                    margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.2);
                }}
                .gallery-grid {{
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px; padding: 20px; background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(20px); border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.2);
                }}
                .photo-item {{
                    background: rgba(255,255,255,0.1); border-radius: 12px;
                    overflow: hidden; transition: all 0.3s ease; cursor: pointer;
                }}
                .photo-item:hover {{ transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }}
                .photo-item img {{ width: 100%; height: 200px; object-fit: cover; }}
                .photo-info {{ padding: 15px; }}
                .loading {{ text-align: center; padding: 50px; opacity: 0.8; }}
            </style>
        </head>
        <body>
            <a href="/wedding/{wedding_code}" class="back-btn">
                <i class="fas fa-arrow-left"></i> Geri
            </a>
            
            <div class="container">
                <div class="gallery-header">
                    <h1><i class="fas fa-images"></i> {wedding_info['name']} Galerisi</h1>
                    <p>Tüm düğün anılarını burada görüntüleyebilirsiniz</p>
                </div>
                
                <div class="gallery-grid" id="galleryGrid">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                        <p>Fotoğraflar yükleniyor...</p>
                    </div>
                </div>
            </div>
            
            <script>
                async function loadGallery() {{
                    try {{
                        // Drive klasöründeki dosyaları çek
                        const response = await fetch('/api/wedding-gallery/{wedding_code}');
                        const data = await response.json();
                        
                        const grid = document.getElementById('galleryGrid');
                        
                        if (data.success && data.files.length > 0) {{
                            grid.innerHTML = data.files.map(file => `
                                <div class="photo-item" onclick="window.open('${{file.webViewLink}}', '_blank')">
                                    <img src="${{file.thumbnailLink || file.iconLink}}" alt="${{file.name}}" loading="lazy">
                                    <div class="photo-info">
                                        <div style="font-weight: 600; margin-bottom: 5px;">${{file.name.substring(0, 25)}}${{file.name.length > 25 ? '...' : ''}}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">${{formatFileSize(file.size || 0)}}</div>
                                    </div>
                                </div>
                            `).join('');
                        }} else {{
                            grid.innerHTML = '<div class="loading"><p>Henüz fotoğraf yüklenmemiş</p></div>';
                        }}
                    }} catch (error) {{
                        document.getElementById('galleryGrid').innerHTML = '<div class="loading"><p>Galeri yüklenemedi</p></div>';
                    }}
                }}
                
                function formatFileSize(bytes) {{
                    if (bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                }}
                
                loadGallery();
            </script>
        </body>
        </html>
        '''
        
    except Exception as e:
        return f"Hata: {str(e)}", 500

def get_wedding_info(wedding_code):
    """Düğün bilgilerini kod dosyasından al"""
    try:
        codes_file = 'uploads/wedding_codes.json'
        if os.path.exists(codes_file):
            with open(codes_file, 'r', encoding='utf-8') as f:
                codes_data = json.load(f)
            return codes_data.get(wedding_code)
        return None
    except Exception as e:
        print(f"Düğün bilgisi alma hatası: {e}")
        return None

@app.route('/api/wedding-stats/<wedding_code>')
def wedding_stats_api(wedding_code):
    """Düğün istatistikleri API"""
    try:
        wedding_info = get_wedding_info(wedding_code)
        if not wedding_info:
            return jsonify({'success': False, 'error': 'Düğün bulunamadı'}), 404
        
        # Drive klasöründeki dosyaları al
        drive_folder_id = wedding_info.get('drive_folder_id')
        if not drive_folder_id:
            return jsonify({
                'success': True,
                'stats': {'photos': 0, 'videos': 0, 'uploaders': 0, 'total_size': '0 MB'}
            })
        
        try:
            json_data = json.loads(SERVICE_ACCOUNT_JSON)
            credentials = service_account.Credentials.from_service_account_info(
                json_data, scopes=SCOPES)
            service = build('drive', 'v3', credentials=credentials)
            
            # Klasördeki dosyaları listele
            results = service.files().list(
                q=f"parents in '{drive_folder_id}' and (mimeType contains 'image/' or mimeType contains 'video/')",
                pageSize=1000,
                fields="files(id, name, mimeType, size)"
            ).execute()
            
            files = results.get('files', [])
            photos = len([f for f in files if f.get('mimeType', '').startswith('image/')])
            videos = len([f for f in files if f.get('mimeType', '').startswith('video/')])
            
            # Kullanıcı sayısı (dosya adından çıkar)
            uploaders = set()
            total_size = 0
            
            for file in files:
                # Dosya boyutu
                size = int(file.get('size', 0))
                total_size += size
                
                # Uploader (dosya adının başındaki isim)
                name = file.get('name', '')
                match = name.split('_')[0] if '_' in name else 'Anonim'
                uploaders.add(match)
            
            # Boyutu formatla
            def format_size(bytes):
                if bytes == 0:
                    return '0 B'
                k = 1024
                sizes = ['B', 'KB', 'MB', 'GB']
                i = min(int(math.log(bytes) / math.log(k)), len(sizes) - 1)
                return f"{round(bytes / (k ** i), 1)} {sizes[i]}"
            
            return jsonify({
                'success': True,
                'stats': {
                    'photos': photos,
                    'videos': videos,
                    'uploaders': len(uploaders),
                    'total_size': format_size(total_size)
                }
            })
            
        except Exception as e:
            print(f"Drive istatistik hatası: {e}")
            return jsonify({
                'success': True,
                'stats': {'photos': 0, 'videos': 0, 'uploaders': 0, 'total_size': '0 MB'}
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/wedding-gallery/<wedding_code>')
def wedding_gallery_api(wedding_code):
    """Düğün galeri API"""
    try:
        wedding_info = get_wedding_info(wedding_code)
        if not wedding_info:
            return jsonify({'success': False, 'error': 'Düğün bulunamadı'}), 404
        
        drive_folder_id = wedding_info.get('drive_folder_id')
        if not drive_folder_id:
            return jsonify({'success': True, 'files': []})
        
        try:
            json_data = json.loads(SERVICE_ACCOUNT_JSON)
            credentials = service_account.Credentials.from_service_account_info(
                json_data, scopes=SCOPES)
            service = build('drive', 'v3', credentials=credentials)
            
            # Klasördeki dosyaları listele
            results = service.files().list(
                q=f"parents in '{drive_folder_id}' and (mimeType contains 'image/' or mimeType contains 'video/')",
                pageSize=100,
                fields="files(id, name, mimeType, size, createdTime, thumbnailLink, webViewLink, iconLink)",
                orderBy="createdTime desc"
            ).execute()
            
            files = results.get('files', [])
            
            return jsonify({
                'success': True,
                'files': files,
                'count': len(files)
            })
            
        except Exception as e:
            print(f"Drive galeri hatası: {e}")
            return jsonify({'success': True, 'files': []})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 