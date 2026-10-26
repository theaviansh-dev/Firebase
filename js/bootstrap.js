const bootstrap = () => setTimeout(() => {
    if (localStorage.getItem("is_cookie_allowed")) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const cookie = document.getElementById("cookie");
    const allow = document.getElementById("allow");
    cookie.style.display = "block";
    allow.addEventListener("click", async () => {
        allow.disabled = true;
        try {
            await navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)), localStorage.setItem("is_cookie_allowed", "true"), window.location.reload();
        } catch (e) { console.error("Service Worker registration failed:", e), allow.disabled = !1 }
    }, { once: true });

    document.getElementById("notnow").addEventListener("click", () => {
        cookie.style.display = "none";
    }, { once: true });
}, 2500);

export default bootstrap;