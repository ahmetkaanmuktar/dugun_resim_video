# 📁 Google Drive Kurulum Kılavuzu

Bu kılavuz, etkinlikler için Google Drive klasörlerinin nasıl oluşturulacağını ve yapılandırılacağını açıklar.

## 🚀 Hızlı Başlangıç

### 1. Google Drive Klasörü Oluşturma

1. **Google Drive'a** gidin: [drive.google.com](https://drive.google.com)
2. **"Yeni"** butonuna tıklayın
3. **"Klasör"** seçeneğini seçin
4. Klasör adını girin (örnek: `dugun-ayse-emre`)
5. **"Oluştur"** butonuna tıklayın

### 2. Paylaşım İzinlerini Ayarlama

#### Yöntem 1: Sadece Yükleme İzni (Önerilen)

1. Oluşturduğunuz klasöre **sağ tıklayın**
2. **"Paylaş"** seçeneğini seçin
3. **"Bağlantı alın"** butonuna tıklayın
4. Erişim seviyesini **"Sınırlı"** olarak ayarlayın
5. **"Ayarlar"** (⚙️) ikonuna tıklayın
6. **"Görüntüleyenler ve yorumcuların indirmelerini, yazdırmalarını ve kopyalamalarını engelle"** seçeneğini işaretleyin
7. **"Bitti"** butonuna tıklayın

> ⚠️ **Önemli:** Google Drive doğrudan "sadece yükleme" iznini desteklemez. Aşağıdaki alternatif yöntemleri kullanabilirsiniz.

#### Yöntem 2: Editör İzni + Bilgilendirme

1. Paylaşım ayarlarında **"Düzenleyici"** iznini verin
2. Web sayfanızda kullanıcıları **sadece yükleme** yapmaları konusunda bilgilendirin
3. Düzenli olarak klasör içeriğini kontrol edin

### 3. Folder ID'yi Alma

1. Klasörü açın
2. Tarayıcıdaki URL'yi kopyalayın
3. URL'den Folder ID'yi çıkarın:

```
https://drive.google.com/drive/folders/1ABC123XYZ456DEF789
                                        ^^^^^^^^^^^^^^^^^^
                                        Bu kısım Folder ID
```

### 4. Alternatif Yükleme Yöntemleri

#### A. Google Forms Kullanımı

Daha güvenli bir yükleme sistemi için Google Forms kullanabilirsiniz:

1. **Google Forms'a** gidin: [forms.google.com](https://forms.google.com)
2. **Yeni form** oluşturun
3. **Dosya yükleme** sorusu ekleyin
4. **Ayarlar** → **Yanıtlar** → **Dosyalar için klasör oluştur**
5. Hedef klasörü seçin
6. **Dosya yükleme sınırları**:
   - Dosya boyutu: 1GB'a kadar
   - Dosya türü: Resim, Video
   - Dosya sayısı: 10'a kadar

#### B. Dropbox Alternatifi

```bash
# Dropbox File Request kullanımı
1. Dropbox hesabı oluşturun
2. File Request özelliğini etkinleştirin
3. Sadece yükleme linki oluşturun
4. Web sayfanızda bu linki kullanın
```

#### C. WeTransfer Benzeri Servisler

**Ücretsiz Alternatifler:**
- **FilePizza** - P2P dosya transferi
- **Firefox Send** (kapatıldı) benzeri servisler
- **Upload.io** - Geliştirici dostu API

## 🔐 Güvenlik ve Gizlilik

### Dosya Gizliliği

1. **Klasör ayarları**:
   ```
   ✅ Sadece belirli kişiler erişebilir
   ✅ Bağlantısı olan herkes yükleyebilir
   ❌ İnternette herkese açık
   ```

2. **Dosya görünürlüğü**:
   ```
   ✅ Sadece klasör sahibi görebilir
   ✅ Yükleyen kişi kendi dosyasını görebilir
   ❌ Diğer yükleyenler birbirlerinin dosyalarını göremez
   ```

