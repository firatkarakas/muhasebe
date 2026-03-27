# Muhasebe

Küçük işletmeler için tasarlanmış, basit ve hızlı bir ön muhasebe masaüstü uygulaması.

## Neden?

Bu proje bir hobi olarak başladı. Etrafımdaki küçük işletmelerin — bakkaldan toptancıya, atölyeden küçük ofise — hâlâ Excel tablolarıyla veya kağıt defterlerle muhasebe tuttuğunu gördüm. Kim kime ne kadar borçlu, hangi fatura kesildi, tahsilat yapıldı mı... Bunların hepsi dağınık dosyalarda kayboluyordu.

Muhasebe uygulaması tam da bu sorunu çözmek için var: **Excel'e gerek kalmadan, tek bir pencereden cari hesaplarını takip et, fatura kes, tahsilat ve tediye girişi yap.**

## Özellikler

- **Cari Hesap Yönetimi** — Müşteri ve tedarikçileri ekle, bakiyelerini anlık takip et
- **Tahsilat & Tediye** — Gelen ve giden ödemeleri kaydet, bakiyeler otomatik güncellenir
- **Fatura Kesimi** — KDV hesaplamalı fatura oluştur, PDF olarak kaydet veya yazdır
- **Cari Ekstre** — Herhangi bir carinin tüm işlem geçmişini raporla
- **Yedekleme** — Veritabanını tek tıkla yedekle ve geri yükle
- **Otomatik Güncelleme** — Yeni sürümler çıktığında uygulama seni bilgilendirir
- **Karanlık / Açık Tema** — Gözlerini yormadan çalış

## Ekran Görüntüleri

_Yakında eklenecek._

## Teknolojiler

- [Tauri 2](https://v2.tauri.app/) — Hafif, hızlı ve güvenli masaüstü uygulama çatısı
- [React](https://react.dev/) — Kullanıcı arayüzü
- [SQLite](https://www.sqlite.org/) — Yerel veritabanı (veriler bilgisayarında kalır, buluta gitmez)
- [Tailwind CSS](https://tailwindcss.com/) — Stil

## Kurulum

### Hazır Kurulum (Önerilen)

[Releases](../../releases/latest) sayfasından son sürümün `.exe` dosyasını indir ve çalıştır.

### Geliştirici Kurulumu

Projeyi kendin derlemek istersen:

```bash
# Gereksinimler: Node.js, Rust, Visual Studio C++ Build Tools

git clone https://github.com/firatkarakas/muhasebe.git
cd muhasebe
npm install
npm run tauri dev
```

Dağıtım için derleme:

```bash
npm run tauri build
```

## Lisans

MIT
