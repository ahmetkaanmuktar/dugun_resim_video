# ❓ Sık Sorulan Sorular (SSS)

Bu dokümanda en sık karşılaştığımız soruları ve çözümlerini bulabilirsiniz.

## 🚀 Kurulum ve Başlangıç

### S: GitHub hesabım yok, nasıl oluşturabilirim?
**C:** [GitHub.com](https://github.com)'a gidin ve "Sign up" butonuna tıklayın. Ücretsiz hesap oluşturabilirsiniz.

### S: Python bilmiyorum, sistemı kullanabilir miyim?
**C:** Evet! Temel kurulum için Python bilmeniz gerekmiyor. Sadece QR kod üretimi için isteğe bağlı olarak Python kullanılıyor.

### S: Sistemi kurmak ne kadar sürer?
**C:** 
- **Temel kurulum**: 5-10 dakika
- **İlk etkinlik**: 3-5 dakika  
- **Tam özelleştirme**: 30-60 dakika

### S: Maliyeti nedir?
**C:**
- ✅ **GitHub Pages**: Ücretsiz
- ✅ **Google Drive**: 15GB ücretsiz
- 💰 **Özel domain**: ~$10-15/yıl (isteğe bağlı)
- 💰 **Google Drive**: 100GB için $2/ay (gerekirse)

## 📁 Google Drive İle İlgili

### S: Google Drive'da sadece yükleme izni nasıl veririm?
**C:** Google Drive doğrudan "sadece yükleme" iznini desteklemez. Alternatifler:
1. **Google Forms** kullanın (en güvenli)
2. "Düzenleyici" izni verin + kullanıcıları bilgilendirin
3. Düzenli olarak klasörü kontrol edin

### S: Klasörümdeki dosyaları başkaları görebilir mi?
**C:** 
- ✅ **Sadece siz** tüm dosyaları görebilirsiniz
- ✅ **Yükleyen kişi** sadece kendi dosyasını görebilir
- ❌ **Diğer misafirler** birbirlerinin dosyalarını göremez

### S: Dosya boyutu limiti nedir?
**C:**
- **Google Drive**: 15GB hesap limiti
- **Tek dosya**: 5TB maksimum
- **Tavsiye**: 500MB/dosya (web sayfasında belirtilir)

### S: Hangi dosya formatları desteklenir?
**C:**
- **Fotoğraf**: JPG, PNG, HEIC, RAW
- **Video**: MP4, MOV, AVI, MKV
- **Diğer**: GIF, WEBP

## 🌐 Web Sitesi ve QR Kodlar

### S: Web sitem çalışmıyor, ne yapmalıyım?
**C:**
1. GitHub Pages'in aktif olduğunu kontrol edin
2. Repository'nin "Public" olduğunu kontrol edin
3. 5-10 dakika bekleyin (yayınlanma süresi)
4. İndex.html dosyasının doğru yerde olduğunu kontrol edin

### S: QR kod çalışmıyor?
**C:**
1. **URL'yi kontrol edin**: Tarayıcıda açılıyor mu?
2. **QR kod okuyucu test edin**: Başka QR kodlarla test edin
3. **QR kod servisini kontrol edin**: api.qrserver.com erişilebilir mi?
4. **Kısa URL kullanın**: bit.ly veya tinyurl ile kısaltın

### S: Mobil uyumlu mu?
**C:** Evet! Sistem tamamen responsive tasarımla geliştirilmiştir:
- ✅ Telefon ve tablet uyumlu
- ✅ Touch-friendly butonlar
- ✅ Hızlı yükleme
- ✅ PWA desteği (isteğe bağlı)

### S: Birden fazla etkinlik yönetebilir miyim?
**C:** Evet! Her etkinlik için:
- Ayrı klasör
- Ayrı web sayfası
- Ayrı QR kod
- Merkezi yönetim paneli

## 🔐 Güvenlik ve Gizlilik

### S: Fotoğraflarım güvende mi?
**C:**
- ✅ **Google Drive**: Endüstri standardı güvenlik
- ✅ **HTTPS**: Şifreli veri transferi
- ✅ **Gizli bağlantılar**: Sadece QR kod ile erişim
- ✅ **Yedekleme**: Otomatik Google yedekleme

### S: Spam yüklemelerine karşı korunma var mı?
**C:**
- ✅ **Dosya boyutu limiti**
- ✅ **Dosya türü filtreleme**
- ✅ **Manuel inceleme imkanı**
- ✅ **İstenmeyen dosya silme**

### S: Fotoğrafları kimlerle paylaşabilirim?
**C:**
- ✅ **Sadece siz** varsayılan olarak erişebilir
- ✅ **Belirli kişiler** ile paylaşabilirsiniz
- ✅ **ZIP ile şifreli** paylaşım yapabilirsiniz
- ✅ **Alt klasörler** ile organizasyon

## ⚙️ Teknik Problemler

### S: "404 Not Found" hatası alıyorum?
**C:**
1. URL'yi kontrol edin: `username.github.io/drive/etkinlik-adi/`
2. GitHub Pages'in aktif olduğunu kontrol edin
3. Dosya adlarında Türkçe karakter olmadığından emin olun
4. 10-15 dakika bekleyin

### S: QR kod oluşturulmuyor?
**C:**
1. **Python kurulu mu?** `python --version` komutu çalışıyor mu?
2. **Kütüphaneler kurulu mu?** `pip install qrcode[pil]`
3. **İnternet bağlantısı var mı?** QR servisine erişim gerekli
4. **Manuel oluşturma**: Online QR kod üreticileri kullanın

### S: CSS/JavaScript yüklenmiyor?
**C:**
1. **Dosya yolları doğru mu?** Büyük/küçük harf duyarlı
2. **CDN erişimi var mı?** FontAwesome ve Google Fonts
3. **Tarayıcı cache'i**: Ctrl+F5 ile yenileyin
4. **Console hataları**: F12 ile geliştirici araçları açın

### S: Sistem yavaş çalışıyor?
**C:**
1. **Resim boyutları**: QR kodları optimize edin
2. **CDN kullanın**: Statik dosyalar için
3. **Cache ayarları**: Browser caching aktifleştirin
4. **GitHub Pages**: Ücretsiz sınırlar içinde kalın

## 📱 Kullanıcı Deneyimi

### S: Misafirler sistemi karmaşık buluyor?
**C:**
- ✅ **Sadeleştirin**: Gereksiz özellikleri kaldırın
- ✅ **Video kılavuz**: Kısa açıklama videosu çekin
- ✅ **Kolay talimatlar**: "4 adımda yükleme" yazın
- ✅ **Whatsapp desteği**: Anlık yardım için

### S: QR kod okunmuyor?
**C:**
1. **QR kod boyutu**: En az 200x200 pixel yapın
2. **Baskı kalitesi**: Yüksek çözünürlük kullanın
3. **Kontrast**: Siyah-beyaz net olmalı
4. **Çerçeve**: QR kodun etrafında boşluk bırakın
5. **Test edin**: Farklı telefon/uygulamalarla

### S: Fotoğraf yükleme çok uzun sürer?
**C:**
1. **Dosya boyutu**: Telefonlarda resize yapın
2. **İnternet hızı**: WiFi kullanmasını önerin
3. **Toplu yükleme**: Birkaç fotoğraf kez kez yüklesin
4. **Sıkıştırma**: Otomatik sıkıştırma aktifleştirin

## 🛠️ Alternatif Çözümler

### S: Google Drive dışında seçenek var mı?
**C:**
- **Dropbox**: File Request özelliği
- **OneDrive**: Microsoft hesabı gerekli
- **WeTransfer**: 2GB'a kadar ücretsiz
- **Firebase Storage**: Geliştiriciler için
- **Nextcloud**: Kendi sunucunuzda

### S: GitHub Pages dışında hosting?
**C:**
- **Netlify**: Ücretsiz, kolay kurulum
- **Vercel**: Modern deployment
- **Firebase Hosting**: Google ekosistemi
- **Surge.sh**: Komut satırı deployment

### S: QR kod yerine başka seçenek?
**C:**
- **Kısa URL**: bit.ly, tinyurl
- **WhatsApp buton**: Doğrudan mesaj gönder
- **E-posta linki**: Otomatik e-posta oluştur
- **NFC etiket**: Telefonla dokunma

## 💡 İpuçları ve Püf Noktaları

### S: Daha iyi kullanıcı deneyimi nasıl sağlarım?
**C:**
1. **Basit tutun**: Minimum tıklama
2. **Görsel kılavuz**: Adım adım resimler
3. **Test edin**: Farklı yaş gruplarıyla
4. **Yedek plan**: WhatsApp hattı açık tutun

### S: Daha fazla depolama nasıl alırım?
**C:**
1. **Google One**: 100GB için $2/ay
2. **Birden fazla hesap**: Aile hesapları
3. **Sıkıştırma**: Otomatik boyut azaltma
4. **Temizlik**: Eski etkinlikleri arşivleyin

### S: Sistem güncellemesi nasıl yaparım?
**C:**
1. **GitHub'dan çekin**: Yeni özellikleri alın
2. **Konfigürasyon**: config.json'ı yedekleyin
3. **Test edin**: Staging ortamında deneyin
4. **Yedekleme**: Güncellemeden önce yedek alın

## 📞 Yardım Alma

### S: Hala sorun çözemedim, nereden yardım alırım?
**C:**
1. **GitHub Issues**: Teknik problemler
2. **E-posta**: Genel sorular
3. **Video görüşme**: Karmaşık kurulumlar
4. **Ücretli destek**: Profesyonel yardım

### S: Sistemi özelleştirmek istiyorum?
**C:**
- 🎨 **Tasarım değişiklikleri**: CSS düzenleme
- ⚙️ **Özellik ekleme**: JavaScript geliştirme
- 🔧 **İleri entegrasyon**: API kullanımı
- 💼 **Profesyonel yardım**: Geliştirici desteği

---

> 💡 **İpucu**: Bu SSS'de bulamadığınız konular için GitHub Issues açabilir veya iletişim bilgilerinden ulaşabilirsiniz. 