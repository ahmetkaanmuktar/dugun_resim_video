# 📝 Her Düğün İçin Değiştirilecek Yerler

Bu dosya her yeni düğün/etkinlik için hangi bilgileri değiştirmeniz gerektiğini gösterir.

## 🎯 HIZLI DEĞİŞİM LİSTESİ

### 1. 📂 Klasör Adı
**Değiştir:** `examples/dugun-yunus-hilal/`
**Yeni düğün için:** `examples/dugun-[DAMAD]-[GELIN]/`

**Örnek:**
- Ali & Selin → `examples/dugun-ali-selin/`
- Mehmet & Ayşe → `examples/dugun-mehmet-ayse/`

### 2. 🌐 HTML Dosyası (`examples/dugun-yunus-hilal/index.html`)

#### Satır 5: Meta Title
```html
DEĞIŞTIR: <title>📸 Fotoğraf Yükleme - Düğün Yunus❤️ve Hilal</title>
YENİ:     <title>📸 Fotoğraf Yükleme - Düğün [DAMAD]❤️ve [GELIN]</title>
```

#### Satır 6: Meta Description  
```html
DEĞIŞTIR: <meta name="description" content="Düğün Yunus❤️ve Hilal etkinliği için fotoğraf ve video yükleme sayfası">
YENİ:     <meta name="description" content="Düğün [DAMAD]❤️ve [GELIN] etkinliği için fotoğraf ve video yükleme sayfası">
```

#### Satır 17: Ana Başlık
```html
DEĞIŞTIR: <h1 class="header-title">Düğün Yunus❤️ve Hilal</h1>
YENİ:     <h1 class="header-title">Düğün [DAMAD]❤️ve [GELIN]</h1>
```

#### Satır 33: Google Drive Yükleme Linki
```html
DEĞIŞTIR: <a href="https://drive.google.com/drive/folders/1r7aJfC8EFUSB69WjcywTtQ4BnjbXXR5c?usp=drive_link" class="upload-btn">
YENİ:     <a href="https://drive.google.com/drive/folders/[YENİ_FOLDER_ID]" class="upload-btn">
```

#### Satır 70: QR Kod URL'si
```html
DEĞIŞTIR: <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://ahmetkaanmuktar.github.io/drive/dugun-yunus-hilal/&format=png"
YENİ:     <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://ahmetkaanmuktar.github.io/drive/dugun-[DAMAD]-[GELIN]/&format=png"
```

#### Satır 113: Son tarih (isteğe bağlı)
```html
DEĞIŞTIR: <span>15 Haziran 2024 tarihine kadar</span>
YENİ:     <span>[TARİH] tarihine kadar</span>
```

## 🚀 OTOMATIK DEĞİŞİM (Script İle)

### Komut ile Yeni Düğün Oluşturma:
```bash
python scripts/setup.py --create "Düğün Ali & Selin" --folder-id "GOOGLE_DRIVE_FOLDER_ID"
```

Bu komut:
- ✅ Otomatik klasör oluşturur: `dugun-ali-selin/`
- ✅ Tüm isimleri değiştirir
- ✅ QR kod URL'sini günceller
- ✅ Google Drive linkini ekler

## 📋 ADIM ADIM MANUEL YÖNTEM

### 1. Klasör Hazırlama
```bash
# Örnek klasörü kopyala
copy examples\dugun-yunus-hilal examples\dugun-[DAMAD]-[GELIN]

# Klasöre gir
cd examples\dugun-[DAMAD]-[GELIN]
```

### 2. Google Drive Klasörü
1. **Google Drive'da yeni klasör oluştur**
   - Klasör adı: `dugun-[damad]-[gelin]`
   - Paylaşım: "Bağlantısı olan herkes düzenleyebilir"

2. **Folder ID'yi kopyala**
   ```
   https://drive.google.com/drive/folders/1r7aJfC8EFUSB69WjcywTtQ4BnjbXXR5c?usp=drive_link
                                        ^^^^^^^^^
                                        Bu kısım
   ```

### 3. HTML Dosyasını Düzenle
```html
<!-- Bu satırları bul ve değiştir -->

<!-- Satır 5 -->
<title>📸 Fotoğraf Yükleme - Düğün [DAMAD]❤️ve [GELIN]</title>

<!-- Satır 6 -->
<meta name="description" content="Düğün [DAMAD]❤️ve [GELIN] etkinliği için fotoğraf ve video yükleme sayfası">

<!-- Satır 17 -->
<h1 class="header-title">Düğün [DAMAD]❤️ve [GELIN]</h1>

<!-- Satır 33 -->
<a href="https://drive.google.com/drive/folders/[YENİ_FOLDER_ID]" class="upload-btn">

<!-- Satır 70 -->
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://ahmetkaanmuktar.github.io/drive/dugun-[damad]-[gelin]/&format=png"
```

## 🔍 KOLAY BULMA REHBERİ

### Metin Editöründe Arama Yapın:

1. **"Yunus❤️ve Hilal"** ara → Yeni isimlerle değiştir
2. **"dugun-yunus-hilal"** ara → Yeni slug ile değiştir  
3. **"1BxExample123ForDemo456"** ara → Yeni folder ID ile değiştir
4. **"15 Haziran 2024"** ara → Yeni tarih ile değiştir

## ⚡ HIZLI DEĞİŞİM ŞABLONU

### Yeni Düğün Bilgileri:
```
DAMAD ADI: _________________
GELİN ADI: _________________
FOLDER ID: _________________
SON TARİH: _________________
```

### Değiştirme Listesi:
- [ ] Klasör adı: `dugun-[damad]-[gelin]`
- [ ] Meta title (satır 5)
- [ ] Meta description (satır 6)  
- [ ] Ana başlık (satır 17)
- [ ] Google Drive link (satır 33)
- [ ] QR kod URL (satır 70)
- [ ] Son tarih (satır 113)

## 📱 QR KOD ÜRETİMİ

### Manuel QR Kod:
1. **Site:** [qr-server.com](https://api.qrserver.com/v1/create-qr-code/)
2. **URL:** `https://ahmetkaanmuktar.github.io/drive/dugun-[damad]-[gelin]/`
3. **Boyut:** 300x300
4. **Format:** PNG

### Otomatik QR Kod:
```bash
python scripts/qr_generator.py --event "dugun-[damad]-[gelin]" --name "Düğün [Damad] & [Gelin]"
```

## 💡 İPUÇLARI

### ✅ Doğru Slug Oluşturma:
- **Ali & Selin** → `dugun-ali-selin`
- **Mehmet Yılmaz & Ayşe Demir** → `dugun-mehmet-ayse`
- **Ömer & Büşra** → `dugun-omer-busra`

### ⚠️ Önemli Notlar:
- Türkçe karakterleri İngilizce yazın (ö→o, ü→u, ç→c)
- Boşlukları tire (-) ile değiştirin
- Büyük harfleri küçük yapın
- Özel karakterleri kullanmayın

## 📞 YARDIM

Sorun yaşarsanız:
1. **SSS:** `docs/sss.md` dosyasına bakın
2. **Setup Script:** `python scripts/setup.py --help`
3. **Instagram:** @ahmetkaanmuktar

---

> 💝 **İpucu:** Script kullanımı çok daha kolay! `python scripts/setup.py --interactive` komutunu deneyin. 