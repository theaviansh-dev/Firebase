const bootstrap = () => setTimeout(() => {
    if (!localStorage.getItem('is_cookie_allowed')) {
        if (window.confirm('Accept Cookie?') && "serviceWorker" in navigator && "PushManager" in window) {
            navigator.serviceWorker.register("/sw.js").then(() => window.location.reload()).catch((err) => {
                console.error("Service Worker registration failed:", err);
            }).finally(() => localStorage.setItem('is_cookie_allowed', true));
        }
    }
}, 1500);

export default bootstrap;