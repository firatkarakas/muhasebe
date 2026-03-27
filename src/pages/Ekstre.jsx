import { useState, useEffect, useCallback } from "react";
import { carileriGetir, ekstreGetir, acilisBakiyeGetir } from "@/lib/db";
import { formatPara, formatTarih, bugunTarih } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const TIP_ETIKETI = {
  tahsilat: { label: "Tahsilat", variant: "success" },
  tediye: { label: "Tediye", variant: "destructive" },
  fatura: { label: "Fatura", variant: "default" },
};

function ilkGunuGetir() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function tarihAraliklari() {
  const bugun = new Date();
  const yil = bugun.getFullYear();
  const ay = bugun.getMonth();

  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // Bu Ay
  const buAyBas = fmt(yil, ay, 1);
  const buAySon = fmt(yil, ay, new Date(yil, ay + 1, 0).getDate());

  // Geçen Ay
  const gecenAy = new Date(yil, ay - 1, 1);
  const gAyBas = fmt(gecenAy.getFullYear(), gecenAy.getMonth(), 1);
  const gAySon = fmt(gecenAy.getFullYear(), gecenAy.getMonth(), new Date(gecenAy.getFullYear(), gecenAy.getMonth() + 1, 0).getDate());

  // Bu Yıl
  const buYilBas = `${yil}-01-01`;
  const buYilSon = `${yil}-12-31`;

  return [
    { label: "Bu Ay", bas: buAyBas, son: buAySon },
    { label: "Geçen Ay", bas: gAyBas, son: gAySon },
    { label: "Bu Yıl", bas: buYilBas, son: buYilSon },
  ];
}

