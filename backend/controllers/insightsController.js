const Product = require("../models/Product");
const Order = require("../models/Order");

// Saisonalité des produits
function getSeasonFactor(month, category) {
  if (month >= 6 && month <= 8) { // été
    if (category === "famille" || category === "terroir") return 1.2;
    return 1.1;
  }
  if (month === 12 || month === 1) { // fêtes + hiver
    if (category === "terroir") return 1.3;
    return 1.1;
  }
  if (month >= 3 && month <= 5) { // printemps
    if (category === "anti-gaspi") return 1.2;
    return 1.1;
  }
  if (month >= 9 && month <= 11) { // automne
    return 1.05;
  }
  return 1.0;
}

// Prévisions
async function forecasts(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // 1) Produits du producteur
    const myProducts = await Product.find({ producer: req.user.userId })
      .select("_id name category")
      .lean();

    if (myProducts.length === 0) {
      return res.json({
        historyRows: [],
        forecastRows: [],
        note: "Publiez au moins un produit pour obtenir des prévisions."
      });
    }

    const myProductIds = myProducts.map(p => p._id);

    // 2) Commandes qui contiennent un de ces produits
    const orders = await Order.find({ "items.product": { $in: myProductIds } })
      .select("createdAt items")
      .lean();

    if (orders.length === 0) {
      return res.json({
        historyRows: [],
        forecastRows: [],
        note: "Aucune commande contenant vos produits pour l’instant."
      });
    }

    // 3) Agrégation : productId -> monthKey -> qty
    const statsByProductMonth = new Map(); // key: productId(str) -> Map(monthKey -> qty)
    const monthsSet = new Set();

    for (const order of orders) {
      const d = new Date(order.createdAt);
      if (isNaN(d)) continue;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${y}-${m}`;
      monthsSet.add(monthKey);

      for (const it of (order.items || [])) {
        const pid = String(it.product);
        if (!myProductIds.some(x => String(x) === pid)) continue;

        if (!statsByProductMonth.has(pid)) statsByProductMonth.set(pid, new Map());
        const perMonth = statsByProductMonth.get(pid);
        perMonth.set(monthKey, (perMonth.get(monthKey) || 0) + Number(it.qty || 1));
      }
    }

    const allMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a)); // desc
    const lastMonths = allMonths.slice(0, 3);
    if (lastMonths.length === 0) {
      return res.json({ historyRows: [], forecastRows: [], note: "Pas assez de données." });
    }

    // 4) Next month label
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth === 13) { nextMonth = 1; nextYear += 1; }
    const nextMonthLabel = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;

    // 5) Construction des rows
    const productById = new Map(myProducts.map(p => [String(p._id), p]));

    const historyRows = [];
    const forecastRows = [];

    for (const pid of statsByProductMonth.keys()) {
      const prod = productById.get(pid);
      if (!prod) continue;

      const perMonth = statsByProductMonth.get(pid);
      let total = 0;
      for (const mk of lastMonths) total += (perMonth.get(mk) || 0);

      if (total === 0) continue;

      const avg = total / lastMonths.length;
      historyRows.push({
        productId: pid,
        name: prod.name,
        category: prod.category,
        period: `${lastMonths.slice().reverse().join(" à ")}`,
        total,
        avg
      });

      const factor = getSeasonFactor(nextMonth, prod.category);
      const forecast = avg * factor;

      let advice = "Stock normal.";
      if (factor > 1.2) advice = "Augmenter clairement les stocks (forte saison).";
      else if (factor > 1.05) advice = "Prévoir une légère hausse de la demande.";
      else if (factor < 1.0) advice = "Risque de baisse : limiter les surplus.";

      forecastRows.push({
        productId: pid,
        name: prod.name,
        category: prod.category,
        avg,
        factor,
        forecast,
        nextMonthLabel,
        advice
      });
    }

    return res.json({
      historyRows,
      forecastRows,
      note: "Prévisions simplifiées (moyenne 3 mois + saisonnalité)."
    });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Segmentation clients
async function segments(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const myProducts = await Product.find({ producer: req.user.userId })
      .select("_id category")
      .lean();

    if (myProducts.length === 0) {
      return res.json({ segments: [], note: "Publiez au moins un produit pour analyser vos clients." });
    }

    const myProductIds = myProducts.map(p => p._id);
    const prodCategoryById = new Map(myProducts.map(p => [String(p._id), p.category || "autre"]));

    const orders = await Order.find({ "items.product": { $in: myProductIds } })
      .select("user createdAt items")
      .populate("user", "name email")
      .lean();

    if (orders.length === 0) {
      return res.json({ segments: [], note: "Aucune commande pour l’instant." });
    }

    // statsByUser: userId -> stats
    const statsByUser = new Map();

    for (const order of orders) {
      const uid = String(order.user?._id || order.user);
      if (!uid) continue;

      // totalForProducer + categoriesCount
      let totalForProducer = 0;
      const localCats = {};

      for (const it of (order.items || [])) {
        const pid = String(it.product);
        if (!myProductIds.some(x => String(x) === pid)) continue;

        const lineTotal = Number(it.price || 0) * Number(it.qty || 1);
        totalForProducer += lineTotal;

        const cat = prodCategoryById.get(pid) || "autre";
        localCats[cat] = (localCats[cat] || 0) + Number(it.qty || 1);
      }

      if (totalForProducer <= 0) continue;

      const d = new Date(order.createdAt);
      if (isNaN(d)) continue;

      if (!statsByUser.has(uid)) {
        statsByUser.set(uid, {
          user: order.user ? { id: uid, name: order.user.name, email: order.user.email } : { id: uid },
          totalOrders: 0,
          totalSpent: 0,
          firstDate: d,
          lastDate: d,
          categoriesCount: {}
        });
      }

      const st = statsByUser.get(uid);
      st.totalOrders += 1;
      st.totalSpent += totalForProducer;
      if (d < st.firstDate) st.firstDate = d;
      if (d > st.lastDate) st.lastDate = d;

      for (const [cat, qty] of Object.entries(localCats)) {
        st.categoriesCount[cat] = (st.categoriesCount[cat] || 0) + qty;
      }
    }

    if (statsByUser.size === 0) {
      return res.json({ segments: [], note: "Pas assez de données pour segmenter." });
    }

    // Helpers segment
    function favCategory(categoriesCount) {
      let fav = "autre", max = 0;
      for (const [cat, qty] of Object.entries(categoriesCount || {})) {
        if (qty > max) { max = qty; fav = cat; }
      }
      return fav;
    }

    function getSegmentLabel(stats, favCat) {
      const avgBasket = stats.totalSpent / stats.totalOrders;

      let daysSpan = (stats.lastDate - stats.firstDate) / (1000 * 60 * 60 * 24);
      if (daysSpan < 1) daysSpan = 1;
      const frequency = stats.totalOrders / daysSpan;

      if (favCat === "etudiant" && avgBasket < 15 && stats.totalOrders >= 2) return "Étudiant budget serré";
      if (favCat === "famille" && avgBasket >= 25 && stats.totalOrders >= 3) return "Famille fidèle";
      if (favCat === "anti-gaspi" && stats.totalOrders >= 2) return "Chasseur d’anti-gaspi";
      if (favCat === "terroir" && avgBasket >= 25) return "Gourmet terroir";
      if (frequency > 0.1 && stats.totalOrders >= 3) return "Client régulier";
      return "Occasionnel";
    }

    function getSegmentAdvice(label) {
      switch (label) {
        case "Étudiant budget serré": return "Proposer des formats plus petits et des prix attractifs en semaine.";
        case "Famille fidèle": return "Mettre en avant des paniers familiaux et des abonnements hebdomadaires.";
        case "Chasseur d’anti-gaspi": return "Communiquer sur les offres de dernière minute et les paniers surprise.";
        case "Gourmet terroir": return "Valoriser vos produits premium, l’origine et les partenariats locaux.";
        case "Client régulier": return "Proposer des programmes de fidélité ou des avantages récurrents.";
        default: return "Encourager la réassurance (qualité, origine, avis clients) pour le faire revenir.";
      }
    }

    // Build segmentsMap
    const segmentsMap = new Map(); // label -> agg

    for (const st of statsByUser.values()) {
      const favCat = favCategory(st.categoriesCount);
      const label = getSegmentLabel(st, favCat);
      const avgBasket = st.totalSpent / st.totalOrders;
      const name = st.user?.name || st.user?.email || "Client GreenCart";

      if (!segmentsMap.has(label)) {
        segmentsMap.set(label, {
          label,
          usersCount: 0,
          avgBasketTotal: 0,
          avgBasketCount: 0,
          favCatCount: {},
          examples: [],
          advice: getSegmentAdvice(label)
        });
      }

      const seg = segmentsMap.get(label);
      seg.usersCount += 1;
      seg.avgBasketTotal += avgBasket;
      seg.avgBasketCount += 1;
      seg.favCatCount[favCat] = (seg.favCatCount[favCat] || 0) + 1;
      if (seg.examples.length < 3) seg.examples.push(name);
    }

    const segmentsResult = Array.from(segmentsMap.values()).map(seg => {
      let domCat = "—", max = 0;
      for (const [cat, nb] of Object.entries(seg.favCatCount)) {
        if (nb > max) { max = nb; domCat = cat; }
      }
      return {
        segment: seg.label,
        usersCount: seg.usersCount,
        avgBasket: seg.avgBasketTotal / seg.avgBasketCount,
        dominantCategory: domCat,
        examples: seg.examples,
        advice: seg.advice
      };
    });

    return res.json({ segments: segmentsResult, note: "Segmentation simplifiée basée sur vos ventes." });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

module.exports = { forecasts, segments };
