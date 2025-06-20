# 🚀 Etkinlik Fotoğraf Sistemi - Kurulum Kılavuzu

Bu kılavuz, sistemin sıfırdan kurulumunu ve kullanımını açıklar.

## 📋 Gereksinimler

### Zorunlu
- ✅ **GitHub hesabı** (ücretsiz)
- ✅ **Google Drive hesabı** (ücretsiz, 15GB)
- ✅ **Temel bilgisayar kullanımı**

### İsteğe Bağlı
- 🔧 **Python 3.7+** (QR kod üretimi için)
- 📧 **E-posta hesabı** (bildirimler için)
- 💳 **Özel alan adı** (örn: dugun.com)

## ⚡ Hızlı Başlangıç (5 Dakika)

### 1. Repository Kurulumu

```bash
# 1. GitHub'da yeni repository oluşturun
# 2. Bu dosyaları indirin ve yükleyin
# 3. GitHub Pages'i etkinleştirin
```

**Adım Adım:**

1. **GitHub'a** gidin: [github.com](https://github.com)
2. **"New repository"** tıklayın
3. Repository adı: `drive` (veya istediğiniz isim)
4. **"Public"** seçin (GitHub Pages için)
5. **"Create repository"** tıklayın

### 2. Dosyaları Yükleme

```bash
# Terminal/Command Prompt'ta:
git clone https://github.com/YOURUSERNAME/drive.git
cd drive

# Bu dosyaları repository'ye kopyalayın
# Sonra:
git add .
git commit -m "İlk kurulum"
git push origin main
```

### 3. GitHub Pages Aktifleştirme

1. Repository'de **"Settings"** sekmesine gidin
2. Sol menüden **"Pages"** seçin
3. Source: **"Deploy from a branch"**
4. Branch: **"main"** / Folder: **"/ (root)"**
5. **"Save"** tıklayın

🎉 **Hazır!** Siteniz şu adreste: `https://YOURUSERNAME.github.io/drive/`

## 🛠️ Detaylı Kurulum

### 1. Konfigürasyon Dosyası

`config.json` dosyasını düzenleyin:

```json
{
  "github_username": "YOURUSERNAME",
  "github_repo": "drive",
  "base_url": "https://YOURUSERNAME.github.io/drive/",
  "organizer_name": "Adınız Soyadınız",
  "contact_info": "email@domain.com",
  "upload_deadline": "31 Aralık 2024"
}
```

### 2. İlk Etkinlik Oluşturma

#### Yöntem A: Otomatik Script (Önerilen)

```bash
# Python gerekli
python scripts/setup.py --interactive
```

#### Yöntem B: Manuel

1. **Google Drive'da klasör oluşturun**:
   - Drive'a gidin → "Yeni" → "Klasör"
   - İsim: `dugun-ayse-emre`
   - Paylaşım: "Bağlantısı olan herkes düzenleyebilir"

2. **Folder ID'yi kopyalayın**:
   ```
   https://drive.google.com/drive/folders/1ABC123XYZ456
                                          ^^^^^^^^^^
                                          Bu kısım
   ```

3. **Setup scriptini çalıştırın**:
   ```bash
   python scripts/setup.py --create "Düğün Ayşe & Emre" --folder-id "1ABC123XYZ456"
   ```

### 3. QR Kod Oluşturma

```bash
# Tüm etkinlikler için QR kodları oluştur
python scripts/qr_generator.py --batch

# Tek etkinlik için
python scripts/qr_generator.py --event "dugun-ayse-emre" --name "Düğün Ayşe & Emre"

# Özel URL için
python scripts/qr_generator.py --url "https://example.com"
```

## 🔧 İleri Ayarlar

### Özel Alan Adı

GitHub Pages için özel domain kullanmak:

1. **DNS ayarları**:
   ```
   CNAME → YOURUSERNAME.github.io
   ```

2. **Repository ayarları**:
   - Settings → Pages → Custom domain
   - Domain adınızı girin
   - "Enforce HTTPS" aktifleştirin

### Google Analytics

`templates/index.html` dosyasına ekleyin:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### E-posta Bildirimleri

Google Apps Script kullanarak:

1. **Apps Script'e** gidin: [script.google.com](https://script.google.com)
2. Yeni proje oluşturun
3. `scripts/drive_setup.md` dosyasındaki kodu yapıştırın
4. Tetikleyici ekleyin (5 dakikada bir çalışsın)

## 📱 Mobil Optimizasyon

### PWA (Progressive Web App) Özelliği

`templates/index.html` dosyasına ekleyin:

```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#667eea">
```

`manifest.json` dosyası oluşturun:

```json
{
  "name": "Etkinlik Fotoğraf Sistemi",
  "short_name": "EtkinlikFoto",
  "description": "Düğün ve etkinlik fotoğrafları için yükleme sistemi",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🔐 Güvenlik Ayarları

### 1. Google Drive Güvenliği

```
✅ Klasör paylaşımını "Düzenleyici" olarak ayarlayın
✅ "İndirme, yazdırma, kopyalama engelle" aktifleştirin
❌ "Herkese açık" yapmayın
```

### 2. Content Security Policy

`templates/index.html` dosyasına ekleyin:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; 
  font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
  img-src 'self' https://api.qrserver.com data:;
  script-src 'self' 'unsafe-inline';
  connect-src 'self' https://drive.google.com;
">
```

