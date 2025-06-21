# 🎉 Yeni Düğün Oluşturma Rehberi - Ahmet Kaan Muktar

Bu rehber her yeni düğün için yapmanız gerekenleri adım adım açıklar.

## ⚡ HIZLI BAŞLANGIÇ (5 Dakika)

### 1. Google Drive Klasörü Oluştur
1. **Google Drive'a** git: [drive.google.com](https://drive.google.com)
2. **"Yeni" → "Klasör"** tıkla
3. **Klasör adı:** `dugun-[damad]-[gelin]` (örn: `dugun-mehmet-ayse`)
4. **Sağ tık → Paylaş → Bağlantı alın**
5. **İzin:** "Bağlantısı olan herkes düzenleyebilir"
6. **Folder ID'yi kaydet** (URL'deki son kısım)

### 2. Setup Script ile Oluştur
```bash
# Terminal/Command Prompt aç ve şu komutu çalıştır:
python scripts/setup.py --create "Düğün [Damad] & [Gelin]" --folder-id "FOLDER_ID_BURAYA"
```

**Örnek:**
```bash
python scripts/setup.py --create "Düğün Mehmet & Ayşe" --folder-id "1abc123xyz456"
```

### 3. QR Kod Üret ve Yazdır
```bash
# QR kodu otomatik oluştur
python scripts/qr_generator.py --event "dugun-mehmet-ayse" --name "Düğün Mehmet & Ayşe"
```

QR kod dosyası `qr_codes/` klasöründe oluşur → Yazdır → Masa kartlarına ekle!

## 📋 MANUEL YÖNTEM

### 1. Klasör Kopyala
```bash
# Mevcut örneği kopyala
copy examples\dugun-yunus-hilal examples\dugun-[damad]-[gelin]
```

### 2. HTML Dosyasını Düzenle
`examples/dugun-[damad]-[gelin]/index.html` dosyasını aç ve şunları değiştir:

**📍 ARANACAK VE DEĞİŞTİRİLECEK KELIMELER:**

| Ara Bu | Değiştir Bu ile |
|--------|----------------|
| `Yunus❤️ve Hilal` | `[Damad]❤️ve [Gelin]` |
| `dugun-yunus-hilal` | `dugun-[damad]-[gelin]` |
| `1BxExample123ForDemo456` | Yeni Google Drive Folder ID |
| `15 Haziran 2024` | Yeni son tarih |

### 3. Detaylı Değişim Listesi

#### Satır 5: Sayfa Başlığı
```html
<title>📸 Fotoğraf Yükleme - Düğün [DAMAD]❤️ve [GELİN]</title>
```

#### Satır 6: Meta Açıklama
```html
<meta name="description" content="Düğün [DAMAD]❤️ve [GELİN] etkinliği için fotoğraf ve video yükleme sayfası">
```

#### Satır 17: Ana Başlık
```html
<h1 class="header-title">Düğün [DAMAD]❤️ve [GELİN]</h1>
```

#### Satır 33: Google Drive Linki
```html
<a href="https://drive.google.com/drive/folders/[YENİ_FOLDER_ID]" class="upload-btn">
```

#### Satır 70: QR Kod URL
```html
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://ahmetkaanmuktar.github.io/drive/dugun-[damad]-[gelin]/&format=png"
```

## 🎯 GERÇEK ÖRNEK

### Mehmet & Ayşe Düğünü

**1. Google Drive:**
- Klasör: `dugun-mehmet-ayse`
- Folder ID: `1abc123xyz456def789`
- Paylaşım: "Bağlantısı olan herkes düzenleyebilir"

**2. Komut:**
```bash
python scripts/setup.py --create "Düğün Mehmet & Ayşe" --folder-id "1abc123xyz456def789"
```

**3. Sonuç:**
- 📂 Klasör: `examples/dugun-mehmet-ayse/`
- 🌐 URL: `https://ahmetkaanmuktar.github.io/drive/dugun-mehmet-ayse/`
- 📱 QR: `qr_codes/qr-dugun-mehmet-ayse.png`

## ✅ KONTROL LİSTESİ

Her yeni düğün için:

- [ ] **Google Drive klasörü** oluşturuldu
- [ ] **Folder ID** kopyalandı
- [ ] **Paylaşım izni** "düzenleyici" olarak ayarlandı
- [ ] **Setup script** çalıştırıldı
- [ ] **Web sayfası** test edildi
- [ ] **QR kod** üretildi
- [ ] **QR kod** yazdırıldı
- [ ] **Masa kartları** hazırlandı

## 🔧 GitHub Pages Yükleme

### 1. GitHub'da Değişiklikleri Kaydet
```bash
git add .
git commit -m "Yeni düğün: [Damad] & [Gelin]"
git push origin main
```

### 2. Sonuç
5-10 dakika sonra sayfa aktif olur:
`https://ahmetkaanmuktar.github.io/drive/dugun-[damad]-[gelin]/`

## 📱 QR KOD KULLANIMI

### Misafirler için:
1. **QR kodu okut** (telefon kamerası)
2. **Web sayfası açılır**
3. **"Dosya Yükle" butonuna bas**
4. **Google Drive açılır → Fotoğraf seç → Yükle**

### Masa kartı metni:
```
📸 FOTOĞRAFLARINIZI PAYLAŞIN

1. QR kodu okutun
2. "Dosya Yükle" butonuna basın  
3. Fotoğraflarınızı seçin
4. Yükleyin!

Teşekkürler ❤️
Mehmet & Ayşe
```

## 🆘 SORUN GİDERME

### Web sayfası açılmıyor?
- GitHub Pages aktif mi kontrol et
- 10 dakika bekle (yayınlanma süresi)
- URL'yi kontrol et: `ahmetkaanmuktar.github.io/drive/...`

### QR kod çalışmıyor?
- URL'yi tarayıcıda test et
- Başka QR okuyucu dene
- QR kodu yeniden üret

### Google Drive yükleme sorunu?
- Folder ID'yi kontrol et
- Paylaşım iznini kontrol et
- İncognito modda test et

## 💡 PRO İPUÇLARI

### 🚀 Hızlı İsim Değişimi
Notepad++ veya VS Code'da:
1. **Ctrl+H** (Bul ve Değiştir)
2. **"Yunus❤️ve Hilal"** → **"[Yeni İsimler]"**
3. **"dugun-yunus-hilal"** → **"dugun-[yeni-slug]"**

### 📊 Toplu Yönetim
```bash
# Tüm etkinlikleri listele
python scripts/setup.py --list

# Tüm QR kodları üret
python scripts/qr_generator.py --batch
```

### 🎨 Özelleştirme
- Logo eklemek için: `config.json` → `logo_path`
- Renkleri değiştirmek için: `templates/style.css` → `:root` bölümü
- İletişim bilgisi için: `config.json` → `contact_info`

---

## 📞 İLETİŞİM

**Ahmet Kaan Muktar**
- 📱 Instagram: [@ahmetkaanmuktar](https://instagram.com/ahmetkaanmuktar)
- 🌐 GitHub: [ahmetkaanmuktar.github.io/drive](https://ahmetkaanmuktar.github.io/drive)

> 💝 **Her düğününüz için bu adımları tekrarlayın. Kolay gelsin!** 