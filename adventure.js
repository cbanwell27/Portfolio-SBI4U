(() => {
  const SAVE_KEY = "biology-quest-save-v1";
  const freshSave = () => ({
    version: 1,
    xp: 0,
    completed: [],
    badges: [],
    unlocked: ["unite1.html"],
  });
  let storageAvailable = true;
  let save = freshSave();

  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed?.version !== 1 ||
        !Number.isFinite(parsed.xp) ||
        !Array.isArray(parsed.completed) ||
        !Array.isArray(parsed.badges) ||
        !Array.isArray(parsed.unlocked)
      ) {
        throw new Error("Format de sauvegarde de la Quête du vivant non reconnu.");
      }
      save = parsed;
    }
  } catch (error) {
    storageAvailable = false;
    console.error("La sauvegarde locale de Quête du vivant est indisponible.", error);
  }

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isHome = page === "index.html";
  const isUnit1 = page === "unite1.html";
  const isUnit2 = page === "unite2.html";
  const isArticles = page === "articles.html";
  const isUnit2Locked = isUnit2 && !save.unlocked.includes("unite2.html");
  const body = document.body;
  const main = document.querySelector("main#contenu");
  const top = document.querySelector("header.top");
  if (isUnit2Locked && main) {
    main.innerHTML = `<div class="breadcrumbs"><a href="index.html">Accueil</a> › Portail verrouillé</div><section class="hero unit-head"><div class="unit-kicker">Portail verrouillé</div><h1>Le laboratoire de l’énergie</h1><p>Cette région se dévoilera après la mission finale du monde de biochimie cellulaire.</p><p><a class="btn" href="index.html#unites">Retourner à la carte →</a></p></section>`;
  }
  const hero = main?.querySelector(".hero");
  const guideLines = {
    home: "La vie est pleine de passages secrets. Choisis un monde et suis les indices; je t’accompagne.",
    unit1: "Ici, une forme moléculaire peut tout changer. Observe les pièces avant d’agir.",
    unit2: "Suivons l’énergie : chaque transfert a un coût, une direction et une conséquence.",
    archive: "Les archives gardent les découvertes, les carrières et les traces de l’expédition.",
  };
  let guideText = isHome
    ? guideLines.home
    : isUnit1
      ? guideLines.unit1
      : isUnit2
        ? guideLines.unit2
        : isArticles
          ? "Deux chercheurs, deux mondes : suivons les indices qui relient les enzymes et la photosynthèse à la vie cellulaire."
          : guideLines.archive;
  let guideMood = "curious";

  body.classList.add("adventure-site");
  body.classList.add(
    isHome ? "world-home" : isUnit1 ? "world-cell" : isUnit2 ? "world-energy" : "world-archive",
  );

  function persist() {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      return true;
    } catch (error) {
      storageAvailable = false;
      console.error("Impossible d’enregistrer la progression de Quête du vivant.", error);
      updateHud();
      return false;
    }
  }

  function knownBadge(id) {
    return {
      molecule: { icon: "◈", label: "Éclaireuse moléculaire" },
      cell: { icon: "✦", label: "Gardienne de la cellule" },
      energy: { icon: "⚡", label: "Maîtresse de l’énergie" },
      menten: { icon: "◉", label: "Éclaireuse enzymatique" },
      huner: { icon: "↗", label: "Gardienne de la photostase" },
    }[id];
  }

  function setupResponsiveNavigation() {
    const nav = top?.querySelector('nav[aria-label="Navigation principale"]');
    const brand = nav?.querySelector(".brand");
    if (!nav || !brand) return;

    const menuButton = document.createElement("button");
    menuButton.className = "nav-menu-toggle";
    menuButton.type = "button";
    menuButton.textContent = "Menu";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "nav-links");
    menuButton.setAttribute("aria-label", "Ouvrir la navigation");

    const links = document.createElement("div");
    links.className = "nav-links";
    links.id = "nav-links";
    nav.querySelectorAll(".navbtn").forEach((link) => links.append(link));
    nav.append(menuButton, links);

    menuButton.addEventListener("click", () => {
      const expanded = menuButton.getAttribute("aria-expanded") !== "true";
      nav.classList.toggle("is-open", expanded);
      menuButton.setAttribute("aria-expanded", String(expanded));
      menuButton.setAttribute("aria-label", expanded ? "Fermer la navigation" : "Ouvrir la navigation");
      menuButton.textContent = expanded ? "Fermer" : "Menu";
    });
    links.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Ouvrir la navigation");
        menuButton.textContent = "Menu";
      }
    });
  }

  function updateHud() {
    if (!top) return;
    let hud = top.querySelector(".adventure-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.className = "adventure-hud";
      hud.setAttribute("aria-label", "Progression de l’aventure");
      top.append(hud);
    }
    const level = Math.floor(save.xp / 100) + 1;
    const withinLevel = save.xp % 100;
    const badgeMarkup = ["molecule", "cell", "energy", "menten", "huner"]
      .map((id) => {
        const badge = knownBadge(id);
        const earned = save.badges.includes(id);
        return `<span class="hud-badge" aria-label="${badge.label} — ${earned ? "obtenu" : "verrouillé"}" title="${badge.label}">${earned ? badge.icon : "·"}</span>`;
      })
      .join("");
    hud.innerHTML = `<div class="hud-xp"><span>Niv. ${level} · ${save.xp} XP</span><progress max="100" value="${withinLevel}" aria-label="Progression vers le prochain niveau"></progress></div><div class="hud-badges" aria-label="Insignes">${badgeMarkup}</div>${storageAvailable ? "" : '<span role="status">Sauvegarde locale indisponible</span>'}`;
  }

  function setGuide(text, mood = "curious", showDialogue = true) {
    guideText = text;
    guideMood = mood;
    const dialogue = document.querySelector(".rho-dialogue");
    const companion = document.querySelector(".rho-companion");
    const avatar = document.querySelector(".rho-toggle img");
    const button = document.querySelector(".rho-toggle");
    if (dialogue) {
      const message = dialogue.querySelector("[data-rho-message]");
      if (message) message.textContent = guideText;
      if (showDialogue) {
        dialogue.hidden = false;
        companion?.classList.add("is-speaking");
      }
    }
    if (button && showDialogue) button.setAttribute("aria-expanded", "true");
    if (avatar) avatar.dataset.mood = guideMood;
  }

  function award(id, points, badgeId) {
    if (save.completed.includes(id)) {
      setGuide("Cette découverte est déjà inscrite dans ton carnet. Choisis un autre défi!", "happy");
      return false;
    }
    save.completed.push(id);
    save.xp += points;
    if (badgeId && !save.badges.includes(badgeId)) save.badges.push(badgeId);
    if (id === "mission-u1" && !save.unlocked.includes("unite2.html")) {
      save.unlocked.push("unite2.html");
    }
    persist();
    updateHud();
    refreshPortals();
    return true;
  }

  function createGuide() {
    const companion = document.createElement("aside");
    companion.className = "rho-companion";
    companion.setAttribute("aria-label", "Rho, ton guide");
    companion.innerHTML = `<div class="rho-dialogue" id="rho-dialogue" role="status" hidden><span class="rho-name">Rho</span><span data-rho-message></span></div><button class="rho-toggle" type="button" aria-expanded="false" aria-controls="rho-dialogue" aria-label="Parler à Rho"><img src="assets/rho-guide.png" alt="Rho, le rhinocéros éclaireur"/></button>`;
    (top || document.body).append(companion);
    const button = companion.querySelector(".rho-toggle");
    const dialogue = companion.querySelector(".rho-dialogue");
    button?.addEventListener("click", () => {
      const opening = dialogue?.hidden ?? false;
      if (dialogue) dialogue.hidden = !dialogue.hidden;
      companion.classList.toggle("is-speaking", opening);
      button?.setAttribute("aria-expanded", String(opening));
      if (opening) setGuide(guideText, guideMood);
    });
    setGuide(guideText, guideMood, false);
  }

  function decorateGuideNotes() {
    document.querySelectorAll(".rho-note").forEach((note) => {
      const speaker = note.querySelector(":scope > strong");
      if (
        !speaker ||
        speaker.textContent.trim().replace(/[:\s]/g, "") !== "Rho" ||
        note.querySelector(".rho-note-avatar")
      ) {
        return;
      }

      const message = document.createElement("span");
      message.className = "rho-note-message";
      while (speaker.nextSibling) message.append(speaker.nextSibling);

      const avatar = document.createElement("img");
      avatar.className = "rho-note-avatar";
      avatar.src = "assets/rho-guide.png";
      avatar.alt = "";
      avatar.setAttribute("aria-hidden", "true");

      speaker.className = "rho-note-speaker";
      note.classList.add("rho-speaking");
      note.replaceChildren(avatar, speaker, message);
    });
  }

  function createWaypoint(label, target) {
    const link = document.createElement("a");
    link.className = "waypoint";
    link.href = target;
    link.textContent = label;
    return link;
  }

  function createScene() {
    if (!hero || !main) return;
    hero.classList.add("quest-scene");
    const copy = document.createElement("div");
    copy.className = "quest-copy";
    while (hero.firstChild) copy.append(hero.firstChild);
    hero.append(copy);

    const kicker = copy.querySelector(".eyebrow, .unit-kicker");
    if (kicker && !isUnit2Locked) {
      kicker.classList.add("quest-kicker");
      kicker.textContent = isHome
        ? "Quête du vivant · Expédition scientifique"
        : isUnit1
          ? "Monde 01 · La cellule vivante"
          : isUnit2
            ? "Monde 02 · Le laboratoire de l’énergie"
            : "Carnet d’exploration · SBI4U";
    }

    const title = copy.querySelector("h1");
    if (title && isHome) title.textContent = "À la découverte du vivant";

    const description = copy.querySelector("p");
    if (description && isHome) {
      description.textContent =
        "Des mondes mystérieux, des expériences à mener et des énigmes scientifiques à résoudre. Rho t’attend au campement.";
      const entry = copy.querySelector(".btn");
      if (entry) {
        entry.href = "#unites";
        entry.textContent = "Entrer dans l’aventure →";
      }
      copy.querySelector(".navbtn")?.remove();
    } else if ((isUnit1 || isUnit2) && !isUnit2Locked) {
      const story = copy.querySelectorAll("p")[1];
      if (story) {
        story.textContent = isUnit1
          ? "Explore le paysage microscopique, décode les biomolécules et découvre comment la structure guide la fonction."
          : "Traverse les voies énergétiques, suis le trajet du carbone et découvre comment les cellules transfèrent l’énergie.";
      }
    }
    if (isUnit2Locked) copy.querySelector(".btn")?.closest("p")?.remove();

    const actions = document.createElement("div");
    actions.className = "quest-actions";
    const start = document.createElement("a");
    start.className = "quest-action";
    start.href = isHome
      ? "#unites"
      : isUnit2Locked
        ? "index.html#unites"
        : isUnit1 || isUnit2
          ? "#mission-finale"
          : page === "articles.html"
            ? "#article"
            : page === "carrieres.html"
              ? "#carriere"
              : page === "bibliographie.html"
                ? "#sources"
                : "#contenu";
    start.textContent = isHome
      ? "Choisir un monde →"
      : isUnit2Locked
        ? "Retourner à la carte →"
        : isUnit1 || isUnit2
          ? "Rejoindre la mission →"
          : "Explorer les archives →";
    actions.append(start);
    if ((isUnit1 || isUnit2) && !isUnit2Locked) {
      const hint = document.createElement("button");
      hint.className = "quest-action secondary";
      hint.type = "button";
      hint.dataset.rhoHint = "true";
      hint.textContent = "Indice de Rho";
      actions.append(hint);
    }
    if (!isHome) copy.append(actions);

    const guide = document.createElement("div");
    guide.className = "scene-guide";
    guide.innerHTML = `<img src="assets/rho-guide.png" alt="Rho, rhinocéros explorateur de Quête du vivant"/><div class="guide-caption"><strong>Rho :</strong> ${isHome ? "Chaque monde cache une énigme. On part?" : isUnit1 ? "Regarde la structure avant de chercher sa fonction." : isUnit2 ? "Suis les électrons : ils racontent le trajet de l’énergie." : "Une bonne enquête commence par une question précise."}</div>`;
    hero.append(guide);

    if (isUnit1 || isUnit2) {
      const waypoints = document.createElement("nav");
      waypoints.className = "world-waypoints";
      waypoints.setAttribute("aria-label", "Lieux à explorer");
      const stops = isUnit1
        ? [
            ["Molécules", "#lesson-1-2"],
            ["Enzymes", "#lesson-1-3"],
            ["Membranes", "#lesson-2-2"],
            ["Carte vivante", "#carte"],
          ]
        : [
            ["Respiration", "#lesson-3-2"],
            ["Fermentation", "#lesson-3-3"],
            ["Photosystèmes", "#lesson-4-1"],
            ["Calvin", "#lesson-4-2"],
          ];
      stops.forEach(([label, target]) => waypoints.append(createWaypoint(label, target)));
      hero.append(waypoints);
      const unitMenu = copy.querySelector(".unit-menu");
      if (unitMenu) {
        unitMenu.classList.add("world-waypoints", "codex-menu");
        unitMenu.setAttribute("role", "navigation");
        unitMenu.setAttribute("aria-label", "Lieux et archives du monde");
        hero.after(unitMenu);
      }
    }
  }

  function refreshPortals() {
    const gate = document.querySelector('#unites a[href="unite2.html"]');
    if (!gate) return;
    const unlocked = save.unlocked.includes("unite2.html");
    gate.classList.toggle("is-locked", !unlocked);
    gate.setAttribute("aria-disabled", String(!unlocked));
    const action = gate.querySelector(".btn");
    if (action) action.textContent = unlocked ? "Explorer le monde →" : "Épreuve du monde 1 requise";
  }

  function createMission() {
    if (!main || (!isUnit1 && !isUnit2) || isUnit2Locked) return;
    const mission = document.createElement("section");
    mission.id = "mission-finale";
    mission.className = "mission-board";
    mission.setAttribute("aria-labelledby", "mission-title");
    if (isUnit1) {
      mission.innerHTML = `<p class="quest-kicker">Mission finale · Monde 01</p><h2 id="mission-title">Sauver la cellule</h2><p>Une enzyme ne fonctionne presque plus et plusieurs réactions ralentissent. Les indices montrent que le pH du milieu s’est éloigné de son optimum. Choisis une intervention et justifie ton raisonnement.</p><form data-mission-form="u1"><fieldset><legend>Quelle action aide d’abord à rétablir la fonction enzymatique?</legend><label class="mission-option"><input type="radio" name="solution" value="substrate" required/>Ajouter beaucoup plus de substrat sans changer le milieu.</label><label class="mission-option"><input type="radio" name="solution" value="buffer"/>Rétablir un pH compatible avec l’enzyme, puis comparer l’activité en gardant les autres variables constantes.</label><label class="mission-option"><input type="radio" name="solution" value="heat"/>Chauffer fortement le milieu pour fournir directement l’énergie d’activation.</label></fieldset><fieldset><legend>Quel mécanisme appuie ce choix?</legend><label class="mission-option"><input type="radio" name="reason" value="active-site" required/>Un pH extrême peut modifier les charges et la forme du site actif.</label><label class="mission-option"><input type="radio" name="reason" value="energy"/>Le pH fournit directement l’énergie nécessaire à toutes les réactions.</label></fieldset><button class="mission-submit" type="submit">Valider la mission</button><p class="mission-feedback" role="status" aria-live="polite"></p></form>`;
    } else {
      mission.innerHTML = `<p class="quest-kicker">Mission finale · Monde 02</p><h2 id="mission-title">Restaurer l’énergie</h2><p>Une cellule doit remettre sa production d’ATP en marche. Replace les étapes de la respiration aérobie, puis choisis ce que la fermentation apporte lorsque l’oxygène manque.</p><form data-mission-form="u2"><fieldset><legend>Ordonne les étapes de la respiration aérobie</legend><label>Étape 1 <select name="stage1" required><option value="">Choisir…</option><option value="glycolysis">Glycolyse</option><option value="pyruvate">Oxydation du pyruvate</option><option value="krebs">Cycle de Krebs</option><option value="chain">Chaîne de transport d’électrons</option></select></label><label>Étape 2 <select name="stage2" required><option value="">Choisir…</option><option value="glycolysis">Glycolyse</option><option value="pyruvate">Oxydation du pyruvate</option><option value="krebs">Cycle de Krebs</option><option value="chain">Chaîne de transport d’électrons</option></select></label><label>Étape 3 <select name="stage3" required><option value="">Choisir…</option><option value="glycolysis">Glycolyse</option><option value="pyruvate">Oxydation du pyruvate</option><option value="krebs">Cycle de Krebs</option><option value="chain">Chaîne de transport d’électrons</option></select></label><label>Étape 4 <select name="stage4" required><option value="">Choisir…</option><option value="glycolysis">Glycolyse</option><option value="pyruvate">Oxydation du pyruvate</option><option value="krebs">Cycle de Krebs</option><option value="chain">Chaîne de transport d’électrons</option></select></label></fieldset><fieldset><legend>Quand l’oxygène manque, la fermentation…</legend><label class="mission-option"><input type="radio" name="solution" value="nad" required/>régénère le NAD<sup>+</sup>, ce qui permet à la glycolyse de continuer.</label><label class="mission-option"><input type="radio" name="solution" value="oxygen"/>remplace l’oxygène comme accepteur final dans la chaîne respiratoire.</label></fieldset><button class="mission-submit" type="submit">Valider la mission</button><p class="mission-feedback" role="status" aria-live="polite"></p></form>`;
    }
    const firstSection = main.querySelector(".content-section");
    if (firstSection) firstSection.before(mission);
    else main.append(mission);

    const form = mission.querySelector("[data-mission-form]");
    const feedback = mission.querySelector(".mission-feedback");
    const missionId = isUnit1 ? "mission-u1" : "mission-u2";
    if (save.completed.includes(missionId)) {
      form?.querySelectorAll("input, select, button").forEach((control) => (control.disabled = true));
      if (feedback) feedback.textContent = "Mission déjà accomplie — ta progression est sauvegardée.";
    }
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const correct = isUnit1
        ? data.get("solution") === "buffer" && data.get("reason") === "active-site"
        : ["glycolysis", "pyruvate", "krebs", "chain"].every(
            (stage, index) => data.get(`stage${index + 1}`) === stage,
          ) && data.get("solution") === "nad";
      if (!correct) {
        if (feedback) feedback.textContent = isUnit1
          ? "Pas encore. Un substrat supplémentaire corrige-t-il un site actif perturbé par le pH?"
          : "Pas encore. Rappelle-toi le trajet du glucose avant la chaîne, puis le rôle du NAD⁺ quand l’oxygène manque.";
        setGuide(isUnit1 ? "Indice : commence par corriger la condition qui modifie les charges du site actif." : "Indice : le glucose est d’abord fractionné; ensuite ses produits alimentent le cycle et la chaîne.", "thinking");
        return;
      }
      award(missionId, isUnit1 ? 120 : 150, isUnit1 ? "cell" : "energy");
      form.querySelectorAll("input, select, button").forEach((control) => (control.disabled = true));
      if (feedback) feedback.textContent = isUnit1
        ? "Mission réussie! Le milieu est rééquilibré et le portail du monde énergétique s’ouvre. +120 XP."
        : "Mission réussie! La chaîne énergétique est relancée. +150 XP.";
      setGuide(
        isUnit1
          ? "Bien raisonné! Tu as relié le mécanisme à la bonne intervention. Le monde suivant s’ouvre."
          : "Excellent! Le trajet de l’énergie est rétabli et ton succès est inscrit dans le carnet.",
        "happy",
      );
    });
  }

  function setupScientistActivities() {
    document.querySelectorAll("[data-menten-model]").forEach((model) => {
      const slider = model.querySelector("[data-substrate-ratio]");
      const output = model.querySelector("[data-rate-output]");
      const marker = model.querySelector("[data-rate-marker]");
      const track = model.querySelector("[data-rate-guide]");
      if (!slider || !output || !marker || !track) return;

      const update = () => {
        const ratio = Number(slider.value);
        const fraction = ratio / (1 + ratio);
        const x = 44 + (ratio / Number(slider.max)) * 270;
        const y = 188 - fraction * 148;
        marker.setAttribute("cx", String(x));
        marker.setAttribute("cy", String(y));
        track.setAttribute("x1", String(x));
        track.setAttribute("y1", String(y));
        track.setAttribute("x2", String(x));
        output.textContent = `${fraction.toFixed(2)} Vmax`;
        slider.setAttribute("aria-valuetext", `${ratio.toFixed(1)} Km; vitesse initiale ${fraction.toFixed(2)} Vmax`);
      };

      slider.addEventListener("input", update);
      update();
    });

    document.querySelectorAll("[data-huner-model]").forEach((model) => {
      const light = model.querySelector("[data-light-level]");
      const demand = model.querySelector("[data-metabolic-demand]");
      const status = model.querySelector("[data-photostasis-status]");
      const detail = model.querySelector("[data-redox-detail]");
      if (!light || !demand || !status || !detail) return;

      const update = () => {
        const difference = Number(light.value) - Number(demand.value);
        const pressure = difference > 2 ? "élevée" : difference < -2 ? "faible" : "équilibrée";
        model.dataset.state = pressure;
        status.textContent = `Pression d’excitation ${pressure}`;
        detail.textContent = difference > 2
          ? "La capture lumineuse dépasse l’utilisation métabolique : le pool de plastoquinone tend à être plus réduit. La cellule peut accroître la dissipation non photochimique."
          : difference < -2
            ? "La demande métabolique dépasse l’énergie lumineuse captée : les réactions dépendantes de la lumière limitent l’apport d’électrons."
            : "La capture et l’utilisation de l’énergie sont proches : le flux d’électrons et les réactions métaboliques restent coordonnés.";
        light.setAttribute("aria-valuetext", `Capture lumineuse ${light.value} sur 10`);
        demand.setAttribute("aria-valuetext", `Utilisation métabolique ${demand.value} sur 10`);
      };

      light.addEventListener("input", update);
      demand.addEventListener("input", update);
      update();
    });

    document.querySelectorAll("form[data-scientist-challenge]").forEach((form) => {
      const scientist = form.dataset.scientistChallenge;
      const challengeId = `article-${scientist}`;
      const feedback = form.querySelector("[data-challenge-feedback]");
      const answer = form.dataset.answer;
      const message = scientist === "menten"
        ? "Indice de Rho : cherche la concentration de substrat qui correspond à la moitié de la vitesse maximale."
        : "Indice de Rho : compare la lumière captée à la capacité du métabolisme à utiliser les électrons.";

      if (save.completed.includes(challengeId)) {
        form.querySelectorAll("input, button").forEach((control) => (control.disabled = true));
        if (feedback) feedback.textContent = "Défi déjà réussi — tes points et ton insigne sont sauvegardés.";
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const selected = form.querySelector('input[type="radio"]:checked');
        if (!selected) {
          if (feedback) feedback.textContent = "Choisis une réponse avant de valider.";
          return;
        }
        if (selected.value !== answer) {
          if (feedback) feedback.textContent = "Pas encore. Relis le schéma et essaie une autre réponse.";
          setGuide(message, "thinking");
          return;
        }

        award(challengeId, 35, scientist);
        form.querySelectorAll("input, button").forEach((control) => (control.disabled = true));
        if (feedback) feedback.textContent = "Découverte validée! +35 XP et nouvel insigne ajoutés à ton carnet.";
        setGuide(
          scientist === "menten"
            ? "Exact! Tu as relié Km à la demi-vitesse maximale. L’insigne enzymatique est à toi."
            : "Bien vu! Tu as relié l’équilibre énergétique à l’état redox du chloroplaste. L’insigne est à toi.",
          "happy",
        );
      });
    });
  }

  function observeActivities() {
    document.querySelectorAll(".game").forEach((game, index) => {
      const counter = game.querySelector(".game-counter");
      const status = game.querySelector("[data-game-status]");
      if (status) {
        const statusObserver = new MutationObserver(() => {
          const message = status.textContent || "";
          if (message.includes("Ce n’est pas la bonne définition")) {
            setGuide("Pas de souci. Compare le rôle de la notion avec chaque définition et réessaie.", "thinking");
          } else if (message.startsWith("Bonne association") || message.startsWith("Bravo")) {
            setGuide("Bonne découverte! Cette association révèle un indice important.", "happy");
          }
        });
        statusObserver.observe(status, { childList: true, characterData: true, subtree: true });
      }
      if (!counter) return;
      const observer = new MutationObserver(() => {
        const result = counter.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
        if (result && Number(result[1]) === Number(result[2]) && Number(result[2]) > 0) {
          award(`matching-${page}-${index}`, 20, isUnit1 ? "molecule" : "energy");
          setGuide("Toutes les correspondances sont justes. Belle lecture des indices!", "happy");
        }
      });
      observer.observe(counter, { childList: true, characterData: true, subtree: true });
    });
    document.querySelectorAll('[id^="quiz-feedback-"]').forEach((box, index) => {
      const observer = new MutationObserver(() => {
        const score = box.querySelector("p")?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
        if (!score) return;
        if (score[1] === score[2]) {
          award(`quiz-${page}-${index}`, 25, isUnit1 ? "molecule" : "energy");
          setGuide("Quiz parfait! Tes connaissances sont prêtes pour le prochain défi.", "happy");
        } else setGuide("Une piste reste à examiner. Lis les explications, puis reviens au défi.", "thinking");
      });
      observer.observe(box, { childList: true, characterData: true, subtree: true });
    });
  }

  function addWorldMap() {
    const map = document.querySelector("#unites");
    if (!map) return;
    map.querySelectorAll(".module").forEach((gate) => {
      gate.classList.add("world-gate");
      const isFuture = gate.classList.contains("module-upcoming");
      if (isFuture) {
        gate.classList.add("is-locked");
        gate.setAttribute("aria-disabled", "true");
      }
    });
    refreshPortals();
    const energyGate = map.querySelector('a[href="unite2.html"]');
    energyGate?.addEventListener("click", (event) => {
      if (!save.unlocked.includes("unite2.html")) {
        event.preventDefault();
        setGuide("Le laboratoire d’énergie s’ouvrira après la mission « Sauver la cellule ». Le portail reste visible sur ta carte.", "thinking");
      }
    });
  }

  function addSceneControls() {
    document.addEventListener("click", (event) => {
      const hint = event.target.closest("[data-rho-hint]");
      if (hint) {
        setGuide(isUnit1
          ? "Indice : une enzyme dépend de la forme et des charges de son site actif. Quelle variable les perturbe ici?"
          : "Indice : suis d’abord les transporteurs d’électrons; le gradient de H⁺ permet ensuite à l’ATP synthase de fonctionner.", "thinking");
      }
    });
    document.querySelectorAll(".world-gate.module-upcoming").forEach((gate) => {
      gate.setAttribute("aria-label", `${gate.querySelector("h3")?.textContent || "Monde futur"} — monde verrouillé`);
    });
  }

  setupResponsiveNavigation();
  updateHud();
  createScene();
  createMission();
  createGuide();
  decorateGuideNotes();
  addWorldMap();
  addSceneControls();
  setupScientistActivities();
  observeActivities();
})();
