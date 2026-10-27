const offlineCard = (perform) => {
    if (perform) {
        const style = document.createElement("style");
        style.textContent = `#offline-overlay{position:fixed;inset:0;width:100%;height:100vh;height:100dvh;z-index:10500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto;background-color:#fff;font-family:Arial,Helvetica,sans-serif}#offline-content{width:100%;max-width:450px;margin:auto;text-align:center;box-sizing:border-box}#offline-icon{width:clamp(64px, calc(3.5rem + 2vw), 100px);height:clamp(64px, calc(3.5rem + 2vw), 100px);margin:0 auto 16px;color:#dc2626}#offline-heading{margin:0 0 12px;color:#111827;font-size:clamp(32px, 5vw, 48px);font-weight:700;line-height:1.2}#offline-description{margin:0;padding:0 8px;color:#6b7280;font-size:clamp(16px, 2.5vw, 18px);font-weight:400;line-height:1.6}@media (max-height:400px){#offline-overlay{align-items:flex-start}}`;
        document.head.appendChild(style);
        const overlay = document.createElement("div");
        overlay.id = "offline-overlay";
        const content = document.createElement("div");
        content.id = "offline-content";
        const icon = document.createElement("div");
        icon.id = "offline-icon";
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path d="M2 2l20 20"/></svg>`;
        const heading = document.createElement("h1");
        heading.id = "offline-heading";
        heading.textContent = "No Internet";
        const description = document.createElement("p");
        description.id = "offline-description";
        description.textContent = "Please check your network connection and try again.";
        content.appendChild(icon);
        content.appendChild(heading);
        content.appendChild(description);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    } else {
        document.getElementById("offline-overlay")?.remove();
    }
    return;
}

export default offlineCard;