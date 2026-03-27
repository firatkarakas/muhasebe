import Database from "@tauri-apps/plugin-sql";
import { appDataDir } from "@tauri-apps/api/path";
import { copyFile, readFile, writeFile } from "@tauri-apps/plugin-fs";

let db = null;

export async function getDb() {
  if (!db) {
    db = await Database.load("sqlite:muhasebe.db");
  }
  return db;
}

// ── VERİTABANI YEDEKLEME / GERİ YÜKLEME ─────────────

export async function veritabaniYedekle(hedefYol) {
  const database = await getDb();
  // WAL modundaki değişiklikleri ana dosyaya yaz
  try { await database.execute("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {}

  const dataDir = await appDataDir();
  const dbPath = `${dataDir}/muhasebe.db`;
  await copyFile(dbPath, hedefYol);
}

export async function veritabaniGeriYukle(kaynakYol) {
  // Mevcut bağlantıyı kapat
  if (db) {
    try { await db.close(); } catch {}
    db = null;
  }

  const dataDir = await appDataDir();
  const dbPath = `${dataDir}/muhasebe.db`;

  // Yedek dosyasını oku ve mevcut db üzerine yaz
  const yedekData = await readFile(kaynakYol);
  await writeFile(dbPath, yedekData);

  // WAL ve SHM dosyalarını temizle (varsa)
  try { await writeFile(`${dbPath}-wal`, new Uint8Array(0)); } catch {}
  try { await writeFile(`${dbPath}-shm`, new Uint8Array(0)); } catch {}

  // Yeni bağlantı aç
  db = await Database.load("sqlite:muhasebe.db");
  return db;
}

// ── KULLANICI ──────────────────────────────────────────
export async function kullaniciyiKontrolEt() {
  const db = await getDb();
  const sonuc = await db.select("SELECT COUNT(*) as sayi FROM kullanicilar");
  return sonuc[0].sayi > 0;
}

export async function sifreyiKaydet(sifreHash) {
  const db = await getDb();
  await db.execute("INSERT INTO kullanicilar (sifre_hash) VALUES (?)", [sifreHash]);
}

export async function sifreyiDogrula(sifreHash) {
  const db = await getDb();
  const sonuc = await db.select(
    "SELECT * FROM kullanicilar WHERE sifre_hash = ?",
    [sifreHash]
  );
  return sonuc.length > 0;
}

// ── CARİLER ───────────────────────────────────────────
export async function carileriGetir() {
  const db = await getDb();
  return await db.select(
    "SELECT * FROM cariler ORDER BY ad ASC"
  );
}

export async function cariEkle(cari) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO cariler (ad, tip, telefon, email, adres, vergi_no, vergi_dairesi, notlar)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [cari.ad, cari.tip, cari.telefon, cari.email, cari.adres, cari.vergi_no, cari.vergi_dairesi, cari.notlar]
  );
  return result.lastInsertId;
}

export async function cariGuncelle(id, cari) {
  const db = await getDb();
  await db.execute(
    `UPDATE cariler SET ad=?, tip=?, telefon=?, email=?, adres=?, vergi_no=?, vergi_dairesi=?, notlar=?
     WHERE id=?`,
    [cari.ad, cari.tip, cari.telefon, cari.email, cari.adres, cari.vergi_no, cari.vergi_dairesi, cari.notlar, id]
  );
}

export async function cariSil(id) {
  const db = await getDb();
  await db.execute("DELETE FROM cariler WHERE id=?", [id]);
}

export async function cariBakiyeGuncelle(cariId) {
  const db = await getDb();
  // Tahsilat (+) - Tediye (-) + Fatura tutarları
  const islemler = await db.select(
    `SELECT SUM(CASE WHEN tip='tahsilat' THEN tutar WHEN tip='tediye' THEN -tutar ELSE 0 END) as bakiye
     FROM islemler WHERE cari_id=?`,
    [cariId]
  );
  const faturalar = await db.select(
    "SELECT SUM(genel_toplam) as toplam FROM faturalar WHERE cari_id=? AND durum!='iptal'",
    [cariId]
  );
  const islemBakiye = islemler[0].bakiye || 0;
  const faturaBakiye = faturalar[0].toplam || 0;
  const toplamBakiye = faturaBakiye - islemBakiye;
  await db.execute("UPDATE cariler SET bakiye=? WHERE id=?", [toplamBakiye, cariId]);
  return toplamBakiye;
}

// ── İŞLEMLER ──────────────────────────────────────────
export async function islemleriGetir(cariId = null) {
  const db = await getDb();
  if (cariId) {
    return await db.select(
      `SELECT i.*, c.ad as cari_adi FROM islemler i
       JOIN cariler c ON i.cari_id = c.id
       WHERE i.cari_id=? ORDER BY i.tarih DESC`,
      [cariId]
    );
  }
  return await db.select(
    `SELECT i.*, c.ad as cari_adi FROM islemler i
     JOIN cariler c ON i.cari_id = c.id
     ORDER BY i.tarih DESC`
  );
}

