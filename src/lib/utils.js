import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPara(tutar) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(tutar || 0);
}

export function formatTarih(tarih) {
  if (!tarih) return "-";
  return new Date(tarih).toLocaleDateString("tr-TR");
}

export function bugunTarih() {
  return new Date().toISOString().split("T")[0];
}

export function faturaNoCuret(prefix = "FTR") {
  const tarih = new Date();
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, "0");
  const gun = String(tarih.getDate()).padStart(2, "0");
  const rastgele = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${yil}${ay}${gun}-${rastgele}`;
}
