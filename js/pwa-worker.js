export default function pwaWorker() {
    window.addEventListener('appinstalled', () => {
        localStorage.setItem("is_cookie_allowed", true);
        window.location.reload();
    });
}