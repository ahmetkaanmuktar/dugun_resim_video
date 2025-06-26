# 🌐 GitHub Otomatik Düğün Siteleri - Kurulum Rehberi

## 📋 GitHub Token Alma

### 1. GitHub Personal Access Token Oluşturma
1. **GitHub hesabına giriş yap**: https://github.com
2. **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
3. **Generate new token (classic)** tıkla
4. **Scopes** seçeneklerinde şunları seç:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `public_repo` (Access public repositories)
   - ✅ `admin:repo_hook` (Repository hooks)

### 2. Token'ı Heroku'ya Ekleme
```bash
heroku config:set GITHUB_TOKEN=your_github_token_here --app dugun-wep-app-heroku
```

## 🚀 Nasıl Çalışır?

### Otomatik Oluşturulan GitHub Siteleri:
1. **Admin panelinde düğün oluşturunca**:
   - ✅ GitHub'da yeni repo oluşturur (`wedding-dugun-kodu`)
   - ✅ GitHub Pages'i aktif eder
   - ✅ Güzel HTML sitesi oluşturur
   - ✅ Site URL'i: `https://USERNAME.github.io/wedding-dugun-kodu`

### 2. Oluşturulan Site Özellikleri:
- 💍 **Düğün adı ve kodu** görünür
- 📸 **Upload butonu** (Heroku backend'e bağlanır)
- 🎉 **Galeri butonu** (Heroku backend'e bağlanır)
- 📱 **QR kod** paylaşım
- 🎨 **Modern responsive tasarım**

## 🎯 Kullanım

### GitHub Token Olmadan:
- ✅ Heroku'da düğün siteleri çalışır (`/wedding/kod`)
- ❌ GitHub'da otomatik site oluşmaz

### GitHub Token Varken:
- ✅ **Heroku'da** düğün siteleri çalışır
- ✅ **GitHub'da** otomatik site oluşur
- ✅ **İki farklı adres** olur:
  - Heroku: `https://app.herokuapp.com/wedding/kod`
  - GitHub: `https://username.github.io/wedding-kod`

## 🔧 Avantajları

### GitHub Pages Avantajları:
- 🆓 **Ücretsiz hosting**
- 🌍 **Kendi domain** bağlanabilir
- ⚡ **Hızlı yükleme**
- 📱 **Mobil uyumlu**
- 🔗 **Paylaşılabilir linkler**

### Heroku Backend Avantajları:
- 📸 **Upload fonksiyonu** çalışır
- 🗄️ **Database** bağlantısı
- 🔐 **Güvenlik** kontrolleri
- 📊 **İstatistikler**

## 📞 Örnek Kullanım Senaryosu

1. **Admin düğün oluşturur**: "Ahmet & Ayşe" (kod: "ahmet-ayse-2025")
2. **Otomatik oluşur**:
   - 📂 Drive klasörü: "Ahmet & Ayşe (ahmet-ayse-2025)"
   - 🌐 Heroku sitesi: `/wedding/ahmet-ayse-2025`
   - 🌍 GitHub sitesi: `https://username.github.io/wedding-ahmet-ayse-2025`

3. **Konuklarla paylaşılır**:
   - **QR kod** ile GitHub sitesi paylaşılır
   - **Upload** Heroku backend'e yapılır
   - **Galeri** her iki siteden görülebilir

## ⚙️ Teknik Detaylar

### GitHub API Kullanımı:
- Repository oluşturma
- GitHub Pages aktifleştirme
- HTML dosyası yükleme
- Otomatik commit

### Güvenlik:
- Token Heroku environment variable'da saklanır
- Sadece admin panelinden kullanılır
- Public repo oluşturur (fotoğraflar zaten herkese açık)

## 🔍 Sorun Giderme

### GitHub Token Çalışmıyor:
1. Token'ın doğru scope'lara sahip olduğunu kontrol et
2. Token'ın süresi dolmadığını kontrol et
3. GitHub rate limit'e takılmış olabilir (saat başı maksimum istek)

### Site Oluşmuyor:
1. Heroku logs kontrol et: `heroku logs --tail`
2. GitHub token var mı kontrol et: `heroku config`
3. Repo adı GitHub kurallarına uygun mu kontrol et

## 💡 Gelecek Geliştirmeler

- [ ] Custom domain bağlama
- [ ] GitHub Actions ile otomatik update
- [ ] Template seçenekleri
- [ ] Fotoğraf galeri entegrasyonu
- [ ] Sosyal medya paylaşım butonları 