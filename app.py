import os
import json
import time
from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

app = Flask(__name__)
CORS(app)

# Render için environment variable'ları
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'avi', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Google servis hesabı JSON'u environment variable'dan al, yoksa dosyadan oku
SERVICE_ACCOUNT_JSON = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON', '')
SERVICE_ACCOUNT_FILE = 'service_account.json'

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
    """Dosyayı Drive'a yedekle (opsiyonel)"""
    try:
        print(f"Drive'a yedekleme başlatılıyor: {filename}")
        # Doğrudan SERVICE_ACCOUNT_JSON değişkeninden kimlik bilgilerini al
        try:
            json_data = json.loads(SERVICE_ACCOUNT_JSON)
            print(f"Servis hesabı: {json_data.get('client_email')}")
            print(f"Klasör ID: {FOLDER_ID}")
            
            credentials = service_account.Credentials.from_service_account_info(
                json_data, scopes=SCOPES)
            
            service = build('drive', 'v3', credentials=credentials)
            
            # Önce klasörün erişilebilir olup olmadığını kontrol et
            try:
                folder_info = service.files().get(fileId=FOLDER_ID, fields='id,name').execute()
                print(f"Klasör bulundu: {folder_info.get('name', 'Unknown')}")
            except Exception as e:
                print(f"Klasör erişim hatası: {e}")
                return None
                
            file_metadata = {
                'name': filename,
                'parents': [FOLDER_ID]
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
        print(f"Request files: {request.files}")
        print(f"Request form: {request.form}")
        
        if 'file' not in request.files:
            print("Hata: 'file' anahtarı bulunamadı")
            return jsonify({'error': 'Dosya bulunamadı'}), 400
        
        file = request.files['file']
        print(f"Dosya adı: {file.filename}")
        
        if file.filename == '':
            print("Hata: Dosya adı boş")
            return jsonify({'error': 'Dosya seçilmedi'}), 400
        
        if file and allowed_file(file.filename):
            # Unique filename oluştur
            timestamp = int(time.time())
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            unique_filename = f"{name}_{timestamp}{ext}"
            
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            print(f"Dosya kaydediliyor: {filepath}")
            file.save(filepath)
            print(f"Dosya başarıyla kaydedildi: {filepath}")
            
            # Drive'a yedekleme (opsiyonel - hata olursa da devam eder)
            print(f"Drive'a yedekleme başlatılıyor...")
            drive_id = backup_to_drive(filepath, unique_filename)
            drive_status = "backed_up" if drive_id else "local_only"
            print(f"Drive yedekleme durumu: {drive_status}, Drive ID: {drive_id}")
            
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
            return jsonify({'error': 'Geçersiz dosya formatı. Desteklenen: JPG, PNG, GIF, MP4, MOV, AVI'}), 400
    
    except Exception as e:
        print(f"Upload genel hata: {e}")
        return jsonify({'error': f'Sunucu hatası: {str(e)}'}), 500

@app.route('/api/gallery', methods=['GET'])
def gallery():
    try:
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 