export async function islemEkle(islem) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO islemler (cari_id, tip, tutar, aciklama, tarih, belge_no)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [islem.cari_id, islem.tip, islem.tutar, islem.aciklama, islem.tarih, islem.belge_no]
  );
  await cariBakiyeGuncelle(islem.cari_id);
  return result.lastInsertId;
}

export async function islemSil(id, cariId) {
  const db = await getDb();
  await db.execute("DELETE FROM islemler WHERE id=?", [id]);
  await cariBakiyeGuncelle(cariId);
}

// ── FATURALAR ─────────────────────────────────────────
export async function faturalariGetir(cariId = null) {
  const db = await getDb();
  if (cariId) {
    return await db.select(
      `SELECT f.*, c.ad as cari_adi FROM faturalar f
       JOIN cariler c ON f.cari_id = c.id
       WHERE f.cari_id=? ORDER BY f.tarih DESC`,
      [cariId]
    );
  }
  return await db.select(
    `SELECT f.*, c.ad as cari_adi FROM faturalar f
     JOIN cariler c ON f.cari_id = c.id
     ORDER BY f.tarih DESC`
  );
}

export async function faturaGetir(id) {
  const db = await getDb();
  const fatura = await db.select(
    `SELECT f.*, c.ad as cari_adi FROM faturalar f
     JOIN cariler c ON f.cari_id = c.id
     WHERE f.id=?`,
    [id]
  );
  const kalemler = await db.select(
    "SELECT * FROM fatura_kalemleri WHERE fatura_id=?",
    [id]
  );
  return { ...fatura[0], kalemler };
}

export async function faturaKaydet(fatura, kalemler) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO faturalar (cari_id, fatura_no, tarih, vade_tarihi, kdv_orani, ara_toplam, kdv_tutari, genel_toplam, notlar)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fatura.cari_id, fatura.fatura_no, fatura.tarih, fatura.vade_tarihi,
      fatura.kdv_orani, fatura.ara_toplam, fatura.kdv_tutari, fatura.genel_toplam, fatura.notlar
    ]
  );
  const faturaId = result.lastInsertId;
  for (const kalem of kalemler) {
    await db.execute(
      `INSERT INTO fatura_kalemleri (fatura_id, aciklama, miktar, birim, birim_fiyat, toplam)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [faturaId, kalem.aciklama, kalem.miktar, kalem.birim, kalem.birim_fiyat, kalem.toplam]
    );
  }
  await cariBakiyeGuncelle(fatura.cari_id);
  return faturaId;
}

export async function faturaSil(id, cariId) {
  const db = await getDb();
  await db.execute("DELETE FROM fatura_kalemleri WHERE fatura_id=?", [id]);
  await db.execute("DELETE FROM faturalar WHERE id=?", [id]);
  await cariBakiyeGuncelle(cariId);
}

// ── EKSTRE ────────────────────────────────────────────
export async function acilisBakiyeGetir(cariId, baslangicTarihi) {
  const db = await getDb();
  const islemSonuc = await db.select(
    `SELECT
       SUM(CASE WHEN tip='tediye' THEN tutar ELSE 0 END) as tediye,
       SUM(CASE WHEN tip='tahsilat' THEN tutar ELSE 0 END) as tahsilat
     FROM islemler
     WHERE cari_id=? AND tarih < ?`,
    [cariId, baslangicTarihi]
  );
  const faturaSonuc = await db.select(
    `SELECT SUM(genel_toplam) as toplam
     FROM faturalar
     WHERE cari_id=? AND tarih < ? AND durum != 'iptal'`,
    [cariId, baslangicTarihi]
  );
  const tediye = islemSonuc[0]?.tediye || 0;
  const tahsilat = islemSonuc[0]?.tahsilat || 0;
  const fatura = faturaSonuc[0]?.toplam || 0;
  return fatura + tediye - tahsilat;
}

export async function ekstreGetir(cariId, baslangic, bitis) {
  const db = await getDb();
  const islemler = await db.select(
    `SELECT 'islem' as kaynak_tip, id, tarih, tip, tutar, aciklama, belge_no, null as fatura_no
     FROM islemler
     WHERE cari_id=? AND tarih BETWEEN ? AND ?`,
    [cariId, baslangic, bitis]
  );
  const faturalar = await db.select(
    `SELECT 'fatura' as kaynak_tip, id, tarih, 'fatura' as tip, genel_toplam as tutar, notlar as aciklama, null as belge_no, fatura_no
     FROM faturalar
     WHERE cari_id=? AND tarih BETWEEN ? AND ? AND durum!='iptal'`,
    [cariId, baslangic, bitis]
  );
  const tumHareketler = [...islemler, ...faturalar].sort(
    (a, b) => new Date(a.tarih) - new Date(b.tarih)
  );
  return tumHareketler;
}
