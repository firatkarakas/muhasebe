# Kurulum Adımları

## 1. Rust Yükle (bir kez)

https://rustup.rs adresine git ve Windows için `rustup-init.exe` dosyasını indir.
Yükleyiciyi çalıştır, varsayılan seçeneklerle devam et.
Kurulum bittikten sonra terminali yeniden aç.

## 2. Visual Studio C++ Build Tools Yükle (bir kez)

https://visualstudio.microsoft.com/visual-cpp-build-tools/
"Desktop development with C++" iş yükünü seç ve yükle.

## 3. Node.js Bağımlılıklarını Yükle

```bash
cd on-muhasebe-app
npm install
```

## 4. Geliştirme Modunda Çalıştır

```bash
npm run tauri dev
```

Bu komut hem React geliştirme sunucusunu hem de Tauri penceresini açar.
İlk çalıştırmada Rust derlemesi birkaç dakika sürebilir (sonraki seferler çok hızlı olur).

## 5. Dağıtım için Derle (opsiyonel)

```bash
npm run tauri build
```

`src-tauri/target/release/bundle/` altında kurulum dosyası (.exe ve .msi) oluşur.

---

## Proje Yapısı

- `src/pages/Auth.jsx` → İlk kurulumda şifre belirleme, sonra giriş ekranı
- `src/pages/CariListe.jsx` → Müşteri/tedarikçi yönetimi
- `src/pages/Islemler.jsx` → Tahsilat ve tediye girişleri
- `src/pages/FaturaKes.jsx` → Fatura oluşturma ve PDF çıktısı
- `src/pages/Ekstre.jsx` → Cari hesap ekstres ve PDF raporu
- `src/lib/db.js` → Tüm SQLite veritabanı işlemleri
- `src-tauri/src/lib.rs` → Rust backend ve tablo migration'ları
