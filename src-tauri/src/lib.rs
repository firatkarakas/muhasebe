use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS kullanicilar (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sifre_hash TEXT NOT NULL,
                    olusturma_tarihi TEXT DEFAULT (datetime('now', 'localtime'))
                );

                CREATE TABLE IF NOT EXISTS cariler (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ad TEXT NOT NULL,
                    tip TEXT NOT NULL DEFAULT 'musteri',
                    telefon TEXT,
                    email TEXT,
                    adres TEXT,
                    vergi_no TEXT,
                    vergi_dairesi TEXT,
                    notlar TEXT,
                    bakiye REAL NOT NULL DEFAULT 0.0,
                    olusturma_tarihi TEXT DEFAULT (datetime('now', 'localtime'))
                );

                CREATE TABLE IF NOT EXISTS islemler (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cari_id INTEGER NOT NULL,
                    tip TEXT NOT NULL,
                    tutar REAL NOT NULL,
                    aciklama TEXT,
                    tarih TEXT NOT NULL,
                    belge_no TEXT,
                    olusturma_tarihi TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (cari_id) REFERENCES cariler(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS faturalar (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cari_id INTEGER NOT NULL,
                    fatura_no TEXT NOT NULL UNIQUE,
                    tarih TEXT NOT NULL,
                    vade_tarihi TEXT,
                    kdv_orani REAL NOT NULL DEFAULT 20.0,
                    ara_toplam REAL NOT NULL DEFAULT 0.0,
                    kdv_tutari REAL NOT NULL DEFAULT 0.0,
                    genel_toplam REAL NOT NULL DEFAULT 0.0,
                    notlar TEXT,
                    durum TEXT NOT NULL DEFAULT 'odenmedi',
                    olusturma_tarihi TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (cari_id) REFERENCES cariler(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS fatura_kalemleri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fatura_id INTEGER NOT NULL,
                    aciklama TEXT NOT NULL,
                    miktar REAL NOT NULL DEFAULT 1.0,
                    birim TEXT DEFAULT 'Adet',
                    birim_fiyat REAL NOT NULL DEFAULT 0.0,
                    toplam REAL NOT NULL DEFAULT 0.0,
                    FOREIGN KEY (fatura_id) REFERENCES faturalar(id) ON DELETE CASCADE
                );
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:muhasebe.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
