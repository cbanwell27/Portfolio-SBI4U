(() => {
  const SAVE_KEY = "biology-quest-save-v1";
  const SOUND_KEY = "biology-quest-sound-v1";
  const musicNotes = [261.63, 329.63, 392, 329.63, 293.66, 392, 440, 392];
  const rewardSound = new Audio("assets/rho-xp-chime.wav");
  rewardSound.preload = "auto";
  rewardSound.volume = 0.55;
  const freshSave = () => ({
    version: 1,
    xp: 0,
    completed: [],
    started: [],
    visited: [],
    badges: [],
    unlocked: ["unite1.html"],
  });
  const normalizeSave = (value) => {
    if (
      value?.version !== 1 ||
      !Number.isFinite(value.xp) ||
      !Array.isArray(value.completed) ||
      !Array.isArray(value.badges) ||
      !Array.isArray(value.unlocked) ||
      (value.started !== undefined && !Array.isArray(value.started)) ||
      (value.visited !== undefined && !Array.isArray(value.visited))
    ) {
      throw new Error("Format de sauvegarde de la Quête du vivant non reconnu.");
    }
    return {
      ...freshSave(),
      ...value,
      started: value.started || [],
      visited: value.visited || [],
    };
  };
  let storageAvailable = true;
  let save = freshSave();
  let soundEnabled = false;
  let soundStatus = "";
  let audioContext = null;
  let masterGain = null;
  let musicTimer = null;
  let musicIndex = 0;
  let audioMuted = true;

  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (stored) save = normalizeSave(JSON.parse(stored));
  } catch (error) {
    storageAvailable = false;
    console.error("La sauvegarde locale de Quête du vivant est indisponible.", error);
  }

  try {
    soundEnabled = localStorage.getItem(SOUND_KEY) === "enabled";
  } catch (error) {
    console.error("Le réglage sonore de Quête du vivant est indisponible.", error);
  }

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isHome = page === "index.html";
  const isUnit1 = page === "unite1.html";
  const isUnit2 = page === "unite2.html";
  const isArticles = page === "articles.html";
  const isProgress = page === "parcours-rho.html";
  const isUnit2Locked = isUnit2 && !save.unlocked.includes("unite2.html");
  const body = document.body;
  const main = document.querySelector("main#contenu");
  const top = document.querySelector("header.top");
  if (isUnit2Locked && main) {
    main.innerHTML = `<div class="breadcrumbs"><a href="index.html">Camp de départ</a> › Portail verrouillé</div><section class="hero unit-head"><div class="unit-kicker">Portail verrouillé</div><h1>Le laboratoire de l’énergie</h1><p>Cette région se dévoilera après la mission finale du monde de biochimie cellulaire.</p><p><a class="btn" href="index.html#unites">Retour à la carte des mondes →</a></p></section>`;
  }
  const hero = main?.querySelector(".hero");
  const guideLines = {
    home: "La vie est pleine de passages secrets. Choisis un monde et suis les indices; je t’accompagne.",
    unit1: "Ici, une forme moléculaire peut tout changer. Observe les pièces avant d’agir.",
    unit2: "Suivons l’énergie : chaque transfert a un coût, une direction et une conséquence.",
    archive: "Les archives gardent les découvertes, les carrières et les traces de l’expédition.",
    progress: "Je garde la trace des mondes visités, des défis relevés et des insignes gagnés.",
  };
  let guideText = isHome
    ? guideLines.home
    : isUnit1
      ? guideLines.unit1
      : isUnit2
        ? guideLines.unit2
        : isArticles
          ? "Deux chercheurs, deux mondes : suivons les indices qui relient les enzymes et la photosynthèse à la vie cellulaire."
          : isProgress
            ? guideLines.progress
            : guideLines.archive;
  let guideMood = "curious";

  body.classList.add("adventure-site");
  body.classList.add(
    isHome
      ? "world-home"
      : isUnit1
        ? "world-cell"
        : isUnit2
          ? "world-energy"
          : isProgress
            ? "world-profile"
            : "world-archive",
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

  function recordWorldVisit() {
    if ((!isUnit1 && !isUnit2) || isUnit2Locked || save.visited.includes(page)) return;
    save.visited.push(page);
    persist();
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

  function updateSoundButton() {
    const button = document.querySelector("[data-sound-toggle]");
    const label = button?.querySelector("[data-sound-label]");
    const status = document.querySelector("[data-sound-status]");
    if (button) {
      button.setAttribute("aria-pressed", String(soundEnabled));
      button.setAttribute(
        "aria-label",
        soundEnabled
          ? "Désactiver la musique et les effets sonores"
          : "Activer la musique et les effets sonores",
      );
      button.title = soundEnabled ? "Couper la musique et les effets" : "Activer la musique et les effets";
    }
    if (label) label.textContent = soundEnabled ? "Couper le son" : "Activer le son";
    if (status) status.textContent = soundStatus;
  }

  function saveSoundPreference() {
    try {
      localStorage.setItem(SOUND_KEY, soundEnabled ? "enabled" : "disabled");
    } catch (error) {
      soundStatus = "Le réglage sonore ne sera pas conservé.";
      console.error("Impossible d’enregistrer le réglage sonore.", error);
    }
  }

  function getAudioContext() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("La lecture audio n’est pas prise en charge par ce navigateur.");
    }
    if (!audioContext) {
      audioContext = new AudioContextConstructor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioContext.destination);
    }
    return audioContext;
  }

  function playTone(frequency, duration, volume, delay = 0) {
    if (!soundEnabled || !audioContext || !masterGain || audioContext.state !== "running") return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const attack = Math.min(0.08, duration * 0.25);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function playAmbientNote() {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;
    const frequency = musicNotes[musicIndex % musicNotes.length];
    playTone(frequency, 2.8, 0.055);
    if (musicIndex % 3 === 0) playTone(frequency * 1.5, 3.2, 0.025, 0.08);
    musicIndex += 1;
  }

  function startAmbientMusic() {
    if (musicTimer) return;
    playAmbientNote();
    musicTimer = window.setInterval(playAmbientNote, 3200);
  }

  async function activateSound() {
    const context = getAudioContext();
    if (context.state !== "running") await context.resume();
    if (!soundEnabled) return;
    if (context.state !== "running") throw new Error("Le navigateur n’a pas activé la lecture audio.");
    if (audioMuted && masterGain) {
      masterGain.gain.setTargetAtTime(0.3, context.currentTime, 0.12);
      audioMuted = false;
    }
    startAmbientMusic();
  }

  function deactivateSound() {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
    rewardSound.pause();
    rewardSound.currentTime = 0;
    if (!audioContext || !masterGain) return;
    masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.035);
    audioMuted = true;
    const context = audioContext;
    window.setTimeout(() => {
      if (!soundEnabled && context.state === "running") {
        context.suspend().catch((error) => {
          console.error("Impossible de suspendre la lecture sonore.", error);
        });
      }
    }, 180);
  }

  function handleSoundError(error) {
    soundEnabled = false;
    soundStatus = "Le son n’a pas pu démarrer dans ce navigateur.";
    console.error("La lecture sonore de Quête du vivant a échoué.", error);
    saveSoundPreference();
    deactivateSound();
    updateSoundButton();
  }

  function playCelebration() {
    if (!soundEnabled) return;
    rewardSound.currentTime = 0;
    rewardSound.play()?.catch(handleSoundError);
  }

  function showXpReward() {
    const targets = [
      top?.querySelector(".hud-xp"),
      document.querySelector(".rho-toggle"),
    ].filter(Boolean);
    targets.forEach((target) => {
      target.classList.remove("is-rewarding");
      void target.offsetWidth;
      target.classList.add("is-rewarding");
      window.setTimeout(() => target.classList.remove("is-rewarding"), 850);
    });
  }

  function setupSoundControls() {
    updateSoundButton();
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-sound-toggle]")) {
        soundEnabled = !soundEnabled;
        soundStatus = "";
        saveSoundPreference();
        updateSoundButton();
        if (soundEnabled) {
          activateSound().catch(handleSoundError);
        } else {
          deactivateSound();
        }
        return;
      }
      const control = target.closest("button:not(:disabled), a[href], summary");
      if (!soundEnabled || !control) return;
      const rewardInteraction = control.matches('button[type="submit"], .game button');
      activateSound()
        .then(() => {
          if (!rewardInteraction) {
            playTone(587.33, 0.11, 0.12);
            playTone(783.99, 0.13, 0.08, 0.07);
          }
        })
        .catch(handleSoundError);
    });
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
    if (button && showDialogue) {
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Fermer le dialogue de Rho");
      const label = button.querySelector("[data-rho-action-label]");
      if (label) label.textContent = "Fermer le dialogue";
    }
    if (avatar) avatar.dataset.mood = guideMood;
  }

  function startActivity(id) {
    if (save.completed.includes(id) || save.started.includes(id)) return;
    save.started.push(id);
    persist();
    if (isProgress) renderProgressPage();
  }

  function award(id, points, badgeId) {
    if (save.completed.includes(id)) {
      setGuide("Cette découverte est déjà inscrite dans ton carnet. Choisis un autre défi!", "happy");
      return false;
    }
    save.completed.push(id);
    save.started = save.started.filter((activity) => activity !== id);
    save.xp += points;
    if (badgeId && !save.badges.includes(badgeId)) save.badges.push(badgeId);
    if (id === "mission-u1" && !save.unlocked.includes("unite2.html")) {
      save.unlocked.push("unite2.html");
    }
    persist();
    updateHud();
    showXpReward();
    refreshPortals();
    if (isProgress) renderProgressPage();
    playCelebration();
    return true;
  }

  function createGuide() {
    const companion = document.createElement("aside");
    companion.className = "rho-companion";
    companion.setAttribute("aria-label", "Rho, ton guide");
    companion.innerHTML = `<div class="rho-dialogue" id="rho-dialogue" role="status" hidden><span class="rho-name">Rho</span><span data-rho-message></span></div><button class="sound-toggle" type="button" data-sound-toggle aria-pressed="false" aria-label="Activer la musique et les effets sonores"><span aria-hidden="true">♫</span><span data-sound-label>Activer le son</span></button><span class="sound-status" data-sound-status role="status" aria-live="polite"></span><button class="rho-toggle" type="button" aria-expanded="false" aria-controls="rho-dialogue" aria-label="Parler à Rho"><img src="assets/rho-guide.png" alt=""/><span data-rho-action-label>Parler à Rho</span></button>`;
    (top || document.body).append(companion);
    const button = companion.querySelector(".rho-toggle");
    const dialogue = companion.querySelector(".rho-dialogue");
    button?.addEventListener("click", () => {
      const opening = dialogue?.hidden ?? false;
      if (dialogue) dialogue.hidden = !dialogue.hidden;
      companion.classList.toggle("is-speaking", opening);
      button?.setAttribute("aria-expanded", String(opening));
      button?.setAttribute("aria-label", opening ? "Fermer le dialogue de Rho" : "Parler à Rho");
      const label = button?.querySelector("[data-rho-action-label]");
      if (label) label.textContent = opening ? "Fermer le dialogue" : "Parler à Rho";
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

  function clarifyButtonLabels() {
    document.querySelectorAll(".concept-node").forEach((button) => {
      const concept = button.dataset.title || button.textContent.trim();
      const label = `Afficher les liens du concept ${concept}`;
      button.setAttribute("aria-label", label);
      button.title = label;
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
            : isProgress
              ? "Profil du compagnon · Quête du vivant"
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
          : isProgress
            ? "#bilan"
            : page === "articles.html"
              ? "#menten"
              : page === "carrieres.html"
                ? "#emploi-biochimiste"
                : page === "bibliographie.html"
                  ? "#sources-unite1"
                  : page === "presentation.html"
                    ? "#cap-scientifique"
                    : page === "lettre-ouverture.html"
                      ? "#lettre"
                      : "#contenu";
    start.textContent = isHome
      ? "Choisir un monde →"
      : isUnit2Locked
        ? "Retour à la carte des mondes →"
        : isUnit1 || isUnit2
          ? "Rejoindre la mission →"
          : isProgress
            ? "Voir le parcours ↓"
              : page === "articles.html"
                ? "Lire les archives →"
                : page === "carrieres.html"
                  ? "Découvrir les métiers →"
                  : page === "bibliographie.html"
                    ? "Parcourir les sources →"
                    : page === "presentation.html"
                      ? "Découvrir le cap scientifique →"
                      : page === "lettre-ouverture.html"
                        ? "Lire la lettre de bord →"
                        : "Explorer le contenu →";
    actions.append(start);
    if ((isUnit1 || isUnit2) && !isUnit2Locked) {
      const hint = document.createElement("button");
      hint.className = "quest-action secondary";
      hint.type = "button";
      hint.dataset.rhoHint = "true";
      hint.textContent = "Afficher un indice de Rho";
      actions.append(hint);
    }
    if (!isHome) copy.append(actions);

    const guide = document.createElement("div");
    guide.className = "scene-guide";
    guide.innerHTML = `<img src="assets/rho-guide.png" alt="Rho, rhinocéros explorateur de Quête du vivant"/><div class="guide-caption"><strong>Rho :</strong> ${isHome ? "Chaque monde cache une énigme. On part?" : isUnit1 ? "Regarde la structure avant de chercher sa fonction." : isUnit2 ? "Suis les électrons : ils racontent le trajet de l’énergie." : isProgress ? "Chaque défi accompli laisse une trace sur notre carte." : "Une bonne enquête commence par une question précise."}</div>`;
    hero.append(guide);

    if ((isUnit1 || isUnit2) && !isUnit2Locked) {
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
        unitMenu.classList.add("world-waypoints", "expedition-menu");
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
    if (location.hash === "#mission-finale") {
      requestAnimationFrame(() => mission.scrollIntoView({ block: "start" }));
    }

    const form = mission.querySelector("[data-mission-form]");
    const feedback = mission.querySelector(".mission-feedback");
    const missionId = isUnit1 ? "mission-u1" : "mission-u2";
    let replayButton = null;
    form?.addEventListener("change", () => startActivity(missionId), { once: true });
    if (save.completed.includes(missionId)) {
      form?.querySelectorAll("input, select, button").forEach((control) => (control.disabled = true));
      if (feedback) feedback.textContent = "Mission déjà accomplie — tu peux la rejouer sans gagner une deuxième fois les XP.";
      replayButton = document.createElement("button");
      replayButton.className = "mission-replay";
      replayButton.type = "button";
      replayButton.textContent = "Rejouer la mission sans nouvelle récompense";
      form?.after(replayButton);
      replayButton.addEventListener("click", () => {
        form?.reset();
        form?.querySelectorAll("input, select, button").forEach((control) => (control.disabled = false));
        replayButton.hidden = true;
        if (feedback) feedback.textContent = "Nouvelle tentative : les XP de cette mission ont déjà été obtenus.";
        form?.querySelector("input, select")?.focus();
      });
    }
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const alreadyCompleted = save.completed.includes(missionId);
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
      if (!alreadyCompleted) award(missionId, isUnit1 ? 120 : 150, isUnit1 ? "cell" : "energy");
      form.querySelectorAll("input, select, button").forEach((control) => (control.disabled = true));
      if (alreadyCompleted && replayButton) replayButton.hidden = false;
      if (feedback) {
        feedback.textContent = alreadyCompleted
          ? "Mission rejouée avec succès — aucune XP supplémentaire n’a été attribuée."
          : isUnit1
            ? "Mission réussie! Le milieu est rééquilibré et le portail du monde énergétique s’ouvre. +120 XP."
            : "Mission réussie! La chaîne énergétique est relancée. +150 XP.";
      }
      setGuide(
        alreadyCompleted
          ? "Bravo pour cette nouvelle tentative! Ta récompense d’origine reste acquise, sans doublon."
          : isUnit1
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

      form.addEventListener("change", () => startActivity(challengeId), { once: true });
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
      game.addEventListener("click", (event) => {
        if (event.target.closest("button")) startActivity(`matching-${page}-${index}`);
      });
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
      const quiz = document.getElementById(`quiz-${isUnit1 ? "1" : "2"}`);
      quiz?.addEventListener("change", () => startActivity(`quiz-${page}-${index}`), { once: true });
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

  const progressActivities = [
    { id: "mission-u1", title: "Sauver la cellule", unit: "unite1.html", section: "mission-finale", category: "Mission finale", xp: 120 },
    { id: "matching-unite1.html-0", title: "Relier les notions de biochimie", unit: "unite1.html", section: "jeux", category: "Associations", xp: 20 },
    { id: "quiz-unite1.html-0", title: "Épreuve de biochimie cellulaire", unit: "unite1.html", section: "quiz", category: "Quiz", xp: 25 },
    { id: "article-menten", title: "Enquête — Maud L. Menten", unit: "articles.html", section: "menten", category: "Archive scientifique", xp: 35, alwaysAvailable: true },
    { id: "mission-u2", title: "Restaurer l’énergie", unit: "unite2.html", section: "mission-finale", category: "Mission finale", xp: 150 },
    { id: "matching-unite2.html-0", title: "Relier les notions énergétiques", unit: "unite2.html", section: "jeux", category: "Associations", xp: 20 },
    { id: "quiz-unite2.html-0", title: "Épreuve des processus métaboliques", unit: "unite2.html", section: "quiz", category: "Quiz", xp: 25 },
    { id: "article-huner", title: "Enquête — Norman P. A. Hüner", unit: "articles.html", section: "huner", category: "Archive scientifique", xp: 35, alwaysAvailable: true },
  ];

  const profileBadges = [
    { id: "molecule", icon: "◈", title: "Éclaireuse moléculaire", detail: "Défi de concepts du monde cellulaire" },
    { id: "cell", icon: "✦", title: "Gardienne de la cellule", detail: "Mission finale du monde cellulaire" },
    { id: "menten", icon: "◉", title: "Éclaireuse enzymatique", detail: "Enquête scientifique sur Maud L. Menten" },
    { id: "energy", icon: "⚡", title: "Maîtresse de l’énergie", detail: "Défi de concepts ou mission du monde énergétique" },
    { id: "huner", icon: "↗", title: "Gardienne de la photostase", detail: "Enquête scientifique sur Norman P. A. Hüner" },
  ];

  function isActivityAvailable(activity) {
    return activity.alwaysAvailable || save.unlocked.includes(activity.unit);
  }

  function getActivityStatus(activity) {
    if (save.completed.includes(activity.id)) return "completed";
    if (!isActivityAvailable(activity)) return "locked";
    return save.started.includes(activity.id) ? "in-progress" : "available";
  }

  function getProgressMessage() {
    const available = progressActivities.filter(isActivityAvailable);
    if (available.every((activity) => save.completed.includes(activity.id))) {
      return {
        text: "Tous les défis actuellement accessibles sont accomplis. Gardons le cap : de nouveaux mondes attendent encore sur la carte.",
        mood: "happy",
      };
    }
    if (save.completed.includes("mission-u2")) {
      return {
        text: "Le laboratoire de l’énergie fonctionne de nouveau. Tes découvertes ont relié les réactions cellulaires à la photosynthèse.",
        mood: "happy",
      };
    }
    if (save.completed.includes("mission-u1")) {
      return {
        text: "Le portail énergétique est ouvert! Les défis de biochimie restent dans notre sillage, et un nouveau monde est prêt à être exploré.",
        mood: "happy",
      };
    }
    if (save.started.length) {
      return {
        text: "Une enquête est en cours. Reprenons les indices là où tu les as laissés.",
        mood: "thinking",
      };
    }
    if (save.visited.includes("unite1.html")) {
      return {
        text: "Le monde cellulaire a été visité. Les missions et les défis accomplis ouvriront la suite de l’expédition.",
        mood: "curious",
      };
    }
    return {
      text: "Bienvenue dans mon carnet! Choisis un monde, relève ses défis et je garderai en mémoire les étapes franchies.",
      mood: "curious",
    };
  }

  function renderProgressPage() {
    const panel = document.querySelector("#rho-progress-content");
    if (!panel) return;

    const message = getProgressMessage();
    const available = progressActivities.filter(isActivityAvailable);
    const completedAvailable = available.filter((activity) => save.completed.includes(activity.id)).length;
    const level = Math.floor(save.xp / 100) + 1;
    const levelProgress = save.xp % 100;
    const exploredWorlds = ["unite1.html", "unite2.html"].filter((world) => save.visited.includes(world)).length;
    const unlockedWorld2 = save.unlocked.includes("unite2.html");

    const worlds = [
      { number: "01", name: "Biochimie cellulaire", page: "unite1.html", mission: "mission-u1" },
      { number: "02", name: "Processus métaboliques", page: "unite2.html", mission: "mission-u2" },
      { number: "03", name: "Génétique moléculaire", locked: true },
      { number: "04", name: "Homéostasie", locked: true },
      { number: "05", name: "Populations et écosystèmes", locked: true },
    ];

    const worldMarkup = worlds.map((world) => {
      const locked = world.locked || (world.page === "unite2.html" && !unlockedWorld2);
      const explored = world.page && save.visited.includes(world.page);
      const missionComplete = world.mission && save.completed.includes(world.mission);
      const status = locked
        ? "Verrouillé"
        : missionComplete
          ? "Mission accomplie"
          : explored
            ? "Exploré"
            : "Ouvert";
      const className = locked ? "locked" : missionComplete ? "complete" : explored ? "explored" : "open";
      const card = `<span class="journey-world-number">Monde ${world.number}</span><strong>${world.name}</strong><span class="journey-world-status" data-status="${className}">${status}</span>`;
      return locked
        ? `<article class="journey-world" data-state="${className}">${card}${world.number === "02" ? '<small>Déverrouillé après « Sauver la cellule »</small>' : ""}</article>`
        : `<a class="journey-world" data-state="${className}" href="${world.page}">${card}<span class="journey-world-link">${explored ? "Revisiter le monde →" : "Explorer le monde →"}</span></a>`;
    }).join("");

    const activityMarkup = progressActivities.map((activity) => {
      const status = getActivityStatus(activity);
      const label = status === "completed"
        ? "Accompli"
        : status === "in-progress"
          ? "En cours"
          : status === "locked"
            ? "Verrouillé"
            : "À découvrir";
      const target = `${activity.unit}#${activity.section}`;
      const actionLabel = status === "completed"
        ? "Revoir le défi →"
        : status === "in-progress"
          ? "Reprendre le défi →"
          : "Commencer le défi →";
      const action = status === "locked"
        ? '<span class="activity-locked">Accès après le déverrouillage du monde</span>'
        : `<a class="activity-action" href="${target}">${actionLabel}</a>`;
      return `<article class="progress-activity" data-status="${status}"><div class="activity-heading"><span class="activity-category">${activity.category}</span><span class="activity-status" data-status="${status}">${label}</span></div><h4>${activity.title}</h4><p>Récompense : +${activity.xp} XP</p>${action}</article>`;
    }).join("");

    const badgeMarkup = profileBadges.map((badge) => {
      const earned = save.badges.includes(badge.id);
      return `<article class="rho-badge" data-earned="${earned}"><span class="rho-badge-icon" aria-hidden="true">${badge.icon}</span><div><h4>${badge.title}</h4><p>${badge.detail}</p><span class="badge-status">${earned ? "Insigne obtenu" : "À gagner"}</span></div></article>`;
    }).join("");

    const milestones = [
      { condition: save.visited.includes("unite1.html"), text: "Première exploration du monde cellulaire" },
      { condition: save.badges.includes("menten"), text: "Insigne enzymatique de Maud L. Menten obtenu" },
      { condition: save.completed.includes("mission-u1"), text: "Portail du laboratoire de l’énergie déverrouillé" },
      { condition: save.badges.includes("huner"), text: "Insigne de photostase de Norman P. A. Hüner obtenu" },
      { condition: save.completed.includes("mission-u2"), text: "Production énergétique restaurée" },
    ];
    const milestoneMarkup = milestones.map((milestone) => (
      `<li data-reached="${milestone.condition}"><span aria-hidden="true">${milestone.condition ? "✓" : "○"}</span><span>${milestone.text}</span><strong>${milestone.condition ? "Atteint" : "À atteindre"}</strong></li>`
    )).join("");

    panel.innerHTML = `
      <div class="rho-profile-intro">
        <img src="assets/rho-guide.png" alt="Rho, rhinocéros éclaireur de Quête du vivant"/>
        <div><p class="profile-eyebrow">Message de Rho</p><blockquote>${message.text}</blockquote></div>
      </div>
      <div class="rho-profile-stats">
        <article class="profile-stat profile-stat-xp"><span>Expérience</span><strong>${save.xp} XP</strong><small>Niveau ${level}</small><progress max="100" value="${levelProgress}" aria-label="${levelProgress} XP sur 100 vers le prochain niveau"></progress></article>
        <article class="profile-stat"><span>Défis accomplis</span><strong>${completedAvailable} / ${available.length}</strong><small>Parmi les défis accessibles</small><progress max="${Math.max(available.length, 1)}" value="${completedAvailable}" aria-label="${completedAvailable} défis accomplis sur ${available.length} accessibles"></progress></article>
        <article class="profile-stat"><span>Mondes explorés</span><strong>${exploredWorlds} / 5</strong><small>Les mondes 01 et 02 forment l’expédition actuelle</small></article>
      </div>
      <section class="profile-block" aria-labelledby="journey-heading">
        <div class="profile-section-heading"><p class="profile-eyebrow">Carte de voyage</p><h3 id="journey-heading">Les mondes de l’expédition</h3></div>
        <div class="journey-route">${worldMarkup}</div>
        <div class="journey-legend" aria-label="États des mondes"><span>Ouvert</span><span>Exploré</span><span>Mission accomplie</span><span>Verrouillé</span></div>
      </section>
      <section class="profile-block" aria-labelledby="activities-heading">
        <div class="profile-section-heading"><p class="profile-eyebrow">Journal des missions</p><h3 id="activities-heading">Défis accomplis et à relever</h3></div>
        <div class="progress-activity-grid">${activityMarkup}</div>
      </section>
      <div class="profile-lower-grid">
        <section class="profile-block" aria-labelledby="badges-heading">
          <div class="profile-section-heading"><p class="profile-eyebrow">Objets de collection</p><h3 id="badges-heading">Insignes de Rho</h3></div>
          <div class="rho-badge-grid">${badgeMarkup}</div>
        </section>
        <section class="profile-block" aria-labelledby="milestones-heading">
          <div class="profile-section-heading"><p class="profile-eyebrow">Repères du sentier</p><h3 id="milestones-heading">Étapes marquantes</h3></div>
          <ol class="rho-milestones">${milestoneMarkup}</ol>
        </section>
      </div>
      <section class="progress-reset-block" aria-labelledby="restart-title">
        <div><h3 id="restart-title">Repartir à zéro</h3><p>Recommencer effacera les XP, missions, insignes, mondes visités et portails déverrouillés dans ce navigateur. Le réglage du son sera conservé.</p></div>
        <button class="progress-reset-trigger" type="button" data-reset-adventure>Recommencer l’aventure de Rho</button>
        <div class="progress-reset-confirmation" data-reset-confirmation hidden role="group" aria-labelledby="restart-confirm-title">
          <p id="restart-confirm-title">Cette action est irréversible. Veux-tu vraiment effacer toute la progression de Rho?</p>
          <button class="progress-reset-confirm" type="button" data-confirm-reset>Oui, recommencer l’aventure</button>
          <button class="progress-reset-cancel" type="button" data-cancel-reset>Annuler</button>
        </div>
      </section>
      <p class="progress-save-note" role="status">${storageAvailable ? "La progression est enregistrée dans ce navigateur." : "La sauvegarde locale est indisponible dans ce navigateur."}</p>`;

    const resetTrigger = panel.querySelector("[data-reset-adventure]");
    const resetConfirmation = panel.querySelector("[data-reset-confirmation]");
    resetTrigger?.addEventListener("click", () => {
      if (!resetConfirmation) return;
      resetConfirmation.hidden = false;
      resetTrigger.hidden = true;
      resetConfirmation.querySelector("[data-confirm-reset]")?.focus();
    });
    panel.querySelector("[data-cancel-reset]")?.addEventListener("click", () => {
      if (resetConfirmation) resetConfirmation.hidden = true;
      if (resetTrigger) {
        resetTrigger.hidden = false;
        resetTrigger.focus();
      }
    });
    panel.querySelector("[data-confirm-reset]")?.addEventListener("click", () => {
      const previousSave = save;
      save = freshSave();
      if (!persist()) {
        save = previousSave;
        updateHud();
        renderProgressPage();
        return;
      }
      updateHud();
      refreshPortals();
      renderProgressPage();
      setGuide("Une nouvelle expédition commence! Choisis un monde et nous repartirons ensemble.", "curious");
    });

    setGuide(message.text, message.mood, false);
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
  recordWorldVisit();
  updateHud();
  createScene();
  createMission();
  createGuide();
  setupSoundControls();
  decorateGuideNotes();
  clarifyButtonLabels();
  addWorldMap();
  addSceneControls();
  setupScientistActivities();
  observeActivities();
  renderProgressPage();

  window.addEventListener("storage", (event) => {
    if (event.key !== SAVE_KEY || !event.newValue) return;
    try {
      save = normalizeSave(JSON.parse(event.newValue));
      updateHud();
      refreshPortals();
      renderProgressPage();
    } catch (error) {
      console.error("La progression partagée de Quête du vivant est invalide.", error);
    }
  });
})();
