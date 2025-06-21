import os
import json
from flask import Flask, request, jsonify
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

# Google servis hesabı JSON'u environment variable'dan al
SERVICE_ACCOUNT_JSON = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
FOLDER_ID = os.getenv('GOOGLE_DRIVE_FOLDER_ID', '1r7aJfC8EFUSB69WjcywTtQ4BnjbXXR5c')
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_credentials():
    if SERVICE_ACCOUNT_JSON:
        service_account_info = json.loads(SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=SCOPES)
        return credentials
    return None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_to_drive(filepath, filename):
    credentials = get_credentials()
    if not credentials:
        raise Exception("Google servis hesabı bulunamadı")
    
    service = build('drive', 'v3', credentials=credentials)
    file_metadata = {
        'name': filename,
        'parents': [FOLDER_ID]
    }
    media = MediaFileUpload(filepath, resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    return file.get('id')

@app.route('/')
def home():
    return jsonify({'message': 'Düğün Fotoğraf Yükleme API çalışıyor!', 'status': 'online'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Dosya bulunamadı'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Dosya seçilmedi'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            drive_id = upload_to_drive(filepath, filename)
            os.remove(filepath)  # Geçici dosyayı sil
            
            return jsonify({'success': True, 'drive_id': drive_id, 'filename': filename}), 200
        else:
            return jsonify({'error': 'Geçersiz dosya formatı. Desteklenen: JPG, PNG, GIF, MP4, MOV, AVI'}), 400
    
    except Exception as e:
        return jsonify({'error': f'Sunucu hatası: {str(e)}'}), 500

@app.route('/api/gallery', methods=['GET'])
def gallery():
    try:
        credentials = get_credentials()
        if not credentials:
            return jsonify({'success': False, 'error': 'Google servis hesabı bulunamadı'}), 500
        
        service = build('drive', 'v3', credentials=credentials)
        results = service.files().list(
            q=f"'{FOLDER_ID}' in parents and trashed=false",
            pageSize=50,
            fields="files(id, name, mimeType, thumbnailLink, webViewLink, iconLink, createdTime)"
        ).execute()
        
        files = results.get('files', [])
        
        # Dosyaları tarihe göre sırala (en yeni önce)
        files.sort(key=lambda x: x.get('createdTime', ''), reverse=True)
        
        return jsonify({'success': True, 'files': files, 'count': len(files)})
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Galeri yüklenemedi: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 