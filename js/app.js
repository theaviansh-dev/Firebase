import { boot } from "./boot.js";
import bootstrap from "./bootstrap.js";
import offlineCard from "./offlineCard.js";
import pwaWorker from './pwa-worker.js';
window.addEventListener("offline", () => offlineCard(true));
window.addEventListener("online", () => localStorage.getItem("is_cookie_allowed") ? offlineCard(false) : window.location.reload());
const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
        try {
            await navigator.serviceWorker.register(new URL("../sw.js", import.meta.url));
            localStorage.setItem("is_cookie_allowed", "true");
        } catch (error) { console.error("Service Worker registration failed:", error); }
    }
};
if (localStorage.getItem("is_cookie_allowed") === "true") { registerServiceWorker() }
bootstrap(() => { registerServiceWorker() });
if (!navigator.onLine) { offlineCard(true) }
boot();
pwaWorker();