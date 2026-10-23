export const boot = async () => {
    const { default: Alpine } = await import("https://cdn.jsdelivr.net/npm/alpinejs@3.15.0/dist/module.esm.js");
    const { default: persist } = await import("https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.15.0/dist/module.esm.js");
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js");
    const { getAuth, RecaptchaVerifier, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js");
    const { config: firebaseConfig, COLLECTION: collectionName } = await import("./key.js");
    const { default: offlineCard } = await import("./offlineCard.js");
    const { default: bootstrap } = await import('./bootstrap.js');

    Alpine.plugin(persist);
    var app = initializeApp(firebaseConfig);
    var auth = getAuth(app);

    document.addEventListener("alpine:init", () => {
        Alpine.data("boot", () => ({

            // View initiators
            viewOne: Alpine.$persist(true).as("viewOne"),       // CAPTCHA verification
            viewTwo: Alpine.$persist(false).as("viewTwo"),      // Authentication
            viewThree: Alpine.$persist(false).as("viewThree"),    // Main UI

            //for captcha
            verified: false,
            status: "",
            recaptchaVerifier: null,
            recaptchaWidgetId: null,

            //for auth
            isSignUp: false,
            loading: true,
            email: '',
            password: '',
            errorMessage: '',
            user: null,
            unsubscribeAuth: null,

            //global init
            async init() {

                //for auth
                this.unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
                    this.user = firebaseUser;
                    this.loading = false;
                    if (firebaseUser) {
                        this.clearForm();
                        this.viewTwo = this.viewOne = false;
                        this.viewThree = true;
                    }
                });

                this.$nextTick(async () => {

                    //for title
                    if (this.viewOne) { document.title = "Human Varification" }
                    if (this.viewTwo) { document.title = "Authentication" }
                    if (this.viewThree) { document.title = "FireStore" }
                    this.$watch(() => [this.viewOne, this.viewTwo, this.viewThree], () => {
                        if (this.viewOne) { document.title = "Human Varification" }
                        if (this.viewTwo) { document.title = "Authentication" }
                        if (this.viewThree) { document.title = "FireStore" }
                    });

                    //for captcha
                    if (this.viewOne) {
                        try {
                            const container = document.getElementById("recaptcha-container");
                            if (!container) { throw new Error("recaptcha-container DOM element not found"); }
                            this.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
                                size: "normal",
                                theme: "light",
                                callback: (response) => {
                                    this.verified = true;
                                    this.status = "Starting App!";
                                    setTimeout(() => { this.viewOne = false; this.viewTwo = true; document.title = "Authentication"; }, 1700);
                                },
                                "expired-callback": () => {
                                    this.verified = false;
                                    this.status = "Verification expired";
                                    setTimeout(() => window.location.reload(), 500);
                                },
                                "error-callback": (err) => {
                                    console.error("reCAPTCHA error:", err);
                                    this.verified = false;
                                    this.status = "Verification error";
                                }
                            });
                            this.recaptchaWidgetId = await this.recaptchaVerifier.render();
                        } catch (error) {
                            console.error("Failed to initialize reCAPTCHA:", error);
                            this.status = "Could not load CAPTCHA";
                        }
                    }

                });
            },

            //////////////////    for auth      /////////////////
            async handleSubmit() {
                this.loading = true;
                this.errorMessage = '';
                try {
                    if (this.isSignUp) {
                        await createUserWithEmailAndPassword(auth, this.email, this.password);
                    } else {
                        await signInWithEmailAndPassword(auth, this.email, this.password);
                    }
                } catch (error) {
                    this.errorMessage = this.formatError(error.code);
                    this.loading = false;
                }
            },
            async logout() {
                this.loading = true;
                try {
                    await signOut(auth);
                    this.viewOne = this.viewThree = false;
                    this.viewTwo = true;
                } catch (error) {
                    this.errorMessage = "Error signing out.";
                    this.loading = false;
                }
            },
            clearForm() {
                this.email = '';
                this.password = '';
                this.errorMessage = '';
            },
            test() {
                if (this.email && this.password) {
                    this.clearForm();
                } else {
                    this.email = "example@go.com";
                    this.password = "123allsmall";
                }
            },
            formatError(code) {
                switch (code) {
                    case 'auth/invalid-credential': return 'Invalid email or password match.';
                    case 'auth/email-already-in-use': return 'This email profile is already taken.';
                    case 'auth/weak-password': return 'Password should be at least 6 characters.';
                    case 'auth/invalid-email': return 'Please enter a valid email structure.';
                    default: return code.replace('auth/', '').replace(/-/g, ' ');
                }
            },
            //////////////////    for auth      /////////////////

            destroy() {
                if (this.unsubscribeAuth) {
                    this.unsubscribeAuth();
                    this.unsubscribeAuth = null;
                }

                if (this.recaptchaVerifier) {
                    this.recaptchaVerifier.clear();
                    this.recaptchaVerifier = null;
                }
            }
        }));
    });

    window.Alpine = Alpine;
    Alpine.start();

    //check for internet
    window.addEventListener("offline", () => {
        offlineCard();
    });
    window.addEventListener("online", () => {
        setTimeout(() => document.getElementById("offline-overlay")?.remove(), 500);
    });

    // Register service worker
    bootstrap();
};