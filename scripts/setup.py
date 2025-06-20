#!/usr/bin/env python3
"""
🚀 Etkinlik Fotoğraf Sistemi - Otomatik Kurulum
Yeni etkinlik sayfaları oluşturur ve konfigüre eder.
"""

import os
import sys
import json
import shutil
import argparse
from pathlib import Path
from string import Template
import subprocess
import re
from urllib.parse import quote

class EventSetup:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir)
        self.templates_dir = self.base_dir / "templates"
        self.scripts_dir = self.base_dir / "scripts"
        self.config_file = self.base_dir / "config.json"
        self.events_file = self.base_dir / "events.json"
        
        self.load_config()
        
    def load_config(self):
        """Konfigürasyon dosyasını yükle veya oluştur"""
        default_config = {
            "github_username": "yourusername",
            "github_repo": "drive",
            "base_url": "https://yourusername.github.io/drive/",
            "organizer_name": "Organizatör Adı",
            "contact_info": "iletisim@email.com",
            "upload_deadline": "31 Aralık 2024",
            "default_drive_folder_template": "https://drive.google.com/drive/folders/{folder_id}?usp=drive_link",
            "qr_api_base": "https://api.qrserver.com/v1/create-qr-code/",
            "auto_create_folders": True,
            "backup_enabled": True
        }
        
        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
                # Eksik anahtarları ekle
                for key, value in default_config.items():
                    if key not in self.config:
                        self.config[key] = value
        else:
            self.config = default_config
            self.save_config()
            
    def save_config(self):
        """Konfigürasyon dosyasını kaydet"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
            
    def load_events(self):
        """Mevcut etkinlikleri yükle"""
        if self.events_file.exists():
            with open(self.events_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def save_events(self, events):
        """Etkinlik listesini kaydet"""
        with open(self.events_file, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2, ensure_ascii=False)
    
    def create_slug(self, name):
        """Etkinlik adından URL-safe slug oluştur"""
        # Türkçe karakterleri değiştir
        replacements = {
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
            'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
        }
        
        slug = name.lower()
        for tr_char, en_char in replacements.items():
            slug = slug.replace(tr_char, en_char)
            
        # Sadece harf, rakam ve tire bırak
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'\s+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')
        
        return slug
    
    def generate_drive_upload_url(self, folder_id):
        """Google Drive yükleme URL'si oluştur"""
        # Google Drive yükleme linki formatı
        return f"https://drive.google.com/drive/folders/{folder_id}"
    
    def generate_qr_url(self, page_url):
        """QR kod URL'si oluştur"""
        encoded_url = quote(page_url)
        qr_url = f"{self.config['qr_api_base']}?size=300x300&data={encoded_url}&format=png"
        return qr_url
    
    def create_event_page(self, event_data):
        """Etkinlik için HTML sayfası oluştur"""
        print(f"📄 Sayfa oluşturuluyor: {event_data['name']}")
        
        # Template dosyasını oku
        template_file = self.templates_dir / "index.html"
        if not template_file.exists():
            raise FileNotFoundError(f"Template dosyası bulunamadı: {template_file}")
            
        with open(template_file, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # URL'leri oluştur
        page_url = f"{self.config['base_url']}{event_data['slug']}/"
        qr_code_url = self.generate_qr_url(page_url)
        drive_upload_url = self.generate_drive_upload_url(event_data['drive_folder_id'])
        
        # Template değişkenlerini değiştir
        replacements = {
            'EVENT_NAME': event_data['name'],
            'DRIVE_UPLOAD_URL': drive_upload_url,
            'QR_CODE_URL': qr_code_url,
            'ORGANIZER_NAME': self.config['organizer_name'],
            'CONTACT_INFO': self.config['contact_info'],
            'UPLOAD_DEADLINE': self.config['upload_deadline']
        }
        
        content = template_content
        for placeholder, value in replacements.items():
            content = content.replace(f'{{{{{placeholder}}}}}', value)
        
        # Etkinlik klasörü oluştur
        event_dir = self.base_dir / event_data['slug']
        event_dir.mkdir(exist_ok=True)
        
        # HTML dosyasını kaydet
        output_file = event_dir / "index.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # CSS ve JS dosyalarını kopyala
        for file_name in ['style.css', 'script.js']:
            src_file = self.templates_dir / file_name
            dst_file = event_dir / file_name
            if src_file.exists():
                shutil.copy2(src_file, dst_file)
        
        print(f"✅ Sayfa oluşturuldu: {output_file}")
        return {
            'page_url': page_url,
            'qr_code_url': qr_code_url,
            'local_path': str(output_file)
        }
    
    def create_event(self, name, drive_folder_id, description="", deadline=None):
        """Yeni etkinlik oluştur"""
        events = self.load_events()
        
        # Slug oluştur ve benzersizlik kontrolü
        base_slug = self.create_slug(name)
        slug = base_slug
        counter = 1
        
        while any(event['slug'] == slug for event in events):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        # Etkinlik verisi
        event_data = {
            'name': name,
            'slug': slug,
            'description': description,
            'drive_folder_id': drive_folder_id,
            'created_at': self.get_current_timestamp(),
            'deadline': deadline or self.config['upload_deadline'],
            'status': 'active'
        }
        
        # Sayfa oluştur
        page_info = self.create_event_page(event_data)
        event_data.update(page_info)
        
        # Etkinlik listesine ekle
        events.append(event_data)
        self.save_events(events)
        
        print(f"🎉 Etkinlik oluşturuldu: {name}")
        print(f"   📂 Slug: {slug}")
        print(f"   🌐 URL: {page_info['page_url']}")
        print(f"   📱 QR: {page_info['qr_code_url']}")
        
        return event_data
    
    def update_event(self, slug, **updates):
        """Mevcut etkinliği güncelle"""
        events = self.load_events()
        
        for event in events:
            if event['slug'] == slug:
                event.update(updates)
                event['updated_at'] = self.get_current_timestamp()
                
                # Sayfayı yeniden oluştur
                self.create_event_page(event)
                self.save_events(events)
                
                print(f"✅ Etkinlik güncellendi: {event['name']}")
                return event
        
        raise ValueError(f"Etkinlik bulunamadı: {slug}")
    
    def delete_event(self, slug, confirm=True):
        """Etkinliği sil"""
        events = self.load_events()
        
        event_to_delete = None
        for event in events:
            if event['slug'] == slug:
                event_to_delete = event
                break
        
        if not event_to_delete:
            raise ValueError(f"Etkinlik bulunamadı: {slug}")
        
        if confirm:
            response = input(f"'{event_to_delete['name']}' etkinliğini silmek istediğinizden emin misiniz? (y/N): ")
            if response.lower() != 'y':
                print("❌ İşlem iptal edildi")
                return
        
        # Dosyaları sil
        event_dir = self.base_dir / slug
        if event_dir.exists():
            shutil.rmtree(event_dir)
        
        # Listeden çıkar
        events = [e for e in events if e['slug'] != slug]
        self.save_events(events)
        
        print(f"🗑️ Etkinlik silindi: {event_to_delete['name']}")
    
    def list_events(self):
        """Tüm etkinlikleri listele"""
        events = self.load_events()
        
        if not events:
            print("📭 Henüz etkinlik oluşturulmamış")
            return
        
        print(f"📋 Toplam {len(events)} etkinlik:")
        print("-" * 80)
        
        for event in events:
            status_icon = "🟢" if event.get('status') == 'active' else "🔴"
            print(f"{status_icon} {event['name']}")
            print(f"   🔗 Slug: {event['slug']}")
            print(f"   📅 Oluşturulma: {event.get('created_at', 'Bilinmiyor')}")
            print(f"   🌐 URL: {self.config['base_url']}{event['slug']}/")
            if event.get('description'):
                print(f"   📝 Açıklama: {event['description']}")
            print()
    
    def generate_qr_codes(self):
        """Tüm etkinlikler için QR kodları oluştur"""
        events = self.load_events()
        
        if not events:
            print("📭 QR kodu oluşturulacak etkinlik bulunamadı")
            return
        
        try:
            # QR kod üretici scripti çalıştır
            qr_script = self.scripts_dir / "qr_generator.py"
            if qr_script.exists():
                print("📱 QR kodları oluşturuluyor...")
                subprocess.run([sys.executable, str(qr_script), "--batch"], 
                             cwd=self.base_dir, check=True)
            else:
                print("⚠️ QR kod üretici script bulunamadı")
                
        except subprocess.CalledProcessError as e:
            print(f"❌ QR kod oluşturma hatası: {e}")
    
    def setup_github_pages(self):
        """GitHub Pages kurulumu için bilgi ver"""
        print("🌐 GitHub Pages Kurulum Talimatları:")
        print("-" * 50)
        print("1. GitHub'da yeni bir repository oluşturun")
        print("2. Bu dosyaları repository'ye yükleyin")
        print("3. Repository ayarlarında 'Pages' bölümüne gidin")
        print("4. Source olarak 'Deploy from a branch' seçin")
        print("5. Branch olarak 'main' ve klasör olarak '/ (root)' seçin")
        print("6. config.json dosyasında URL'leri güncelleyin")
        print()
        print(f"📋 Tavsiye edilen repository adı: {self.config['github_repo']}")
        print(f"🌐 GitHub Pages URL: https://{self.config['github_username']}.github.io/{self.config['github_repo']}/")
    
    def interactive_setup(self):
        """İnteraktif kurulum sihirbazı"""
        print("🧙‍♂️ Etkinlik Fotoğraf Sistemi - Kurulum Sihirbazı")
        print("=" * 60)
        
        # Konfigürasyon güncelleme
        print("\n1️⃣ Temel Konfigürasyon")
        github_username = input(f"GitHub kullanıcı adı [{self.config['github_username']}]: ").strip()
        if github_username:
            self.config['github_username'] = github_username
            
        github_repo = input(f"GitHub repository adı [{self.config['github_repo']}]: ").strip()
        if github_repo:
            self.config['github_repo'] = github_repo
            
        self.config['base_url'] = f"https://{self.config['github_username']}.github.io/{self.config['github_repo']}/"
        
        organizer_name = input(f"Organizatör adı [{self.config['organizer_name']}]: ").strip()
        if organizer_name:
            self.config['organizer_name'] = organizer_name
            
        contact_info = input(f"İletişim bilgisi [{self.config['contact_info']}]: ").strip()
        if contact_info:
            self.config['contact_info'] = contact_info
        
        self.save_config()
        print("✅ Konfigürasyon kaydedildi")
        
        # İlk etkinlik oluşturma
        print("\n2️⃣ İlk Etkinlik Oluşturma")
        create_event = input("İlk etkinliği şimdi oluşturmak ister misiniz? (y/N): ").strip().lower()
        
        if create_event == 'y':
            name = input("Etkinlik adı: ").strip()
            description = input("Etkinlik açıklaması (isteğe bağlı): ").strip()
            
            print("\n📁 Google Drive Klasör Kurulumu:")
            print("1. Google Drive'da yeni bir klasör oluşturun")
            print("2. Klasörü paylaşın ve 'Katkıda bulunanlar yükleyebilir' iznini verin")
            print("3. Klasör URL'sinden folder ID'yi kopyalayın")
            print("   Örnek: https://drive.google.com/drive/folders/ABC123XYZ...")
            print("   Folder ID: ABC123XYZ")
            
            folder_id = input("\nGoogle Drive Folder ID: ").strip()
            
            if name and folder_id:
                try:
                    event = self.create_event(name, folder_id, description)
                    print(f"\n🎉 İlk etkinliğiniz hazır!")
                    print(f"🌐 Sayfa URL'si: {event['page_url']}")
                except Exception as e:
                    print(f"❌ Etkinlik oluşturma hatası: {e}")
        
        # GitHub Pages bilgilendirme
        print("\n3️⃣ Sonraki Adımlar")
        self.setup_github_pages()
    
    def get_current_timestamp(self):
        """Şu anki timestamp'i döndür"""
        from datetime import datetime
        return datetime.now().isoformat()

def main():
    parser = argparse.ArgumentParser(description='Etkinlik Fotoğraf Sistemi Kurulum')
    parser.add_argument('--interactive', '-i', action='store_true', help='İnteraktif kurulum')
    parser.add_argument('--create', '-c', help='Yeni etkinlik oluştur')
    parser.add_argument('--folder-id', '-f', help='Google Drive folder ID')
    parser.add_argument('--description', '-d', help='Etkinlik açıklaması')
    parser.add_argument('--list', '-l', action='store_true', help='Etkinlikleri listele')
    parser.add_argument('--delete', help='Etkinlik sil (slug)')
    parser.add_argument('--qr', '-q', action='store_true', help='QR kodları oluştur')
    parser.add_argument('--github-setup', '-g', action='store_true', help='GitHub Pages kurulum bilgisi')
    
    args = parser.parse_args()
    
    setup = EventSetup()
    
    try:
        if args.interactive:
            setup.interactive_setup()
            
        elif args.create:
            if not args.folder_id:
                print("❌ Google Drive folder ID gerekli (--folder-id)")
                sys.exit(1)
            setup.create_event(args.create, args.folder_id, args.description or "")
            
        elif args.list:
            setup.list_events()
            
        elif args.delete:
            setup.delete_event(args.delete)
            
        elif args.qr:
            setup.generate_qr_codes()
            
        elif args.github_setup:
            setup.setup_github_pages()
            
        else:
            # Varsayılan: interaktif mod
            setup.interactive_setup()
            
    except KeyboardInterrupt:
        print("\n❌ İşlem kullanıcı tarafından iptal edildi")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Hata: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 