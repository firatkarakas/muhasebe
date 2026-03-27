import { useState, useEffect, useCallback } from "react";
import { islemleriGetir, carileriGetir, islemEkle, islemSil } from "@/lib/db";
import { formatPara, formatTarih, bugunTarih } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";

const TIP_ETIKET = {
  tahsilat: { label: "Tahsilat", variant: "success", icon: TrendingUp },
  tediye: { label: "Tediye", variant: "destructive", icon: TrendingDown },
};

const bosForm = {
  cari_id: "", tip: "tahsilat", tutar: "", aciklama: "", tarih: bugunTarih(), belge_no: "",
};

export default function Islemler() {
  const [islemler, setIslemler] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [dialogAcik, setDialogAcik] = useState(false);
  const [form, setForm] = useState(bosForm);
  const [silOnay, setSilOnay] = useState(null);
  const [filtreCari, setFiltreCari] = useState("hepsi");

  const veriYukle = useCallback(async () => {
    const [i, c] = await Promise.all([islemleriGetir(), carileriGetir()]);
    setIslemler(i);
    setCariler(c);
  }, []);

  useEffect(() => { veriYukle(); }, [veriYukle]);

  const filtrelenmis = (filtreCari && filtreCari !== "hepsi")
    ? islemler.filter((i) => String(i.cari_id) === filtreCari)
    : islemler;

  const formGuncelle = (alan, deger) => setForm((f) => ({ ...f, [alan]: deger }));

  const handleKaydet = async () => {
    if (!form.cari_id || !form.tutar || parseFloat(form.tutar) <= 0) {
      toast({ variant: "destructive", title: "Hata", description: "Cari ve tutar zorunludur." });
      return;
    }
    try {
      await islemEkle({ ...form, tutar: parseFloat(form.tutar) });
      toast({ variant: "success", title: "Kaydedildi", description: "İşlem başarıyla eklendi." });
      setDialogAcik(false);
      setForm(bosForm);
      veriYukle();
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: String(e) });
    }
  };

  const handleSil = async (islem) => {
    try {
      await islemSil(islem.id, islem.cari_id);
      toast({ title: "Silindi", description: "İşlem silindi." });
      setSilOnay(null);
      veriYukle();
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: "Silme başarısız." });
    }
  };

  const toplamTahsilat = filtrelenmis.filter((i) => i.tip === "tahsilat").reduce((s, i) => s + i.tutar, 0);
  const toplamTediye = filtrelenmis.filter((i) => i.tip === "tediye").reduce((s, i) => s + i.tutar, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex h-11 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">İşlemler</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtreCari} onValueChange={setFiltreCari}>
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Tüm cariler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hepsi">Tüm Cariler</SelectItem>
              {cariler.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.ad}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setForm(bosForm); setDialogAcik(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Yeni İşlem
          </Button>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="flex gap-3 border-b px-5 py-3">
        <div className="rounded-md border border-l-4 border-l-green-500 bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">Toplam Tahsilat</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatPara(toplamTahsilat)}</p>
        </div>
        <div className="rounded-md border border-l-4 border-l-red-500 bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">Toplam Tediye</p>
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatPara(toplamTediye)}</p>
        </div>
        <div className={`rounded-md border border-l-4 bg-card px-4 py-2 ${toplamTahsilat - toplamTediye >= 0 ? "border-l-green-500" : "border-l-red-500"}`}>
          <p className="text-xs text-muted-foreground">Net</p>
          <p className={`text-sm font-bold ${toplamTahsilat - toplamTediye >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {formatPara(toplamTahsilat - toplamTediye)}
          </p>
        </div>
      </div>

      {/* Tablo */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {filtrelenmis.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Henüz işlem eklenmedi.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Tarih</th>
                <th className="py-2 pr-4 font-medium">Cari</th>
                <th className="py-2 pr-4 font-medium">Tip</th>
                <th className="py-2 pr-4 font-medium">Açıklama</th>
                <th className="py-2 pr-4 font-medium">Belge No</th>
                <th className="py-2 pr-4 font-medium text-right">Tutar</th>
                <th className="py-2 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrelenmis.map((islem) => {
                const tipBilgi = TIP_ETIKET[islem.tip] || { label: islem.tip, variant: "outline" };
                return (
                  <tr key={islem.id} className="hover:bg-muted/30">
                    <td className="py-2 pr-4 text-muted-foreground">{formatTarih(islem.tarih)}</td>
                    <td className="py-2 pr-4 font-medium">{islem.cari_adi}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={tipBilgi.variant}>{tipBilgi.label}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{islem.aciklama || "-"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{islem.belge_no || "-"}</td>
                    <td className={`py-2 pr-4 text-right font-medium ${islem.tip === "tahsilat" ? "text-green-700" : "text-red-700"}`}>
                      {islem.tip === "tahsilat" ? "+" : "-"}{formatPara(islem.tutar)}
                    </td>
                    <td className="py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setSilOnay(islem)}
                        className="min-h-[36px] min-w-[36px] hover:bg-destructive/10 hover:text-destructive" title="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Yeni İşlem Dialogu */}
      <Dialog open={dialogAcik} onOpenChange={setDialogAcik}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni İşlem</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Cari *</Label>
              <Select value={form.cari_id} onValueChange={(v) => formGuncelle("cari_id", v)}>
                <SelectTrigger><SelectValue placeholder="Cari seçin..." /></SelectTrigger>
                <SelectContent>
                  {cariler.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>İşlem Tipi</Label>
              <Select value={form.tip} onValueChange={(v) => formGuncelle("tip", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tahsilat">Tahsilat (Ödeme Aldık)</SelectItem>
                  <SelectItem value="tediye">Tediye (Ödeme Yaptık)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tutar (₺) *</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.tutar}
                onChange={(e) => formGuncelle("tutar", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label>Tarih</Label>
              <Input type="date" value={form.tarih} onChange={(e) => formGuncelle("tarih", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Belge / Makbuz No</Label>
              <Input value={form.belge_no} onChange={(e) => formGuncelle("belge_no", e.target.value)} placeholder="Opsiyonel" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Açıklama</Label>
              <Textarea value={form.aciklama} onChange={(e) => formGuncelle("aciklama", e.target.value)} rows={2} placeholder="Opsiyonel açıklama..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogAcik(false)}>İptal</Button>
            <Button onClick={handleKaydet}>Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Silme Onay */}
      <Dialog open={!!silOnay} onOpenChange={() => setSilOnay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>İşlemi Sil</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu işlemi silmek istediğinizden emin misiniz? Cari bakiyesi otomatik güncellenecektir.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSilOnay(null)}>İptal</Button>
            <Button variant="destructive" onClick={() => handleSil(silOnay)}>Evet, Sil</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
