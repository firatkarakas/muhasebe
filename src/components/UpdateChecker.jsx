import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";
import { Download, Loader2 } from "lucide-react";

export function UpdateChecker() {
  const [guncelleme, setGuncelleme] = useState(null);
  const [dialogAcik, setDialogAcik] = useState(false);
  const [indiriliyor, setIndiriliyor] = useState(false);

  useEffect(() => {
    let iptal = false;

    async function kontrolEt() {
      try {
        const update = await check();
        if (!iptal && update?.available) {
          setGuncelleme(update);
          setDialogAcik(true);
        }
      } catch (e) {
        console.error("Güncelleme kontrolü başarısız:", e);
      }
    }

    const zamanlayici = setTimeout(kontrolEt, 3000);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, []);

  const guncelle = async () => {
    if (!guncelleme) return;
    setIndiriliyor(true);
    try {
      await guncelleme.downloadAndInstall((event) => {
        if (event.event === "Started") {
          console.log("Güncelleme indiriliyor...");
        } else if (event.event === "Finished") {
          console.log("İndirme tamamlandı.");
        }
      });
      toast({
        title: "Güncelleme tamamlandı",
        description: "Uygulama yeniden başlatılıyor...",
      });
      await relaunch();
    } catch (e) {
      console.error("Güncelleme hatası:", e);
      toast({
        variant: "destructive",
        title: "Güncelleme başarısız",
        description: "Lütfen daha sonra tekrar deneyin.",
      });
      setIndiriliyor(false);
    }
  };

  if (!guncelleme) return null;

  return (
    <Dialog open={dialogAcik} onOpenChange={setDialogAcik}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Yeni Güncelleme Mevcut
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong>v{guncelleme.version}</strong> sürümü yüklenmeye hazır.
          </p>
          {guncelleme.body && (
            <div className="rounded-md bg-muted p-3 text-sm max-h-40 overflow-y-auto">
              {guncelleme.body}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogAcik(false)}
              disabled={indiriliyor}
            >
              Daha Sonra
            </Button>
            <Button onClick={guncelle} disabled={indiriliyor}>
              {indiriliyor ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İndiriliyor...
                </>
              ) : (
                "Güncelle"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
