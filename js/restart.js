import { boot } from "./boot.js";
import offlineCard from "./offlineCard.js";

export const restart = () => {
    if (navigator.onLine) {
        boot();
    } else {
        offlineCard();
        window.addEventListener("online", () => {
            setTimeout(() => window.location.reload(), 2000);
        });
    }
};