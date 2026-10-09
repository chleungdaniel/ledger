import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { LedgerProvider } from "./store/LedgerContext";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) {
      registration.update();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update();
      });
    }
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LedgerProvider>
      <App />
    </LedgerProvider>
  </StrictMode>,
);
