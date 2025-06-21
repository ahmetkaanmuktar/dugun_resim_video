# 🚀 GitHub'a Yükleme Rehberi

Bu rehber, düğün fotoğraf sisteminizi GitHub'a nasıl yükleyeceğinizi adım adım anlatır.

## 📋 Ön Hazırlık

### 1. Gerekli Hesaplar
- ✅ GitHub hesabınız var: `ahmetkaanmuktar`
- ✅ Repository oluşturmuşunuz: `dugun_resim_video`
- ✅ Google Drive klasörünüz hazır

### 2. Dosyalarınızı Kontrol Edin
Aşağıdaki dosyalar bilgisayarınızda hazır olmalı:
```
drive/
├── config.json
├── templates/
├── examples/
├── scripts/
├── docs/
└── README.md
```

## 🛠️ Adım Adım Yükleme

### Adım 1: Git Kurulumu (İlk Kez)
```bash
# Git'in yüklü olup olmadığını kontrol edin
git --version

# Eğer yüklü değilse: https://git-scm.com/download/win adresinden indirin
```

### Adım 2: Repository'yi Klonlayın
```bash
# Terminal/CMD açın ve desktop'a gidin
cd Desktop

# Repository'yi klonlayın
git clone https://github.com/ahmetkaanmuktar/dugun_resim_video.git

# Klasöre girin
cd dugun_resim_video
```

### Adım 3: Dosyaları Kopyalayın
```bash
# Mevcut drive klasöründeki tüm dosyaları yeni klasöre kopyalayın
# Windows Explorer'da:
# - drive/ klasöründeki TÜM dosyaları seçin (Ctrl+A)
# - Kopyalayın (Ctrl+C)
# - dugun_resim_video/ klasörüne yapıştırın (Ctrl+V)
```

### Adım 4: Git Yapılandırması
```bash
# Eğer daha önce yapmadıysanız:
git config --global user.name "Ahmet Kaan Muktar"
git config --global user.email "your-email@example.com"
```

### Adım 5: Dosyaları Ekleyin ve Yükleyin
```bash
# Tüm dosyaları stage'e ekleyin
git add .

# Commit oluşturun
git commit -m "İlk yükleme: Düğün fotoğraf sistemi"

# GitHub'a yükleyin
git push origin main
```

## 🌐 GitHub Pages Aktivasyonu

### Adım 1: Repository Ayarları
1. https://github.com/ahmetkaanmuktar/dugun_resim_video adresine gidin
2. **Settings** sekmesine tıklayın
3. Sol menüden **Pages** seçin

### Adım 2: Pages Ayarları
1. **Source**: "Deploy from a branch" seçin
2. **Branch**: `main` seçin
3. **Folder**: `/ (root)` seçin
4. **Save** butonuna tıklayın

### Adım 3: Siteyi Test Edin
- 5-10 dakika sonra siteniz şu adreste hazır olacak:
- **https://ahmetkaanmuktar.github.io/dugun_resim_video/**

## 📝 Yeni Düğün Ekleme (GitHub üzerinden)

### Yöntem 1: Web Arayüzü ile
1. GitHub repository'nize gidin
2. `examples/` klasörüne tıklayın
3. **Add file > Create new file** butonuna tıklayın
4. Dosya adı: `dugun-ISIM1-ISIM2/index.html`
5. Template'ten kopyalayıp düzenleyin
6. **Commit** edin

### Yöntem 2: Yerel Bilgisayar ile
```bash
# Repository'nizi güncelleyin
git pull origin main

# Yeni düğün klasörü oluşturun
mkdir examples/dugun-ali-ayse

# Template dosyaları kopyalayın
cp -r templates/* examples/dugun-ali-ayse/

# Düzenleyin ve yükleyin
git add .
git commit -m "Yeni düğün eklendi: Ali & Ayşe"
git push origin main
```

## 🔧 Sorun Giderme

### Problem: Push edilmiyor
```bash
# Önce pull yapın
git pull origin main

# Sonra tekrar push yapın
git push origin main
```

### Problem: Dosya çok büyük
```bash
# Büyük dosyaları .gitignore'a ekleyin
echo "*.mp4" >> .gitignore
echo "*.mov" >> .gitignore
git add .gitignore
git commit -m "Büyük dosyalar görmezden geliniyor"
```

### Problem: Site açılmıyor
1. GitHub Pages'in aktif olduğunu kontrol edin
2. 10-15 dakika bekleyin
3. Tarayıcı cache'ini temizleyin
4. HTTPS yerine HTTP deneyin

## 📞 Yardım

Sorun yaşıyorsanız:
1. **GitHub Issues**: Repository'nizde issue açın
2. **Instagram**: [@ahmetkaanmuktar](https://www.instagram.com/ahmetkaanmuktar/)
3. **GitHub Docs**: https://docs.github.com/pages

## ✅ Kontrol Listesi

- [ ] Git kuruldu
- [ ] Repository klonlandı
- [ ] Dosyalar kopyalandı
- [ ] İlk commit yapıldı
- [ ] GitHub'a yüklendi
- [ ] Pages aktif edildi
- [ ] Site test edildi
- [ ] Google Drive bağlantıları güncellendi

## 🎯 Sonraki Adımlar

1. **Google Drive Klasörleri**: Her düğün için ayrı klasör oluşturun
2. **QR Kodları**: `scripts/qr_generator.py` ile QR kodları oluşturun
3. **Domain**: İsteğe bağlı özel domain ekleyin
4. **Analytics**: Google Analytics ekleyin
5. **Backup**: Düzenli yedekleme sistemi kurun

---

🎉 **Tebrikler!** Sisteminiz artık canlı ve hazır!

**Ana Site**: https://ahmetkaanmuktar.github.io/dugun_resim_video/
**Örnek Düğün**: https://ahmetkaanmuktar.github.io/dugun_resim_video/examples/dugun-yunus-hilal/ 