### 3. Spam Koruması

```javascript
// templates/script.js içine ekleyin
function validateUpload() {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov'];
  const maxSize = 500 * 1024 * 1024; // 500 MB
  
  // Dosya kontrol kodları...
}
```

## 🎨 Özelleştirme

### Tema Renkleri

`templates/style.css` dosyasında:

```css
:root {
  --primary-color: #667eea;      /* Ana renk */
  --secondary-color: #f093fb;    /* İkincil renk */
  --accent-color: #4facfe;       /* Vurgu rengi */
}
```

### Logo Ekleme

1. Logo dosyasını `templates/` klasörüne koyun
2. `config.json` dosyasında belirtin:
   ```json
   {
     "logo_path": "templates/logo.png"
   }
   ```

### Çoklu Dil Desteği

`templates/i18n/` klasöründe dil dosyaları oluşturun:

```json
// tr.json (Türkçe)
{
  "upload_button": "Dosya Yükle",
  "qr_code": "QR Kodu",
  "instructions": "Nasıl Yüklenir?"
}

// en.json (İngilizce)
{
  "upload_button": "Upload File",
  "qr_code": "QR Code",
  "instructions": "How to Upload?"
}
```

## 🚀 Performans Optimizasyonu

### Resim Optimizasyonu

```bash
# QR kod boyutlarını optimize edin
python scripts/qr_generator.py --size 200 --quality 85
```

### Önbellekleme

`_config.yml` dosyası ekleyin:

```yaml
plugins:
  - jekyll-sitemap
  - jekyll-feed

defaults:
  - scope:
      path: "assets"
    values:
      cache_control: "max-age=31536000"
```

### CDN Kullanımı

Statik dosyalar için JSDelivr kullanın:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/YOURUSERNAME/drive@main/templates/style.css">
```

## 📊 Analytics ve Takip

### Google Analytics 4

```javascript
// Enhanced tracking
gtag('event', 'file_upload_attempt', {
  'event_category': 'engagement',
  'event_label': 'drive_redirect'
});
```

### Özel Metrikler

```javascript
// Upload success tracking
function trackUploadSuccess(fileName, fileSize) {
  gtag('event', 'upload_success', {
    'custom_map': {
      'file_name': fileName,
      'file_size': fileSize
    }
  });
}
```

## 🔄 Backup ve Yedekleme

### Otomatik Yedekleme

```bash
# GitHub Actions ile otomatik yedekleme
# .github/workflows/backup.yml
name: Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Her gün saat 02:00
  
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Backup to Google Drive
        run: |
          # Backup scriptleri...
```

### Manuel Yedekleme

```bash
# Tüm konfigürasyonu yedekle
cp config.json config.backup.json
cp events.json events.backup.json
tar -czf backup-$(date +%Y%m%d).tar.gz templates/ examples/ docs/
```

## 🐛 Sorun Giderme

### Yaygın Hatalar

#### 1. "404 Not Found" Hatası

**Çözüm:**
- GitHub Pages'in aktif olduğunu kontrol edin
- Repository'nin public olduğunu kontrol edin
- `index.html` dosyasının root'ta olduğunu kontrol edin

#### 2. QR Kod Çalışmıyor

**Çözüm:**
```bash
# URL'yi kontrol edin
curl -I "https://YOURUSERNAME.github.io/drive/dugun-ayse-emre/"

# QR kod servisini test edin
curl -I "https://api.qrserver.com/v1/create-qr-code/?data=test"
```

#### 3. Google Drive Erişim Sorunu

**Çözüm:**
- Folder ID'nin doğru olduğunu kontrol edin
- Paylaşım ayarlarını kontrol edin
- Gizli/incognito modda test edin

### Debug Modu

JavaScript console'da:

```javascript
// Debug bilgilerini görüntüle
localStorage.setItem('debug', 'true');
location.reload();

// Event log'larını kontrol et
console.log(JSON.parse(localStorage.getItem('event_logs') || '[]'));
```

### Performans Kontrolü

```bash
# Lighthouse ile test
npx lighthouse https://YOURUSERNAME.github.io/drive/dugun-ayse-emre/ --output=html

# PageSpeed Insights
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=YOURURL"
```

## 📞 Destek ve Yardım

### Topluluk Desteği

- 💬 **GitHub Issues**: Teknik problemler için
- 📧 **E-posta**: Genel sorular için
- 📋 **Wiki**: Kapsamlı dokümantasyon

### Profesyonel Destek

- 🔧 **Kurulum Desteği**: 1-2 saat
- 🎨 **Özelleştirme**: 3-5 saat
- 🚀 **Tam Sistem**: 1-2 gün

### Katkıda Bulunma

```bash
# Geliştirme ortamı kurulumu
git clone https://github.com/YOURUSERNAME/drive.git
cd drive
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

---

> 🎉 **Tebrikler!** Sisteminiz artık hazır. İlk etkinliğinizi oluşturabilir ve QR kodunu paylaşabilirsiniz. 