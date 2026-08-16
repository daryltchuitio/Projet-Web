document.addEventListener("DOMContentLoaded", () => {
    const CURRENT_USER_KEY = "greencart_current_user";
    const TOKEN_KEY = "greencart_token";

    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (!payload.exp) return true;
            return Date.now() >= payload.exp * 1000;
        } catch {
            return true;
        }
    }

    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (!userStr || !token || isTokenExpired(token)) {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        return;
    }

    try {
        const user = JSON.parse(userStr);

        if (user.role === "producer") {
            window.location.href = "dashboard-producteur.html";
            return;
        }

        if (user.role === "consumer") {
            window.location.href = "dashboard-consommateur.html";
            return;
        }
    } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
    }
});

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = window.APP_CONFIG.API_BASE;
    const CURRENT_USER_KEY = "greencart_current_user";
    const TOKEN_KEY = "greencart_token";

    function setCurrentUser(user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    async function requestPasswordReset(email) {
        const res = await fetch(`${API_BASE}/api/password/forgot`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "Impossible d'envoyer l'e-mail de réinitialisation."
            );
        }

        return data;
    }

    function redirectByRole(role) {
        if (role === "producer") {
            window.location.href = "dashboard-producteur.html";
        } else {
            window.location.href = "dashboard-consommateur.html";
        }
    }

    const forgotPasswordLink = document.getElementById("forgot-password-link");

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", async (e) => {
            e.preventDefault();

            const email = await AppMessages.prompt(
                "Renseignez l'adresse e-mail de votre compte pour recevoir un lien de réinitialisation.",
                {
                    title: "Mot de passe oublié",
                    placeholder: "vous@example.com",
                    confirmText: "Envoyer",
                    cancelText: "Annuler"
                }
            );

            if (email === null) return;

            const cleanEmail = email.trim().toLowerCase();

            if (!cleanEmail) {
                await AppMessages.alert("Veuillez renseigner une adresse e-mail.", {
                    title: "Adresse e-mail requise",
                    confirmText: "Fermer",
                    variant: "danger"
                });
                return;
            }

            try {
                const data = await requestPasswordReset(cleanEmail);

                await AppMessages.alert(
                    data.message || "Si cette adresse existe, un e-mail de réinitialisation a été envoyé.",
                    {
                        title: "E-mail envoyé",
                        confirmText: "Continuer"
                    }
                );
            } catch (err) {
                await AppMessages.alert(
                    err.message || "Erreur lors de l'envoi de l'e-mail.",
                    {
                        title: "Erreur",
                        confirmText: "Fermer",
                        variant: "danger"
                    }
                );
            }
        });
    }

    const registerForm = document.getElementById("register-form");
    const registerMessage = document.getElementById("register-message");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            registerMessage.textContent = "";

            const name = document.getElementById("register-name").value.trim();
            const email = document.getElementById("register-email").value.trim().toLowerCase();
            const password = document.getElementById("register-password").value;
            const passwordConfirm = document.getElementById("register-password-confirm").value;
            const roleFront = document.getElementById("register-role").value;

            if (password !== passwordConfirm) {
                registerMessage.textContent = "Les mots de passe ne correspondent pas.";
                registerMessage.classList.add("auth-error");
                return;
            }

            const role = roleFront === "producteur" ? "producer" : "consumer";

            try {
                const res = await fetch(`${API_BASE}/api/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ name, email, password, role })
                });

                const data = await res.json();

                if (!res.ok) {
                    registerMessage.textContent = data.message || "Erreur lors de l'inscription.";
                    registerMessage.classList.add("auth-error");
                    return;
                }

                registerMessage.textContent = "Compte créé avec succès. Vous pouvez vous connecter.";
                registerMessage.classList.add("auth-success");
                registerForm.reset();
                setTimeout(() => {
                    registerMessage.textContent = "";
                    registerMessage.classList.remove("auth-success");
                }, 10000);

            } catch (err) {
                registerMessage.textContent = "Erreur serveur.";
                registerMessage.classList.add("auth-error");
            }
        });
    }

    const loginForm = document.getElementById("login-form");
    const loginMessage = document.getElementById("login-message");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            loginMessage.textContent = "";

            const email = document.getElementById("login-email").value.trim().toLowerCase();
            const password = document.getElementById("login-password").value;

            try {
                const res = await fetch(`${API_BASE}/api/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    loginMessage.textContent = data.message || "Identifiants incorrects.";
                    loginMessage.classList.add("auth-error");
                    return;
                }

                setToken(data.token);

                setCurrentUser({
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role
                });

                loginMessage.textContent = "Connexion réussie. Redirection...";
                loginMessage.classList.add("auth-success");

                setTimeout(() => {
                    redirectByRole(data.user.role);
                }, 800);

            } catch (err) {
                loginMessage.textContent = "Erreur serveur.";
                loginMessage.classList.add("auth-error");
            }
        });
    }
});
