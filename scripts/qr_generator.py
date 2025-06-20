#!/usr/bin/env python3
"""
📱 QR Kod Üretici
Etkinlik sayfaları için QR kod oluşturur ve GitHub'a yükler.
"""

import qrcode
import qrcode.image.svg
from PIL import Image, ImageDraw, ImageFont
import os
import sys
import json
import argparse
from urllib.parse import urljoin
import requests
from pathlib import Path

class QRCodeGenerator:
    def __init__(self, config_file="config.json"):
        self.config = self.load_config(config_file)
        self.output_dir = Path("qr_codes")
        self.output_dir.mkdir(exist_ok=True)
        
    def load_config(self, config_file):
        """Konfigürasyon dosyasını yükle"""
        default_config = {
            "github_username": "yourusername",
            "github_repo": "drive",
            "base_url": "https://yourusername.github.io/drive/",
            "qr_size": 10,
            "border": 4,
            "logo_path": None,
            "brand_colors": {
                "primary": "#667eea",
                "secondary": "#f093fb"
            }
        }
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        except FileNotFoundError:
            print(f"⚠️ {config_file} bulunamadı, varsayılan ayarlar kullanılıyor.")
            # Varsayılan config dosyasını oluştur
            self.save_config(default_config, config_file)
            
        return default_config
    
    def save_config(self, config, config_file):
        """Konfigürasyon dosyasını kaydet"""
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    
    def generate_qr_code(self, url, filename, add_logo=True, add_branding=True):
        """QR kod oluştur"""
        print(f"🔗 QR kod oluşturuluyor: {url}")
        
        # QR kod nesnesi oluştur
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # Yüksek hata düzeltme
            box_size=self.config['qr_size'],
            border=self.config['border'],
        )
        
        qr.add_data(url)
        qr.make(fit=True)
        
        # QR kod resmini oluştur
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img = qr_img.convert('RGB')
        
        if add_logo and self.config.get('logo_path'):
            qr_img = self.add_logo(qr_img)
            
        if add_branding:
            qr_img = self.add_branding(qr_img, filename)
        
        # Kaydet
        output_path = self.output_dir / f"{filename}.png"
        qr_img.save(output_path, "PNG", quality=95)
        
        # SVG versiyonu da oluştur
        self.generate_svg_qr(url, filename)
        
        print(f"✅ QR kod kaydedildi: {output_path}")
        return output_path
    
    def generate_svg_qr(self, url, filename):
        """SVG formatında QR kod oluştur"""
        factory = qrcode.image.svg.SvgPathImage
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=20,
            border=4,
            image_factory=factory
        )
        
        qr.add_data(url)
        qr.make(fit=True)
        
        svg_img = qr.make_image()
        svg_path = self.output_dir / f"{filename}.svg"
        
        with open(svg_path, 'wb') as f:
            svg_img.save(f)
        
        print(f"✅ SVG QR kod kaydedildi: {svg_path}")
    
    def add_logo(self, qr_img):
        """QR koda logo ekle"""
        try:
            logo_path = Path(self.config['logo_path'])
            if not logo_path.exists():
                print(f"⚠️ Logo dosyası bulunamadı: {logo_path}")
                return qr_img
                
            logo = Image.open(logo_path)
            
            # Logo boyutunu ayarla (QR kodun %15'i)
            qr_width, qr_height = qr_img.size
            logo_size = min(qr_width, qr_height) // 7
            
            logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            # Logo için beyaz arka plan
            logo_bg = Image.new('RGB', (logo_size + 20, logo_size + 20), 'white')
            logo_bg.paste(logo, (10, 10))
            
            # Logoyu QR kodun ortasına yerleştir
            logo_pos = ((qr_width - logo_size - 20) // 2, (qr_height - logo_size - 20) // 2)
            qr_img.paste(logo_bg, logo_pos)
            
            print("✅ Logo QR koda eklendi")
            
        except Exception as e:
            print(f"⚠️ Logo eklenirken hata: {e}")
            
        return qr_img
    
    def add_branding(self, qr_img, event_name):
        """QR koda marka bilgisi ekle"""
        try:
            # Yeni boyut hesapla (alt kısımda yazı için yer)
            qr_width, qr_height = qr_img.size
            new_height = qr_height + 100
            
            # Yeni resim oluştur
            branded_img = Image.new('RGB', (qr_width, new_height), 'white')
            branded_img.paste(qr_img, (0, 0))
            
            # Yazı çiz
            draw = ImageDraw.Draw(branded_img)
            
            # Font yükle (sistem fontunu kullan)
            try:
                font_title = ImageFont.truetype("arial.ttf", 24)
                font_subtitle = ImageFont.truetype("arial.ttf", 16)
            except:
                font_title = ImageFont.load_default()
                font_subtitle = ImageFont.load_default()
            
            # Başlık
            title_text = f"📸 {event_name}"
            title_bbox = draw.textbbox((0, 0), title_text, font=font_title)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = (qr_width - title_width) // 2
            title_y = qr_height + 10
            
            draw.text((title_x, title_y), title_text, fill='black', font=font_title)
            
            # Alt yazı
            subtitle_text = "Fotoğraf Yükleme"
            subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=font_subtitle)
            subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
            subtitle_x = (qr_width - subtitle_width) // 2
            subtitle_y = title_y + 35
            
            draw.text((subtitle_x, subtitle_y), subtitle_text, fill='#666666', font=font_subtitle)
            
            # QR kod çerçevesi
            draw.rectangle([0, 0, qr_width-1, qr_height-1], outline=self.config['brand_colors']['primary'], width=3)
            
            return branded_img
            
        except Exception as e:
            print(f"⚠️ Branding eklenirken hata: {e}")
            return qr_img
    
    def generate_for_event(self, event_slug, event_name):
        """Belirli bir etkinlik için QR kod oluştur"""
        url = urljoin(self.config['base_url'], event_slug)
        filename = f"qr-{event_slug}"
        
        return self.generate_qr_code(url, filename, add_branding=True)
    
    def generate_batch(self, events_file="events.json"):
        """Toplu QR kod oluştur"""
        try:
            with open(events_file, 'r', encoding='utf-8') as f:
                events = json.load(f)
        except FileNotFoundError:
            print(f"❌ {events_file} bulunamadı!")
            return []
        
        generated_files = []
        
        for event in events:
            event_slug = event.get('slug', event['name'].lower().replace(' ', '-'))
            event_name = event['name']
            
            try:
                qr_path = self.generate_for_event(event_slug, event_name)
                generated_files.append({
                    'event': event_name,
                    'slug': event_slug,
                    'qr_path': str(qr_path),
                    'url': urljoin(self.config['base_url'], event_slug)
                })
            except Exception as e:
                print(f"❌ {event_name} için QR kod oluşturulamadı: {e}")
        
        # Sonuçları kaydet
        with open('generated_qr_codes.json', 'w', encoding='utf-8') as f:
            json.dump(generated_files, f, indent=2, ensure_ascii=False)
        
        print(f"✅ {len(generated_files)} QR kod oluşturuldu")
        return generated_files
    
    def upload_to_github(self, file_path, github_token=None):
        """GitHub'a QR kod yükle"""
        if not github_token:
            github_token = os.getenv('GITHUB_TOKEN')
            
        if not github_token:
            print("⚠️ GitHub token bulunamadı. Manuel yükleme gerekli.")
            return None
        
        # GitHub API ile dosya yükleme
        # Bu kısım isteğe bağlı - manuel yükleme de yapılabilir
        print("🔄 GitHub'a yükleme özelliği geliştiriliyor...")
        return None

