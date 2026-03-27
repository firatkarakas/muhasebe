import { useState, useEffect } from "react";
import { kullaniciyiKontrolEt, sifreyiKaydet, sifreyiDogrula } from "@/lib/db";
import { Titlebar } from "@/components/layout/Titlebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

// Basit hash - production için daha güçlü bir yöntem kullanılabilir
async function hashSifre(sifre) {
  const encoder = new TextEncoder();
  const data = encoder.encode(sifre + "on-muhasebe-salt-2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Auth({ onGiris }) {
  const [mod, setMod] = useState(null); // 'kayit' | 'giris'
  const [sifre, setSifre] = useState("");
  const [sifreTekrar, setSifreTekrar] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    kullaniciyiKontrolEt()
      .then((varMi) => {
        setMod(varMi ? "giris" : "kayit");
      })
      .catch(() => {
        setMod("kayit");
      })
      .finally(() => {
        setYukleniyor(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata("");

    if (mod === "kayit") {
      if (sifre.length < 4) {
        setHata("Şifre en az 4 karakter olmalıdır.");
        return;
      }
      if (sifre !== sifreTekrar) {
        setHata("Şifreler eşleşmiyor.");
        return;
      }
      const hash = await hashSifre(sifre);
      await sifreyiKaydet(hash);
      onGiris();
    } else {
      const hash = await hashSifre(sifre);
      const dogru = await sifreyiDogrula(hash);
      if (dogru) {
        onGiris();
      } else {
        setHata("Yanlış şifre. Lütfen tekrar deneyin.");
      }
    }
  };

  if (yukleniyor) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Titlebar />
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30" style={{ paddingTop: 40 }}>
      <Titlebar />
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Lock className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold">Yavuz Turgut Muhasebe</h1>
          <p className="text-xs text-muted-foreground">
            {mod === "kayit"
              ? "İlk kullanım — şifrenizi belirleyin"
              : "Devam etmek için şifrenizi girin"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sifre">Şifre</Label>
            <Input
              id="sifre"
              type="password"
              placeholder="••••••"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              autoFocus
            />
          </div>

          {mod === "kayit" && (
            <div className="space-y-1.5">
              <Label htmlFor="sifreTekrar">Şifre (Tekrar)</Label>
              <Input
                id="sifreTekrar"
                type="password"
                placeholder="••••••"
                value={sifreTekrar}
                onChange={(e) => setSifreTekrar(e.target.value)}
              />
            </div>
          )}

          {hata && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {hata}
            </p>
          )}

          <Button type="submit" className="w-full">
            {mod === "kayit" ? "Şifreyi Belirle ve Gir" : "Giriş Yap"}
          </Button>
        </form>
      </div>
    </div>
  );
}
