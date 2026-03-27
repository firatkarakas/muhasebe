import { useState } from "react";
import { useTema } from "@/lib/theme.jsx";
import { veritabaniYedekle, veritabaniGeriYukle } from "@/lib/db";
import { Settings, Moon, Sun, Monitor, Save, Download, Upload, AlertTriangle, Database } from "lucide-react";
import { cn, formatTarih, bugunTarih } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/use-toast";
import { save, open } from "@tauri-apps/plugin-dialog";

const FIRMA_KEY = "firmaInfo";

const temalar = [
  { deger: "light", label: "Gündüz", icon: Sun },
  { deger: "dark", label: "Gece", icon: Moon },
  { deger: "system", label: "Sistem", icon: Monitor },
];

function firmaInfoOku() {
  try { return JSON.parse(localStorage.getItem(FIRMA_KEY) || "{}"); }
  catch { return {}; }
}

export default function Ayarlar() {
  const { tema, setTema } = useTema();
  const [firma, setFirma] = useState(firmaInfoOku);
  const [yuklemeOnay, setYuklemeOnay] = useState(false);
  const [seciliYedekYol, setSeciliYedekYol] = useState(null);
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);

  const firmaKaydet = () => {
    localStorage.setItem(FIRMA_KEY, JSON.stringify(firma));
    toast({ title: "Kaydedildi", description: "Firma bilgileri güncellendi." });
  };

  const yedekAl = async () => {
    try {
      setIslemYapiliyor(true);
      const tarih = bugunTarih().replace(/-/g, "");
      const dosyaAdi = `yavuz-turgut-yedek-${tarih}.db`;
      const kayitYolu = await save({
        title: "Veritabanı yedeğini kaydet",
        defaultPath: dosyaAdi,
        filters: [{ name: "SQLite Veritabanı", extensions: ["db"] }],
      });
      if (!kayitYolu) return;
      await veritabaniYedekle(kayitYolu);
      toast({ variant: "success", title: "Yedek alındı", description: kayitYolu });
    } catch (e) {
      toast({ variant: "destructive", title: "Yedekleme hatası", description: String(e) });
    } finally {
      setIslemYapiliyor(false);
    }
  };

  const yedekSec = async () => {
    try {
      const dosya = await open({
        title: "Yedek veritabanı seçin",
        filters: [{ name: "SQLite Veritabanı", extensions: ["db"] }],
        multiple: false,
      });
      if (!dosya) return;
      setSeciliYedekYol(dosya);
      setYuklemeOnay(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: String(e) });
    }
  };

  const yedekGeriYukle = async () => {
    try {
      setIslemYapiliyor(true);
      setYuklemeOnay(false);
      await veritabaniGeriYukle(seciliYedekYol);
      toast({ variant: "success", title: "Geri yükleme tamamlandı", description: "Veriler başarıyla yüklendi. Sayfa yenileniyor..." });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({ variant: "destructive", title: "Geri yükleme hatası", description: String(e) });
    } finally {
      setIslemYapiliyor(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex h-11 items-center gap-2 border-b px-5">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Ayarlar</h1>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5">
        <div className="max-w-lg space-y-6">

          {/* Firma Bilgileri */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Firma Bilgileri
            </h2>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Bu bilgiler ekstre PDF çıktısının başlığında görünür.
              </p>
              <div className="space-y-1">
                <Label htmlFor="firmaAdi">Firma Adı / Ticari Ünvan</Label>
                <Input
                  id="firmaAdi"
                  value={firma.firmaAdi || ""}
                  onChange={(e) => setFirma((f) => ({ ...f, firmaAdi: e.target.value }))}
                  placeholder="Örn: ABC Ticaret Ltd. Şti."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adres">Adres</Label>
                <Input
                  id="adres"
                  value={firma.adres || ""}
                  onChange={(e) => setFirma((f) => ({ ...f, adres: e.target.value }))}
                  placeholder="Örn: Atatürk Cad. No:1 İstanbul"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="vergiDairesi">Vergi Dairesi</Label>
                  <Input
                    id="vergiDairesi"
                    value={firma.vergiDairesi || ""}
                    onChange={(e) => setFirma((f) => ({ ...f, vergiDairesi: e.target.value }))}
                    placeholder="Örn: Kadıköy V.D."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vergiNo">Vergi Numarası</Label>
                  <Input
                    id="vergiNo"
                    value={firma.vergiNo || ""}
                    onChange={(e) => setFirma((f) => ({ ...f, vergiNo: e.target.value }))}
                    placeholder="Örn: 1234567890"
                  />
                </div>
              </div>
              <Button onClick={firmaKaydet} size="sm" className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Kaydet
              </Button>
            </div>
          </section>

          {/* Görünüm */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Görünüm
            </h2>
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div>
                <p className="text-sm font-medium">Tema</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uygulamanın renk temasını seçin
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {temalar.map(({ deger, label, icon: Icon }) => (
                  <button
                    key={deger}
                    onClick={() => setTema(deger)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-md border p-3 text-xs font-medium transition-colors",
                      tema === deger
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Veritabanı */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Veritabanı
            </h2>
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Tüm cari, fatura ve işlem verilerinizi yedekleyebilir veya mevcut bir yedekten geri yükleyebilirsiniz.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Yedek Al</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Veritabanının bir kopyasını bilgisayarınıza kaydedin.
                  </p>
                  <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={yedekAl} disabled={islemYapiliyor}>
                    <Download className="h-3.5 w-3.5" />
                    Yedeği İndir
                  </Button>
                </div>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Geri Yükle</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Daha önce alınmış bir yedek dosyasını sisteme yükleyin.
                  </p>
                  <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={yedekSec} disabled={islemYapiliyor}>
                    <Upload className="h-3.5 w-3.5" />
                    Yedek Yükle
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Geri Yükleme Onay Dialogu */}
          <Dialog open={yuklemeOnay} onOpenChange={setYuklemeOnay}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Geri Yükleme Onayı
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Bu işlem geri alınamaz!</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mevcut veritabanınızdaki <strong>tüm cariler, faturalar ve işlemler silinecek</strong> ve
                    seçtiğiniz yedek dosyasındaki verilerle değiştirilecektir.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Devam etmeden önce mevcut verilerinizin yedeğini aldığınızdan emin olun.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setYuklemeOnay(false)}>İptal</Button>
                <Button variant="destructive" onClick={yedekGeriYukle} disabled={islemYapiliyor}>
                  {islemYapiliyor ? "Yükleniyor..." : "Evet, Geri Yükle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hakkında */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hakkında
            </h2>
            <div className="rounded-lg border bg-card p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Uygulama</span>
                <span className="font-medium text-foreground">Yavuz Turgut Muhasebe</span>
              </div>
              <div className="flex justify-between">
                <span>Sürüm</span>
                <span className="font-medium text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Veritabanı</span>
                <span className="font-medium text-foreground">SQLite (Yerel)</span>
              </div>
              <div className="flex justify-between">
                <span>Çerçeve</span>
                <span className="font-medium text-foreground">Tauri + React</span>
              </div>
              <div className="flex justify-between">
                <span>Geliştirici</span>
                <span className="font-medium text-foreground">Fırat Karakaş</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
