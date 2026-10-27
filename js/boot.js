export const boot = async () => {
    const [{default:Alpine},{default:persist},{initializeApp:initializeApp},{getAuth:getAuth,RecaptchaVerifier:RecaptchaVerifier,GoogleAuthProvider:GoogleAuthProvider,signInWithPopup:signInWithPopup,createUserWithEmailAndPassword:createUserWithEmailAndPassword,signInWithEmailAndPassword:signInWithEmailAndPassword,signOut:signOut,onAuthStateChanged:onAuthStateChanged},{bridge:firebaseConfig,COLLECTION:collectionName},{default:initRecaptcha}] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/alpinejs@3.15.0/dist/module.esm.js"),
        import("https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.15.0/dist/module.esm.js"),
        import("https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js"),
        import("./bridge.js"), import("./initRecaptcha.js"),
    ]);

    Alpine.plugin(persist);
    const app = initializeApp(JSON.parse(atob(firebaseConfig)));
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    const VIEW_TITLES = { verification: "Human Verification", auth: "Authentication", dashboard: "FireStore" };

    document.addEventListener("alpine:init", () => {
        Alpine.data("boot", () => ({
            currentView: Alpine.$persist("verification").as("currentView"),

            // reCAPTCHA state
            captchaRequest: Alpine.$persist(Date.now()).as("captchaRequest"),
            captchaVerified: Alpine.$persist(false).as("captchaVerified"),
            status: "",
            recaptchaVerifier: null,
            recaptchaWidgetId: null,

            // Auth state
            isSignUp: false,
            loading: true,
            email: '',
            password: '',
            errorMessage: '',
            user: null,
            unsubscribeAuth: null,

            async init() {
                if (this.captchaVerified && (Date.now() - this.captchaRequest) >= 86400000) {
                    this.captchaVerified = false;
                    this.currentView = "verification";
                }

                this.$watch('currentView', (view) => {
                    document.title = VIEW_TITLES[view] || "FireBase";
                });
                document.title = VIEW_TITLES[this.currentView] || "FireBase";

                this.unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
                    this.user = firebaseUser;
                    this.loading = false;
                    if (firebaseUser) {
                        this.clearForm();
                        this.currentView = "dashboard";
                    }
                });

                this.$nextTick(async () => {
                    if (this.currentView === "verification") {
                        await initRecaptcha(this, auth, RecaptchaVerifier);
                    }
                });
            },

            async popupsignin() {
                this.loading = true;
                this.errorMessage = '';
                try {
                    await signInWithPopup(auth, provider);
                } catch (err) {
                    this.errorMessage = this.formatError(err.code);
                } finally {
                    this.loading = false;
                }
            },

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
                } finally {
                    this.loading = false;
                }
            },

            async logout() {
                this.loading = true;
                try {
                    await signOut(auth);
                    this.user = null;
                    this.currentView = "auth";
                } catch (error) {
                    this.errorMessage = "Error signing out.";
                } finally {
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
                    case 'auth/popup-closed-by-user': return 'Popup closed by user.';
                    default: return code.replace('auth/', '').replace(/-/g, ' ');
                }
            },

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
};