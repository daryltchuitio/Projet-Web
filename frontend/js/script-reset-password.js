  document.addEventListener("DOMContentLoaded", () => {
            const API_BASE = window.APP_CONFIG.API_BASE;
            const form = document.getElementById("reset-password-form");
            const messageEl = document.getElementById("reset-message");

            function getTokenFromUrl() {
                const params = new URLSearchParams(window.location.search);
                return params.get("token");
            }

            form?.addEventListener("submit", async (e) => {
                e.preventDefault();
                messageEl.textContent = "";
                messageEl.className = "form-note auth-message";

                const token = getTokenFromUrl();
                const password = document.getElementById("reset-password").value;
                const passwordConfirm = document.getElementById("reset-password-confirm").value;

                if (!token) {
                    messageEl.textContent = "Lien invalide ou incomplet.";
                    messageEl.classList.add("auth-error");
                    return;
                }

                if (password !== passwordConfirm) {
                    messageEl.textContent = "Les mots de passe ne correspondent pas.";
                    messageEl.classList.add("auth-error");
                    return;
                }

                if (password.length < 6) {
                    messageEl.textContent = "Le mot de passe doit contenir au moins 6 caractères.";
                    messageEl.classList.add("auth-error");
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE}/api/password/reset`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ token, password })
                    });

                    const data = await res.json().catch(() => ({}));

                    if (!res.ok) {
                        messageEl.textContent = data.message || "Impossible de réinitialiser le mot de passe.";
                        messageEl.classList.add("auth-error");
                        return;
                    }

                    messageEl.textContent = "Votre mot de passe a bien été réinitialisé. Vous pouvez maintenant vous connecter.";
                    messageEl.classList.add("auth-success");

                    await AppMessages.alert(
                        "Votre mot de passe a bien été mis à jour.",
                        {
                            title: "Mot de passe réinitialisé",
                            confirmText: "Se connecter"
                        }
                    );

                    window.location.href = "connexion.html";
                } catch (err) {
                    messageEl.textContent = "Erreur serveur.";
                    messageEl.classList.add("auth-error");
                }
            });
        });