### Spam Koruması

1. **Manuel kontrol** yapın
2. **Dosya türü filtreleme** (sadece resim/video)
3. **Boyut limiti** (500 MB maksimum)
4. **Düzenli temizlik** (uygunsuz içerik)

## 🛠️ Otomasyon ve İleri Ayarlar

### Google Apps Script ile Bildirim

```javascript
// Code.gs - Google Apps Script
function onFileUpload() {
  var folder = DriveApp.getFolderById('YOUR_FOLDER_ID');
  var files = folder.getFiles();
  
  // Yeni dosya kontrolü
  while (files.hasNext()) {
    var file = files.next();
    var uploadTime = file.getDateCreated();
    
    // Son 5 dakikada yüklenen dosyalar
    if (uploadTime > new Date(Date.now() - 5*60*1000)) {
      sendNotification(file.getName(), uploadTime);
    }
  }
}

function sendNotification(fileName, uploadTime) {
  MailApp.sendEmail({
    to: 'your-email@gmail.com',
    subject: '📷 Yeni Fotoğraf Yüklendi',
    body: `Dosya: ${fileName}\nZaman: ${uploadTime}\nKlasör: Düğün Fotoğrafları`
  });
}
```

### Trigger Kurulumu

1. **Google Apps Script** açın
2. Yukarıdaki kodu yapıştırın
3. **Trigger ekle**:
   - Fonksiyon: `onFileUpload`
   - Tetikleyici: Zaman güdümlü
   - Interval: 5 dakikada bir

### Google Sheets Entegrasyonu

```javascript
// Yüklemeleri Google Sheets'e kaydet
function logUpload(fileName, uploaderEmail, uploadTime) {
  var sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getActiveSheet();
  
  sheet.appendRow([
    uploadTime,
    fileName,
    uploaderEmail,
    'Yüklendi'
  ]);
}
```

## 🔧 Sorun Giderme

### Yaygın Problemler

#### 1. "Erişim İzni Yok" Hatası
**Çözüm:**
- Klasör paylaşım ayarlarını kontrol edin
- "Bağlantısı olan herkes" seçeneğinin aktif olduğundan emin olun

#### 2. Dosya Yüklenmiyor
**Çözüm:**
- İnternet bağlantısını kontrol edin
- Dosya boyutunu kontrol edin (15 GB limit)
- Dosya formatını kontrol edin

#### 3. QR Kod Çalışmıyor
**Çözüm:**
- URL'nin doğru olduğundan emin olun
- QR kod okuyucuyu test edin
- Kısa URL servisi kullanın (bit.ly, tinyurl)

### Performans Optimizasyonu

1. **Klasör organizasyonu**:
   ```
   📁 ana-etkinlik/
   ├── 📁 fotograflar/
   ├── 📁 videolar/
   └── 📁 diger/
   ```

2. **Dosya adlandırma**:
   ```
   ✅ foto_001_ayse_emre.jpg
   ✅ video_002_dans.mp4
   ❌ IMG_20240315_143022.jpg
   ```

## 📞 Yardım ve Destek

### Google Drive Yardım

- [Google Drive Yardım Merkezi](https://support.google.com/drive/)
- [Dosya Paylaşımı Kılavuzu](https://support.google.com/drive/answer/2494822)

### Alternatif Çözümler

Eğer Google Drive ile sorun yaşıyorsanız:

1. **Dropbox** - Daha güçlü paylaşım seçenekleri
2. **OneDrive** - Microsoft ekosistemi entegrasyonu
3. **iCloud** - Apple cihazlar için optimize
4. **Nextcloud** - Kendi sunucunuzda barındırma

### İletişim

Sorunlarınız için:
- 📧 Email: [config.json dosyasındaki iletişim bilgisi]
- 📱 WhatsApp: [Telefon numarası]
- 💬 Telegram: [Kullanıcı adı]

---

> 💡 **İpucu:** Bu kılavuzu yazdırdırıp etkinlik organizatörlerine verebilirsiniz. 