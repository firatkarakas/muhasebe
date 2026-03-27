import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Auth from "@/pages/Auth";
import { AppLayout } from "@/components/layout/AppLayout";
import CariListe from "@/pages/CariListe";
import Islemler from "@/pages/Islemler";
import FaturaKes from "@/pages/FaturaKes";
import Ekstre from "@/pages/Ekstre";
import Ayarlar from "@/pages/Ayarlar";
import { ThemeProvider } from "@/lib/theme.jsx";
import { UpdateChecker } from "@/components/UpdateChecker";

export default function App() {
  const [girisYapildi, setGirisYapildi] = useState(false);

  const handleCikis = () => {
    setGirisYapildi(false);
  };

  if (!girisYapildi) {
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <Auth onGiris={() => setGirisYapildi(true)} />
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <UpdateChecker />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout onCikis={handleCikis} />}>
              <Route index element={<Navigate to="/cariler" replace />} />
              <Route path="/cariler" element={<CariListe />} />
              <Route path="/islemler" element={<Islemler />} />
              <Route path="/fatura-kes" element={<FaturaKes />} />
              <Route path="/ekstre" element={<Ekstre />} />
              <Route path="/ayarlar" element={<Ayarlar />} />
              <Route path="*" element={<Navigate to="/cariler" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
