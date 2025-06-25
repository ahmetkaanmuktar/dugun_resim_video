import json
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

print('🔍 Google Drive bağlantısı test ediliyor...')

try:
    # Service account JSON'ı yükle
    with open('service_account.json', 'r', encoding='utf-8') as f:
        service_account_info = json.load(f)
    
    print('✅ Service account JSON yüklendi')
    
    # Credentials oluştur
    credentials = service_account.Credentials.from_service_account_info(
        service_account_info,
        scopes=['https://www.googleapis.com/auth/drive']
    )
    
    print('✅ Credentials oluşturuldu')
    
    # Drive service oluştur
    service = build('drive', 'v3', credentials=credentials)
    
    print('✅ Drive service oluşturuldu')
    
    # Klasör bilgisini al
    folder_id = '1IHkzE-ki4tfFFwOZ4i5TLVlD5a_ifkqP'
    folder = service.files().get(fileId=folder_id).execute()
    
    print(f'✅ Google Drive bağlantısı başarılı!')
    print(f'📁 Klasör: {folder.get("name", "Unknown")}')
    print(f'🆔 Folder ID: {folder_id}')
    
    # Test dosyası yükleme
    from googleapiclient.http import MediaInMemoryUpload
    
    test_content = b'Test upload - ' + str(os.urandom(8)).encode()
    media = MediaInMemoryUpload(test_content, mimetype='text/plain')
    
    file_metadata = {
        'name': f'test_upload_{int(time.time() if "time" in globals() else 123456)}.txt',
        'parents': [folder_id]
    }
    
    import time
    uploaded_file = service.files().create(
        body=file_metadata,
        media_body=media
    ).execute()
    
    print(f'🚀 Test dosyası yüklendi: {uploaded_file.get("id")}')
    
    # Test dosyasını sil
    service.files().delete(fileId=uploaded_file.get('id')).execute()
    print('🗑️ Test dosyası silindi')
    
except Exception as e:
    print(f'❌ Hata: {str(e)}')
    import traceback
    traceback.print_exc() 