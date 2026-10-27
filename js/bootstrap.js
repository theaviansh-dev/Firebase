const bootstrap = (onAllow) => {
    if (localStorage.getItem("is_cookie_allowed")) return;
    const cookie = document.getElementById("cookie");
    if (!("serviceWorker" in navigator)) { cookie.style.display = "none"; return; }

    setTimeout(() => {
        const allow = document.getElementById("allow");
        const notNow = document.getElementById("notnow");
        if (!cookie || !allow || !notNow) return;
        cookie.style.display = "block";

        allow.addEventListener("click", () => {
            allow.disabled = true;
            cookie.style.display = "none";
            if (typeof onAllow === "function") onAllow();
        }, { once: true });

        notNow.addEventListener("click", () => {
            cookie.style.display = "none";
        }, { once: true });
    }, 2500);
};

export default bootstrap;