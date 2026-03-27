import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => {
    return localStorage.getItem("tema") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    const sistemKaranlık = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const karanlıkMı = tema === "dark" || (tema === "system" && sistemKaranlık);
    if (karanlıkMı) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("tema", tema);
  }, [tema]);

  return (
    <ThemeContext.Provider value={{ tema, setTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  return useContext(ThemeContext);
}
