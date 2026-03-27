import { useState, useEffect, useCallback } from "react";
import { carileriGetir, faturaKaydet, faturalariGetir, faturaSil, faturaGetir } from "@/lib/db";
import { formatPara, formatTarih, bugunTarih, faturaNoCuret } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, Eye, Printer, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const bosKalem = () => ({ aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, toplam: 0 });

function hesaplaKalem(kalem) {
  return { ...kalem, toplam: parseFloat(kalem.miktar || 0) * parseFloat(kalem.birim_fiyat || 0) };
}

export default function FaturaKes() {
  const [faturalar, setFaturalar] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [yeniDialogAcik, setYeniDialogAcik] = useState(false);
  const [onizlemeDialogAcik, setOnizlemeDialogAcik] = useState(false);
  const [seciliFatura, setSeciliFatura] = useState(null);
  const [silOnay, setSilOnay] = useState(null);
  const [form, setForm] = useState({
    cari_id: "", fatura_no: faturaNoCuret(),
    tarih: bugunTarih(), vade_tarihi: "", kdv_orani: "20", notlar: "",
  });
  const [kalemler, setKalemler] = useState([bosKalem()]);

  const veriYukle = useCallback(async () => {
    const [f, c] = await Promise.all([faturalariGetir(), carileriGetir()]);
    setFaturalar(f);
    setCariler(c);
  }, []);

  useEffect(() => { veriYukle(); }, [veriYukle]);

  const araToplam = kalemler.reduce((s, k) => s + (k.toplam || 0), 0);
  const kdvTutari = araToplam * (parseFloat(form.kdv_orani) / 100);
  const genelToplam = araToplam + kdvTutari;

  const kalemGuncelle = (idx, alan, deger) => {
    setKalemler((prev) => {
      const yeni = [...prev];
      yeni[idx] = hesaplaKalem({ ...yeni[idx], [alan]: deger });
      return yeni;
    });
  };

  const kalemEkle = () => setKalemler((prev) => [...prev, bosKalem()]);
  const kalemSil = (idx) => setKalemler((prev) => prev.filter((_, i) => i !== idx));

  const handleKaydet = async () => {
    if (!form.cari_id) {
      toast({ variant: "destructive", title: "Hata", description: "Cari seçimi zorunludur." });
      return;
    }
    if (kalemler.some((k) => !k.aciklama.trim())) {
      toast({ variant: "destructive", title: "Hata", description: "Tüm kalemlerin açıklaması olmalıdır." });
      return;
    }
    try {
      await faturaKaydet(
        { ...form, ara_toplam: araToplam, kdv_tutari: kdvTutari, genel_toplam: genelToplam },
        kalemler
      );
      toast({ variant: "success", title: "Fatura Kaydedildi", description: `${form.fatura_no} numaralı fatura oluşturuldu.` });
      setYeniDialogAcik(false);
      setKalemler([bosKalem()]);
      setForm({ cari_id: "", fatura_no: faturaNoCuret(), tarih: bugunTarih(), vade_tarihi: "", kdv_orani: "20", notlar: "" });
      veriYukle();
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: String(e) });
    }
  };

  const handleOnizle = async (fatura) => {
    const detay = await faturaGetir(fatura.id);
    setSeciliFatura(detay);
    setOnizlemeDialogAcik(true);
  };

  const handleSil = async (fatura) => {
    try {
      await faturaSil(fatura.id, fatura.cari_id);
      toast({ title: "Silindi", description: "Fatura silindi." });
      setSilOnay(null);
      veriYukle();
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: "Silme başarısız." });
    }
  };

  const pdfIndir = async (fatura) => {
    if (!fatura) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const cari = cariler.find((c) => c.id === fatura.cari_id);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("FATURA", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fatura No: ${fatura.fatura_no}`, 14, 35);
    doc.text(`Tarih: ${formatTarih(fatura.tarih)}`, 14, 41);
    if (fatura.vade_tarihi) doc.text(`Vade: ${formatTarih(fatura.vade_tarihi)}`, 14, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Faturalanan:", 120, 35);
    doc.setFont("helvetica", "normal");
    doc.text(fatura.cari_adi || (cari?.ad || "-"), 120, 41);
    if (cari?.vergi_no) doc.text(`VKN: ${cari.vergi_no}`, 120, 47);
    if (cari?.telefon) doc.text(`Tel: ${cari.telefon}`, 120, 53);

    autoTable(doc, {
      startY: 65,
      head: [["Açıklama", "Miktar", "Birim", "Birim Fiyat", "Toplam"]],
      body: (fatura.kalemler || []).map((k) => [
        k.aciklama,
        k.miktar,
        k.birim,
        formatPara(k.birim_fiyat),
        formatPara(k.toplam),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text(`Ara Toplam: ${formatPara(fatura.ara_toplam)}`, 150, finalY, { align: "right" });
    doc.text(`KDV (%${fatura.kdv_orani}): ${formatPara(fatura.kdv_tutari)}`, 150, finalY + 6, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`GENEL TOPLAM: ${formatPara(fatura.genel_toplam)}`, 150, finalY + 14, { align: "right" });

    if (fatura.notlar) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Not: ${fatura.notlar}`, 14, finalY + 25);
    }

    const dosyaAdi = `fatura-${fatura.fatura_no}.pdf`;
    const kayitYolu = await save({
      title: "Faturayı PDF olarak kaydet",
      defaultPath: dosyaAdi,
      filters: [{ name: "PDF Dosyası", extensions: ["pdf"] }],
    });
    if (!kayitYolu) return;
    const pdfBytes = doc.output("arraybuffer");
    await writeFile(kayitYolu, new Uint8Array(pdfBytes));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex h-11 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Faturalar</h1>
          <span className="text-xs text-muted-foreground">({faturalar.length})</span>
        </div>
        <Button size="sm" onClick={() => {
          setKalemler([bosKalem()]);
          setForm({ cari_id: "", fatura_no: faturaNoCuret(), tarih: bugunTarih(), vade_tarihi: "", kdv_orani: "20", notlar: "" });
          setYeniDialogAcik(true);
        }}>
          <Plus className="h-3.5 w-3.5" />
          Yeni Fatura
        </Button>
      </div>

      {/* Fatura Listesi */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {faturalar.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Henüz fatura kesilmedi.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Fatura No</th>
                <th className="py-2 pr-4 font-medium">Tarih</th>
                <th className="py-2 pr-4 font-medium">Cari</th>
                <th className="py-2 pr-4 font-medium">Vade</th>
                <th className="py-2 pr-4 font-medium">KDV</th>
                <th className="py-2 pr-4 font-medium text-right">Toplam</th>
                <th className="py-2 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {faturalar.map((f) => (
                <tr key={f.id} className="hover:bg-muted/30">
                  <td className="py-2 pr-4 font-mono font-medium">{f.fatura_no}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{formatTarih(f.tarih)}</td>
                  <td className="py-2 pr-4">{f.cari_adi}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{f.vade_tarihi ? formatTarih(f.vade_tarihi) : "-"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">%{f.kdv_orani}</td>
                  <td className="py-2 pr-4 text-right font-medium">{formatPara(f.genel_toplam)}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="min-h-[36px] min-w-[36px]" onClick={() => handleOnizle(f)} title="Önizle">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="min-h-[36px] min-w-[36px]" onClick={async () => {
                        const detay = await faturaGetir(f.id);
                        pdfIndir(detay);
                      }} title="PDF İndir">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setSilOnay(f)}
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

      {/* Yeni Fatura - Sağdan kayan panel (slide-over) */}
      {yeniDialogAcik && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-in fade-in-0"
            onClick={() => setYeniDialogAcik(false)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l bg-background shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Panel Başlık */}
            <div className="flex h-11 items-center justify-between border-b px-5">
              <h2 className="text-base font-semibold">Yeni Fatura Oluştur</h2>
              <Button variant="ghost" size="icon" onClick={() => setYeniDialogAcik(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Kaydırılabilir İçerik */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Fatura Başlık Bilgileri */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Cari *</Label>
                  <Select value={form.cari_id} onValueChange={(v) => setForm((f) => ({ ...f, cari_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Cari seçin..." /></SelectTrigger>
                    <SelectContent>
                      {cariler.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.ad}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Fatura No</Label>
                  <Input value={form.fatura_no} onChange={(e) => setForm((f) => ({ ...f, fatura_no: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>KDV Oranı (%)</Label>
                  <Select value={form.kdv_orani} onValueChange={(v) => setForm((f) => ({ ...f, kdv_orani: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">%0 (KDV Yok)</SelectItem>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tarih</Label>
                  <Input type="date" value={form.tarih} onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Vade Tarihi</Label>
                  <Input type="date" value={form.vade_tarihi} onChange={(e) => setForm((f) => ({ ...f, vade_tarihi: e.target.value }))} />
                </div>
              </div>

              {/* Fatura Kalemleri */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Fatura Kalemleri</Label>
                  <Button size="sm" variant="outline" onClick={kalemEkle}>
                    <Plus className="h-3.5 w-3.5" />
                    Kalem Ekle
                  </Button>
                </div>
                <div className="rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="px-3 py-2 font-medium">Açıklama</th>
                        <th className="w-20 px-3 py-2 font-medium">Miktar</th>
                        <th className="w-20 px-3 py-2 font-medium">Birim</th>
                        <th className="w-28 px-3 py-2 font-medium text-right">Birim Fiyat</th>
                        <th className="w-28 px-3 py-2 font-medium text-right">Toplam</th>
                        <th className="w-10 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {kalemler.map((kalem, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5">
                            <Input
                              className="h-7 text-xs"
                              value={kalem.aciklama}
                              onChange={(e) => kalemGuncelle(idx, "aciklama", e.target.value)}
                              placeholder="Ürün veya hizmet açıklaması"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              className="h-7 text-xs"
                              type="number" min="0" step="0.01"
                              value={kalem.miktar}
                              onChange={(e) => kalemGuncelle(idx, "miktar", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              className="h-7 text-xs"
                              value={kalem.birim}
                              onChange={(e) => kalemGuncelle(idx, "birim", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              className="h-7 text-right text-xs"
                              type="number" min="0" step="0.01"
                              value={kalem.birim_fiyat}
                              onChange={(e) => kalemGuncelle(idx, "birim_fiyat", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium">{formatPara(kalem.toplam)}</td>
                          <td className="px-3 py-1.5">
                            {kalemler.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={() => kalemSil(idx)} title="Kalemi sil">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Toplamlar */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ara Toplam</span>
                    <span>{formatPara(araToplam)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KDV (%{form.kdv_orani})</span>
                    <span>{formatPara(kdvTutari)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold">
                    <span>Genel Toplam</span>
                    <span>{formatPara(genelToplam)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Notlar</Label>
                <Textarea value={form.notlar} onChange={(e) => setForm((f) => ({ ...f, notlar: e.target.value }))} rows={2} placeholder="Fatura notları (opsiyonel)..." />
              </div>
            </div>

            {/* Sabit Alt Butonlar */}
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button variant="outline" onClick={() => setYeniDialogAcik(false)}>İptal</Button>
              <Button onClick={handleKaydet}>Faturayı Kaydet</Button>
            </div>
          </div>
        </>
      )}

      {/* Fatura Önizleme */}
      {seciliFatura && (
        <Dialog open={onizlemeDialogAcik} onOpenChange={setOnizlemeDialogAcik}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fatura: {seciliFatura.fatura_no}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cari</p>
                  <p className="font-medium">{seciliFatura.cari_adi}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarih</p>
                  <p>{formatTarih(seciliFatura.tarih)}</p>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 pr-4 font-medium">Açıklama</th>
                    <th className="py-1.5 pr-4 font-medium">Miktar</th>
                    <th className="py-1.5 pr-4 font-medium">Birim</th>
                    <th className="py-1.5 pr-4 font-medium text-right">B. Fiyat</th>
                    <th className="py-1.5 font-medium text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(seciliFatura.kalemler || []).map((k, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-4">{k.aciklama}</td>
                      <td className="py-1.5 pr-4">{k.miktar}</td>
                      <td className="py-1.5 pr-4">{k.birim}</td>
                      <td className="py-1.5 pr-4 text-right">{formatPara(k.birim_fiyat)}</td>
                      <td className="py-1.5 text-right">{formatPara(k.toplam)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-56 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ara Toplam</span><span>{formatPara(seciliFatura.ara_toplam)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">KDV (%{seciliFatura.kdv_orani})</span><span>{formatPara(seciliFatura.kdv_tutari)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-bold text-sm"><span>Genel Toplam</span><span>{formatPara(seciliFatura.genel_toplam)}</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOnizlemeDialogAcik(false)}>Kapat</Button>
              <Button onClick={() => pdfIndir(seciliFatura)}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                PDF İndir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Silme Onay */}
      <Dialog open={!!silOnay} onOpenChange={() => setSilOnay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Faturayı Sil</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{silOnay?.fatura_no}</strong> numaralı faturayı silmek istediğinizden emin misiniz?
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
