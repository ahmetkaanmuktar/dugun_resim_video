# 🚀 Düğün Fotoğraf Sistemi - Deployment Rehberi

## 📋 Sistem Mimarisi

**Frontend:** GitHub Pages (ücretsiz)
**Backend:** Render.com (ücretsiz)
**Storage:** Google Drive

---

## 🔧 Backend Deployment (Render.com)

### 1. Render.com Hesabı Oluştur
- [render.com](https://render.com) adresine git
- GitHub ile giriş yap

### 2. Yeni Web Service Oluştur
- **Create a new Web Service** tıkla
- GitHub repository'sini seç: `ahmetkaanmuktar/dugun_resim_video`
- **Settings:**
  - Name: `dugun-yunus-hilal-backend`
  - Environment: `Python 3`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `python scripts/app.py`

### 3. Environment Variables Ekle
**Environment Variables** bölümünde şunları ekle:

```
GOOGLE_SERVICE_ACCOUNT_JSON=[LOCAL JSON DOSYASINDAN KOPYALA]
GOOGLE_DRIVE_FOLDER_ID=1r7aJfC8EFUSB69WjcywTtQ4BnjbXXR5c
```

**ÖNEMLI:** Local'deki `scripts/dugunnn-a2efb8215087.json` dosyasının tüm içeriğini tek satır olarak GOOGLE_SERVICE_ACCOUNT_JSON değerine yapıştır.

### 4. Deploy Et
- **Create Web Service** butonuna bas
- Deploy işlemi 5-10 dakika sürer
- Deploy tamamlandığında URL'ini not al (örn: `https://dugun-yunus-hilal-backend.onrender.com`)

---

## 🌐 Frontend Güncelleme

### 1. Backend URL'sini Güncelle
`examples/dugun-yunus-hilal/script.js` dosyasında:

```javascript
const BACKEND_URL = 'https://dugun-yunus-hilal-backend.onrender.com';
```

### 2. GitHub'a Push Et
```bash
git add .
git commit -m "Backend URL güncellendi"
git push origin main
```

---

## ✅ Test Adımları

1. **Backend Test:**
   - Browser'da backend URL'sini aç
   - `{"message": "Düğün Fotoğraf Yükleme API çalışıyor!", "status": "online"}` görmelisin

2. **Frontend Test:**
   - `https://ahmetkaanmuktar.github.io/dugun_resim_video/examples/dugun-yunus-hilal/` aç
   - Fotoğraf yüklemeyi dene
   - Galeri çalışıyor mu kontrol et

---

## 🔧 Sorun Giderme

### Backend Çalışmıyor
- Render.com logs'ları kontrol et
- Environment variables doğru mu?
- Google servis hesabı JSON'u geçerli mi?

### Frontend Yükleme Çalışmıyor
- Browser Console'u aç (F12)
- CORS hatası var mı?
- Backend URL'si doğru mu?

### Galeri Boş Görünüyor
- Google Drive klasör ID'si doğru mu?
- Servis hesabına Drive klasörü erişimi var mı?

---

## 📞 Destek

Sorun yaşarsan:
1. Render.com logs'larını kontrol et
2. Browser console'unda hata mesajlarını oku
3. GitHub Issues'da soru sor

---

## 🎉 Tamamlandı!

Sistem artık tamamen çalışır durumda:
- ✅ Modern, animasyonlı arayüz
- ✅ Siteye doğrudan yükleme
- ✅ Google Drive entegrasyonu
- ✅ QR kod paylaşımı
- ✅ Galeri görüntüleme
- ✅ Mobil uyumlu
- ✅ Tamamen ücretsiz 