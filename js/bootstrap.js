const bootstrap = () => setTimeout(() => {
    if (localStorage.getItem("is_cookie_allowed")) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const cookie = document.getElementById("cookie");
    const allow = document.getElementById("allow");
    cookie.classList.remove("hidden");
    allow.addEventListener("click", async () => {
        allow.disabled = true;
        try { await navigator.serviceWorker.register(`${window.location.href}sw.js`), localStorage.setItem("is_cookie_allowed", "true"), window.location.reload();
        } catch (e) { console.error("Service Worker registration failed:", e), allow.disabled = !1 }
    }, { once: true });

    document.getElementById("notnow").addEventListener("click", () => {
        cookie.classList.add("hidden");
    }, { once: true });
}, 2500);

export default bootstrap;