export default function Ekstre() {
  const [cariler, setCariler] = useState([]);
  const [seciliCariId, setSeciliCariId] = useState("");
  const [baslangic, setBaslangic] = useState(ilkGunuGetir());
  const [bitis, setBitis] = useState(bugunTarih());
  const [hareketler, setHareketler] = useState([]);
  const [aramaYapildi, setAramaYapildi] = useState(false);

  useEffect(() => {
    carileriGetir().then(setCariler);
  }, []);

  const handleGetir = useCallback(async () => {
    if (!seciliCariId) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen bir cari seçin." });
      return;
    }
    const data = await ekstreGetir(seciliCariId, baslangic, bitis);
    setHareketler(data);
    setAramaYapildi(true);
  }, [seciliCariId, baslangic, bitis]);

  const seciliCari = cariler.find((c) => String(c.id) === seciliCariId);

  // Bakiye hesaplama (kümülatif)
  let kosulanBakiye = 0;
  const hareketlerBakiyeli = hareketler.map((h) => {
    if (h.kaynak_tip === "fatura") kosulanBakiye += h.tutar;
    else if (h.tip === "tahsilat") kosulanBakiye -= h.tutar;
    else if (h.tip === "tediye") kosulanBakiye += h.tutar;
    return { ...h, kosulan_bakiye: kosulanBakiye };
  });

  const toplamFatura = hareketler.filter((h) => h.kaynak_tip === "fatura").reduce((s, h) => s + h.tutar, 0);
  const toplamTahsilat = hareketler.filter((h) => h.tip === "tahsilat").reduce((s, h) => s + h.tutar, 0);
  const toplamTediye = hareketler.filter((h) => h.tip === "tediye").reduce((s, h) => s + h.tutar, 0);
  const netBakiye = toplamFatura - toplamTahsilat + toplamTediye;

  const pdfIndir = async () => {
    if (!seciliCari || hareketler.length === 0) return;

    // ── Roboto font yükle (Türkçe karakter desteği) ────────
    const loadFont = async (url) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      return btoa(binary);
    };

    let fontsLoaded = false;
    let regularB64 = null;
    let boldB64 = null;
    try {
      [regularB64, boldB64] = await Promise.all([
        loadFont("/fonts/Roboto-Regular.ttf"),
        loadFont("/fonts/Roboto-Bold.ttf"),
      ]);
      fontsLoaded = true;
    } catch (e) {
      // Font yüklenemezse helvetica fallback kullanılır
    }

    const FN = fontsLoaded ? "Roboto" : "helvetica";

    const enc = (str = "") => {
      if (fontsLoaded) return String(str);
      return String(str)
        .replace(/İ/g, "I").replace(/ı/g, "i")
        .replace(/Ğ/g, "G").replace(/ğ/g, "g")
        .replace(/Ü/g, "U").replace(/ü/g, "u")
        .replace(/Ş/g, "S").replace(/ş/g, "s")
        .replace(/Ö/g, "O").replace(/ö/g, "o")
        .replace(/Ç/g, "C").replace(/ç/g, "c");
    };

    const p = (tutar) =>
      new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(tutar || 0);

    const acilisBakiye = await acilisBakiyeGetir(seciliCariId, baslangic);

    let firmaInfo = {};
    try { firmaInfo = JSON.parse(localStorage.getItem("firmaInfo") || "{}"); } catch {}

    // ── PDF kurulum — Dikey A4 ───────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    if (fontsLoaded) {
      doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    }

    const ML = 18;           // sol margin
    const MR = 18;           // sağ margin
    const PW = 210;          // A4 genişlik
    const PH = 297;          // A4 yükseklik
    const CW = PW - ML - MR; // 174mm kullanılabilir genişlik
    const RE = ML + CW;       // sağ kenar x koordinatı

    // ── Renk paleti ──────────────────────────────────────
    const CLR = {
      black: [0, 0, 0],
      dark: [30, 30, 30],
      mid: [100, 100, 100],
      light: [160, 160, 160],
      headBg: [245, 247, 250],
      headBorder: [200, 205, 210],
      altRow: [252, 252, 254],
      footBg: [240, 242, 245],
      accent: [37, 99, 235],    // mavi vurgu
    };

    let y = 18;

    // ══════════════════════════════════════════════════════
    // SAYFA 1 BAŞLIK — Firma + Belge Başlığı (yan yana)
    // ══════════════════════════════════════════════════════

    // Sol: Firma bilgileri
    doc.setTextColor(...CLR.black);
    doc.setFont(FN, "bold");
    doc.setFontSize(12);
    doc.text(enc(firmaInfo.firmaAdi || "Firma Adı Belirtilmemiş"), ML, y);

    doc.setFont(FN, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CLR.mid);
    let fy = y + 5;
    if (firmaInfo.adres) { doc.text(enc(firmaInfo.adres), ML, fy); fy += 4; }
    const vParts = [
      firmaInfo.vergiDairesi && `V.D.: ${firmaInfo.vergiDairesi}`,
      firmaInfo.vergiNo && `V.No: ${firmaInfo.vergiNo}`,
    ].filter(Boolean);
    if (vParts.length > 0) { doc.text(enc(vParts.join("  |  ")), ML, fy); fy += 4; }

    // Sağ: Belge başlığı
    doc.setFont(FN, "bold");
    doc.setFontSize(15);
    doc.setTextColor(...CLR.accent);
    doc.text(enc("CARİ HESAP EKSTRESİ"), RE, y, { align: "right" });

    doc.setFont(FN, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CLR.mid);
    doc.text(enc(`Tarih: ${formatTarih(bugunTarih())}`), RE, y + 5, { align: "right" });

    y = Math.max(fy, y + 10) + 3;

    // Ayırıcı çizgi
    doc.setDrawColor(...CLR.headBorder);
    doc.setLineWidth(0.5);
    doc.line(ML, y, RE, y);
    y += 6;

    // ══════════════════════════════════════════════════════
    // CARİ BİLGİLERİ BLOĞU
    // ══════════════════════════════════════════════════════
    doc.setFont(FN, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CLR.mid);
    doc.text(enc("HESAP SAHİBİ"), ML, y);
    y += 5;

    doc.setFont(FN, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...CLR.black);
    doc.text(enc(seciliCari.ad), ML, y);
    y += 5;

    doc.setFont(FN, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CLR.mid);
    const cariDetay = [
      seciliCari.vergi_dairesi && `V.D.: ${seciliCari.vergi_dairesi}`,
      seciliCari.vergi_no && `VKN: ${seciliCari.vergi_no}`,
    ].filter(Boolean);
    if (cariDetay.length > 0) { doc.text(enc(cariDetay.join("  |  ")), ML, y); y += 4; }
    if (seciliCari.adres) { doc.text(enc(seciliCari.adres), ML, y); y += 4; }

    doc.setTextColor(...CLR.dark);
    doc.text(enc(`Dönem:  ${formatTarih(baslangic)}  —  ${formatTarih(bitis)}`), ML, y);
    y += 7;

    // İnce ayırıcı
    doc.setDrawColor(...CLR.headBorder);
    doc.setLineWidth(0.2);
    doc.line(ML, y, RE, y);
    y += 5;

    // ══════════════════════════════════════════════════════
    // İŞLEM TABLOSU
    // ══════════════════════════════════════════════════════
    let runBak = acilisBakiye;
    const tableBody = [];

    // Devreden Bakiye satırı
    tableBody.push([
      formatTarih(baslangic),
      enc("Devir"),
      enc("Devreden Bakiye"),
      acilisBakiye > 0 ? p(acilisBakiye) : "",
      acilisBakiye < 0 ? p(Math.abs(acilisBakiye)) : "",
      { content: p(acilisBakiye), styles: { fontStyle: "bold", textColor: CLR.black } },
    ]);

    hareketler.forEach((h) => {
      if (h.kaynak_tip === "fatura") runBak += h.tutar;
      else if (h.tip === "tahsilat") runBak -= h.tutar;
      else if (h.tip === "tediye") runBak += h.tutar;

      tableBody.push([
        formatTarih(h.tarih),
        enc(h.kaynak_tip === "fatura" ? "Fatura" : h.tip === "tahsilat" ? "Tahsilat" : "Tediye"),
        enc(h.aciklama || h.fatura_no || "-"),
        h.kaynak_tip === "fatura" || h.tip === "tediye" ? p(h.tutar) : "",
        h.tip === "tahsilat" ? p(h.tutar) : "",
        { content: p(runBak), styles: { fontStyle: "bold" } },
      ]);
    });

    // Sütun genişlikleri — 174mm toplam (portrait A4, 18mm margin)
    const colW = {
      0: { cellWidth: 22, halign: "center" },   // Tarih
      1: { cellWidth: 20, halign: "center" },   // Tip
      2: { cellWidth: 56, halign: "left" },      // Açıklama
      3: { cellWidth: 25, halign: "right" },     // Borç
      4: { cellWidth: 25, halign: "right" },     // Alacak
      5: { cellWidth: 26, halign: "right" },     // Bakiye
    };

    const tableStartY = y;

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: ML, right: MR, top: 18, bottom: 22 },
      tableWidth: CW,
      head: [[
        enc("Tarih"),
        enc("Tip"),
        enc("Açıklama / Belge No"),
        enc("Borç (TL)"),
        enc("Alacak (TL)"),
        enc("Bakiye (TL)"),
      ]],
      body: tableBody,
      foot: [[
        { content: enc("GENEL TOPLAM"), colSpan: 3, styles: { halign: "left" } },
        { content: p(toplamFatura + toplamTediye), styles: { halign: "right" } },
        { content: p(toplamTahsilat), styles: { halign: "right" } },
        { content: p(Math.abs(netBakiye)), styles: { halign: "right" } },
      ]],
      styles: {
        fontSize: 8,
        cellPadding: { top: 2.8, right: 3, bottom: 2.8, left: 3 },
        overflow: "ellipsize",
        font: FN,
        textColor: CLR.dark,
        lineWidth: 0.15,
        lineColor: [220, 220, 225],
      },
      headStyles: {
        fillColor: CLR.headBg,
        textColor: CLR.dark,
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
        lineWidth: 0.3,
        lineColor: CLR.headBorder,
        cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      },
      footStyles: {
        fillColor: CLR.footBg,
        textColor: CLR.black,
        fontStyle: "bold",
        fontSize: 8.5,
        lineWidth: 0.3,
        lineColor: CLR.headBorder,
      },
      alternateRowStyles: { fillColor: CLR.altRow },
      columnStyles: colW,

      // ── Çok sayfalı: her sayfada başlık tekrarı + footer ──
      didDrawPage: (data) => {
        const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
        const pageCount = doc.internal.getNumberOfPages();

        // Devam sayfalarında üst mini başlık
        if (pageNum > 1) {
          doc.setFontSize(7.5);
          doc.setFont(FN, "bold");
          doc.setTextColor(...CLR.dark);
          doc.text(enc(firmaInfo.firmaAdi || ""), ML, 12);

          doc.setFont(FN, "normal");
          doc.setTextColor(...CLR.mid);
          doc.text(
            enc(`${seciliCari.ad}  |  ${formatTarih(baslangic)} – ${formatTarih(bitis)}`),
            RE, 12, { align: "right" }
          );

          doc.setDrawColor(...CLR.headBorder);
          doc.setLineWidth(0.2);
          doc.line(ML, 14.5, RE, 14.5);
        }

        // Alt footer — her sayfada
        const footerY = PH - 10;
        doc.setDrawColor(...CLR.headBorder);
        doc.setLineWidth(0.15);
        doc.line(ML, footerY, RE, footerY);

        doc.setFontSize(6.5);
        doc.setFont(FN, "normal");
        doc.setTextColor(...CLR.light);
        doc.text(enc("Bu belge bilgi amaçlı düzenlenmiştir."), ML, footerY + 4);
        doc.text(`Sayfa ${pageNum} / ${pageCount}`, RE, footerY + 4, { align: "right" });
        doc.setTextColor(...CLR.black);
      },
    });

    // ══════════════════════════════════════════════════════
    // TABLO ALTI ÖZET KUTUSU
    // ══════════════════════════════════════════════════════
    const afterTableY = doc.lastAutoTable.finalY + 6;
    const boxW = 70;
    const boxX = RE - boxW;
    const summaryData = [
      ["Toplam Borç", p(toplamFatura + toplamTediye)],
      ["Toplam Alacak", p(toplamTahsilat)],
    ];
    const bakiyeLabel = netBakiye >= 0 ? "Bakiye (Cari Borçlu)" : "Bakiye (Cari Alacaklı)";

    // Özet kutu çerçevesi
    const boxH = summaryData.length * 6 + 10;
    doc.setFillColor(...CLR.headBg);
    doc.setDrawColor(...CLR.headBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, afterTableY, boxW, boxH, 1.5, 1.5, "FD");

    let sy = afterTableY + 5;
    doc.setFontSize(8);
    summaryData.forEach(([lbl, val]) => {
      doc.setFont(FN, "normal");
      doc.setTextColor(...CLR.mid);
      doc.text(enc(lbl), boxX + 4, sy);
      doc.setTextColor(...CLR.dark);
      doc.text(val, RE - 4, sy, { align: "right" });
      sy += 6;
    });

    // Net bakiye — vurgu çizgisi + kalın
    doc.setDrawColor(...CLR.accent);
    doc.setLineWidth(0.4);
    doc.line(boxX + 3, sy - 2, RE - 3, sy - 2);
    sy += 2;
    doc.setFont(FN, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...CLR.accent);
    doc.text(enc(bakiyeLabel), boxX + 4, sy);
    doc.text(p(Math.abs(netBakiye)), RE - 4, sy, { align: "right" });

    // ── Kaydet ────────────────────────────────────────────
    const dosyaAdi = `ekstre-${seciliCari.ad.replace(/\s+/g, "_")}-${baslangic}-${bitis}.pdf`;

    const kayitYolu = await save({
      title: "Ekstre PDF olarak kaydet",
      defaultPath: dosyaAdi,
      filters: [{ name: "PDF Dosyası", extensions: ["pdf"] }],
    });

    if (!kayitYolu) return;

    const pdfBytes = doc.output("arraybuffer");
    await writeFile(kayitYolu, new Uint8Array(pdfBytes));
    toast({ variant: "success", title: "PDF kaydedildi", description: kayitYolu });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex h-11 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Ekstre / Hesap Raporu</h1>
        </div>
      </div>

      {/* Filtre Alanı */}
      <div className="flex items-end gap-3 border-b px-5 py-3">
        <div className="space-y-1 w-60">
          <Label>Cari</Label>
          <Select value={seciliCariId} onValueChange={setSeciliCariId}>
            <SelectTrigger><SelectValue placeholder="Cari seçin..." /></SelectTrigger>
            <SelectContent>
              {cariler.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.ad} — {formatPara(c.bakiye)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Başlangıç</Label>
          <Input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label>Bitiş</Label>
          <Input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-1">
          {tarihAraliklari().map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => { setBaslangic(a.bas); setBitis(a.son); }}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-primary hover:text-primary-foreground ${
                baslangic === a.bas && bitis === a.son
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <Button onClick={handleGetir}>Getir</Button>
        {hareketler.length > 0 && (
          <Button variant="outline" onClick={pdfIndir}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            PDF İndir
          </Button>
        )}
      </div>

      {/* Özet */}
      {aramaYapildi && (
        <div className="flex gap-3 border-b px-5 py-3">
          <div className="rounded-md border border-l-4 border-l-gray-400 bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Toplam Fatura</p>
            <p className="text-sm font-bold">{formatPara(toplamFatura)}</p>
          </div>
          <div className="rounded-md border border-l-4 border-l-green-500 bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Toplam Tahsilat</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatPara(toplamTahsilat)}</p>
          </div>
          <div className="rounded-md border border-l-4 border-l-red-500 bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Toplam Tediye</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatPara(toplamTediye)}</p>
          </div>
          <div className={`rounded-md border border-l-4 bg-card px-4 py-2 ${netBakiye > 0 ? "border-l-blue-500" : netBakiye < 0 ? "border-l-orange-500" : "border-l-border"}`}>
            <p className="text-xs text-muted-foreground">Net Bakiye</p>
            <p className={`text-sm font-bold ${netBakiye > 0 ? "text-blue-600 dark:text-blue-400" : netBakiye < 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>
              {formatPara(Math.abs(netBakiye))}
              <span className="ml-1 text-xs font-normal">
                {netBakiye > 0 ? "(Cari Borçlu)" : netBakiye < 0 ? "(Cari Alacaklı)" : "(Bakiye Sıfır)"}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {!aramaYapildi ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Bir cari ve dönem seçerek ekstre oluşturun.
          </div>
        ) : hareketler.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Seçilen dönemde hareket bulunamadı.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Tarih</th>
                <th className="py-2 pr-4 font-medium">Tip</th>
                <th className="py-2 pr-4 font-medium">Açıklama / Belge</th>
                <th className="py-2 pr-4 font-medium text-right">Borç</th>
                <th className="py-2 pr-4 font-medium text-right">Alacak</th>
                <th className="py-2 font-medium text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {hareketlerBakiyeli.map((h, i) => {
                const tipBilgi = TIP_ETIKETI[h.kaynak_tip === "fatura" ? "fatura" : h.tip] || { label: h.tip, variant: "outline" };
                const borcTutar = h.kaynak_tip === "fatura" ? h.tutar : (h.tip === "tediye" ? h.tutar : null);
                const alacakTutar = h.tip === "tahsilat" ? h.tutar : null;
                return (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="py-1.5 pr-4 text-muted-foreground">{formatTarih(h.tarih)}</td>
                    <td className="py-1.5 pr-4">
                      <Badge variant={tipBilgi.variant}>{tipBilgi.label}</Badge>
                    </td>
                    <td className="py-1.5 pr-4">
                      {h.aciklama || h.fatura_no || <span className="text-muted-foreground/50">-</span>}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-red-600 dark:text-red-400">
                      {borcTutar != null ? formatPara(borcTutar) : ""}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-green-600 dark:text-green-400">
                      {alacakTutar != null ? formatPara(alacakTutar) : ""}
                    </td>
                    <td className={`py-1.5 text-right font-medium ${h.kosulan_bakiye > 0 ? "text-blue-600 dark:text-blue-400" : h.kosulan_bakiye < 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>
                      {formatPara(h.kosulan_bakiye)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <td colSpan={3} className="py-2 pr-4 text-right text-xs">TOPLAM</td>
                <td className="py-2 pr-4 text-right text-xs text-red-600 dark:text-red-400">{formatPara(toplamFatura + toplamTediye)}</td>
                <td className="py-2 pr-4 text-right text-xs text-green-600 dark:text-green-400">{formatPara(toplamTahsilat)}</td>
                <td className={`py-2 text-right text-xs font-bold ${netBakiye > 0 ? "text-blue-600 dark:text-blue-400" : netBakiye < 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>{formatPara(Math.abs(netBakiye))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
