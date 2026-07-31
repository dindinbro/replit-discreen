import { createRoot } from "react-dom/client";
import App from "./App";
import "./i18n";
import "./index.css";

if (typeof window !== "undefined") {
  console.log(
    "%cDISCREEN",
    "font: 700 20px 'Outfit', sans-serif; color: #818cf8; letter-spacing: 0.15em;"
  );
  console.log(
    "%cVous cherchez quelque chose ? Nous aussi.",
    "font: 13px 'Inter', sans-serif; color: #788090;"
  );
}

createRoot(document.getElementById("root")!).render(<App />);
