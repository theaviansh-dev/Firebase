export default async function initRecaptcha(component, auth, RecaptchaVerifier) {
    try {
        const container = document.getElementById("recaptcha-container");
        if (!container) throw new Error("recaptcha-container DOM element not found");
        component.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "normal",
            theme: "light",
            callback: () => {
                component.captchaVerified = true;
                component.status = "Starting App!";
                setTimeout(() => {
                    if (!component.user) { component.currentView = "auth"; } else { component.currentView = "dashboard"; }
                }, 1700);
            },
            "expired-callback": () => {
                component.captchaVerified = false;
                component.status = "Verification expired";
                setTimeout(() => window.location.reload(), 500);
            },
            "error-callback": (err) => {
                console.error("reCAPTCHA error:", err);
                component.captchaVerified = false;
                component.status = "Verification error";
            }
        });
        component.recaptchaWidgetId = await component.recaptchaVerifier.render();
    } catch (error) {
        console.error("Failed to initialize reCAPTCHA:", error);
        component.status = "Could not load CAPTCHA";
        component.currentView = "auth";
    }
}