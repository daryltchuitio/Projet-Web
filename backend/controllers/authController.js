const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Product = require("../models/Product");
const Review = require("../models/Review");
const Order = require("../models/Order");
const { mailTransporter, MAIL_USER, APP_BASE_URL } = require("../config/mailer");

//  REGISTER sécurisé (hash password)
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    // validations simples
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password sont obligatoires" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères" });
    }

    // email déjà utilisé ?
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // create user
    const safeRole = role === "producer" ? "producer" : "consumer";
    const user = await User.create({ name, email, passwordHash, role: safeRole });

    return res.status(201).json({
      message: "Utilisateur créé !",
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// LOGIN avec JWT
async function login(req, res) {
  console.log("➡️ /api/login appelé");
  try {
    const { email, password } = req.body;

    // vérifier champs
    if (!email || !password) {
      return res.status(400).json({ message: "Email et password requis" });
    }

    // trouver user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    // comparer password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    // générer token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login réussi",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// Route protégée : infos utilisateur connecté
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// Demande de réinitialisation du mot de passe
async function forgotPassword(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Adresse e-mail requise." });
    }

    const user = await User.findOne({ email });

    // Message volontairement générique pour éviter d’indiquer si le compte existe
    if (!user) {
      return res.json({
        message: "Si cette adresse existe, un e-mail de réinitialisation a été envoyé."
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expires;
    await user.save();

    const resetLink = `${APP_BASE_URL}/reset-password.html?token=${rawToken}`;

    await mailTransporter.sendMail({
      from: `"GreenCart" <${MAIL_USER}>`,
      to: user.email,
      subject: "Réinitialisation de votre mot de passe GreenCart",
      html: `
        <p>Bonjour ${user.name || ""},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe GreenCart.</p>
        <p>
          Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :
        </p>
        <p>
          <a href="${resetLink}">${resetLink}</a>
        </p>
        <p>Ce lien expire dans 30 minutes.</p>
        <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.</p>
      `
    });

    return res.json({
      message: "Si cette adresse existe, un e-mail de réinitialisation a été envoyé."
    });
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

// Réinitialisation effective du mot de passe
async function resetPassword(req, res) {
  try {
    const rawToken = String(req.body.token || "");
    const password = String(req.body.password || "");

    if (!rawToken || !password) {
      return res.status(400).json({ message: "Token et mot de passe requis." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères." });
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Lien invalide ou expiré." });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

// Supprimer le compte connecté
async function deleteMe(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    // PRODUCTEUR : suppression autorisée uniquement si toutes les commandes sont terminées
    if (role === "producer") {
      const myProducts = await Product.find({ producer: userId }).select("_id");
      const myProductIds = myProducts.map(p => p._id);

      if (myProductIds.length > 0) {
        const hasActiveOrders = await Order.exists({
          "items.product": { $in: myProductIds },
          status: { $ne: "terminee" }
        });

        if (hasActiveOrders) {
          return res.status(409).json({
            message: "Vous devez d’abord terminer toutes vos commandes avant de supprimer votre compte."
          });
        }

        // Les produits disparaissent du catalogue
        await Product.updateMany(
          { producer: userId },
          { $set: { isActive: false } }
        );

        // Supprimer les avis liés à ses produits
        await Review.deleteMany({ product: { $in: myProductIds } });
      }
    }

    // CONSOMMATEUR : on peut supprimer le compte directement
    // Supprimer ses avis pour éviter les avis orphelins
    if (role === "consumer") {
      await Review.deleteMany({ user: userId });
    }

    await User.findByIdAndDelete(userId);

    return res.json({
      message: role === "producer"
        ? "Compte producteur supprimé. Vos produits ont été retirés du catalogue."
        : "Compte consommateur supprimé."
    });
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

module.exports = { register, login, getMe, forgotPassword, resetPassword, deleteMe };
