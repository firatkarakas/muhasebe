import { useState, useEffect, useCallback } from "react";
import { carileriGetir, cariEkle, cariGuncelle, cariSil } from "@/lib/db";
import { formatPara } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";

const bosForm = {
  ad: "", tip: "musteri", telefon: "", email: "",
  adres: "", vergi_no: "", vergi_dairesi: "", notlar: "",
};

export default function CariListe() {
  const [cariler, setCariler] = useState([]);
  const [arama, setArama] = useState("");
  const [dialogAcik, setDialogAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState(null);
  const [form, setForm] = useState(bosForm);
  const [silOnay, setSilOnay] = useState(null);

  const veriYukle = useCallback(async () => {
    const data = await carileriGetir();
    setCariler(data);
  }, []);

  useEffect(() => { veriYukle(); }, [veriYukle]);

  const filtrelenmis = cariler.filter(
    (c) => c.ad.toLowerCase().includes(arama.toLowerCase()) ||
      (c.telefon || "").includes(arama)
  );

  const formGuncelle = (alan, deger) => setForm((f) => ({ ...f, [alan]: deger }));

  const dialogAc = (cari = null) => {
    setDuzenlenen(cari);
    setForm(cari ? { ...cari } : bosForm);
    setDialogAcik(true);
  };

  const handleKaydet = async () => {
    if (!form.ad.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Cari adı zorunludur." });
      return;
    }
    try {
      if (duzenlenen) {
        await cariGuncelle(duzenlenen.id, form);
        toast({ variant: "success", title: "Güncellendi", description: `${form.ad} başarıyla güncellendi.` });
      } else {
        await cariEkle(form);
        toast({ variant: "success", title: "Eklendi", description: `${form.ad} cariler listesine eklendi.` });
      }
      setDialogAcik(false);
      veriYukle();
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: String(e) });
    }
  };

  const handleSil = async (cari) => {
    try {
      await cariSil(cari.id);
      toast({ title: "Silindi", description: `${cari.ad} silindi.` });
      setSilOnay(null);
      veriYukle();
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: "Silme işlemi başarısız." });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex h-11 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Cari Hesaplar</h1>
          <span className="text-xs text-muted-foreground">({cariler.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-7 pl-8 text-xs w-48"
              placeholder="Ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => dialogAc()}>
            <Plus className="h-3.5 w-3.5" />
            Yeni Cari
          </Button>
        </div>
      </div>

      {/* Tablo */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {filtrelenmis.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {arama ? "Arama sonucu bulunamadı." : "Henüz cari eklenmedi."}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Ad / Ünvan</th>
                <th className="py-2 pr-4 font-medium">Tip</th>
                <th className="py-2 pr-4 font-medium">Telefon</th>
                <th className="py-2 pr-4 font-medium">E-Posta</th>
                <th className="py-2 pr-4 font-medium text-right">Bakiye</th>
                <th className="py-2 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrelenmis.map((cari) => (
                <tr key={cari.id} className="hover:bg-muted/30">
                  <td className="py-2 pr-4 font-medium">{cari.ad}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={cari.tip === "musteri" ? "default" : "secondary"}>
                      {cari.tip === "musteri" ? "Müşteri" : "Tedarikçi"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{cari.telefon || "-"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{cari.email || "-"}</td>
                  <td className={`py-2 pr-4 text-right font-medium ${cari.bakiye > 0 ? "text-blue-600 dark:text-blue-400" : cari.bakiye < 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>
                    {formatPara(cari.bakiye)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="min-h-[36px] min-w-[36px]" onClick={() => dialogAc(cari)} title="Düzenle">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setSilOnay(cari)}
                        className="min-h-[36px] min-w-[36px] hover:bg-destructive/10 hover:text-destructive" title="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cari Ekleme/Düzenleme Dialogu */}
      <Dialog open={dialogAcik} onOpenChange={setDialogAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{duzenlenen ? "Cari Düzenle" : "Yeni Cari Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Ad / Ünvan *</Label>
              <Input value={form.ad} onChange={(e) => formGuncelle("ad", e.target.value)} placeholder="Cari adı" />
            </div>
            <div className="space-y-1">
              <Label>Tip</Label>
              <Select value={form.tip} onValueChange={(v) => formGuncelle("tip", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="musteri">Müşteri</SelectItem>
                  <SelectItem value="tedarikci">Tedarikçi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Telefon</Label>
              <Input value={form.telefon} onChange={(e) => formGuncelle("telefon", e.target.value)} placeholder="05xx xxx xx xx" />
            </div>
            <div className="space-y-1">
              <Label>E-Posta</Label>
              <Input value={form.email} onChange={(e) => formGuncelle("email", e.target.value)} placeholder="ornek@mail.com" />
            </div>
            <div className="space-y-1">
              <Label>Vergi No</Label>
              <Input value={form.vergi_no} onChange={(e) => formGuncelle("vergi_no", e.target.value)} placeholder="1234567890" />
            </div>
            <div className="space-y-1">
              <Label>Vergi Dairesi</Label>
              <Input value={form.vergi_dairesi} onChange={(e) => formGuncelle("vergi_dairesi", e.target.value)} placeholder="Daire adı" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Adres</Label>
              <Textarea value={form.adres} onChange={(e) => formGuncelle("adres", e.target.value)} rows={2} placeholder="Adres..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notlar</Label>
              <Textarea value={form.notlar} onChange={(e) => formGuncelle("notlar", e.target.value)} rows={2} placeholder="İsteğe bağlı notlar..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogAcik(false)}>İptal</Button>
            <Button onClick={handleKaydet}>Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialogu */}
      <Dialog open={!!silOnay} onOpenChange={() => setSilOnay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cari Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{silOnay?.ad}</strong> adlı cariyi ve tüm ilgili kayıtları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
