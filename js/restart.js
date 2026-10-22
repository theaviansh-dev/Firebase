import { boot } from "./boot.js";

export const restart = () => {
    if (navigator.onLine) {
        boot();
    } else {
        setTimeout(() => {
            const heading = document.createElement("h2");
            heading.id = "offline-message";
            heading.textContent = "Please check your internet connection.";
            document.body.appendChild(heading);
        }, 500);

        window.addEventListener("online", () => {
            setTimeout(() => window.location.reload(), 2000);
        });
    }
};