def main():
    parser = argparse.ArgumentParser(description='QR Kod Üretici')
    parser.add_argument('--event', '-e', help='Tek bir etkinlik için QR kod oluştur (slug)')
    parser.add_argument('--name', '-n', help='Etkinlik adı')
    parser.add_argument('--batch', '-b', action='store_true', help='Toplu QR kod oluştur')
    parser.add_argument('--config', '-c', default='config.json', help='Konfigürasyon dosyası')
    parser.add_argument('--url', '-u', help='Doğrudan URL için QR kod oluştur')
    
    args = parser.parse_args()
    
    generator = QRCodeGenerator(args.config)
    
    if args.url:
        # Doğrudan URL için QR kod
        filename = input("Dosya adı (uzantısız): ") or "custom_qr"
        generator.generate_qr_code(args.url, filename)
        
    elif args.event:
        # Tek etkinlik
        event_name = args.name or args.event
        generator.generate_for_event(args.event, event_name)
        
    elif args.batch:
        # Toplu oluşturma
        generator.generate_batch()
        
    else:
        # İnteraktif mod
        print("📱 QR Kod Üretici")
        print("1. Tek etkinlik")
        print("2. Toplu oluşturma")
        print("3. Özel URL")
        
        choice = input("\nSeçim (1-3): ").strip()
        
        if choice == "1":
            event_slug = input("Etkinlik slug'ı: ").strip()
            event_name = input("Etkinlik adı: ").strip()
            generator.generate_for_event(event_slug, event_name)
            
        elif choice == "2":
            generator.generate_batch()
            
        elif choice == "3":
            url = input("URL: ").strip()
            filename = input("Dosya adı: ").strip() or "custom_qr"
            generator.generate_qr_code(url, filename)

if __name__ == "__main__":
    # Gerekli kütüphaneleri kontrol et
    try:
        import qrcode
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as e:
        print("❌ Gerekli kütüphaneler eksik!")
        print("Kurulum: pip install qrcode[pil] Pillow")
        sys.exit(1)
    
    main() 