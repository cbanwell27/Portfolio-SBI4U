(() => {
  const lab = document.querySelector("[data-enzyme-lab]");
  if (!lab) return;

  const temperature = lab.querySelector("#enzyme-temperature");
  const pH = lab.querySelector("#enzyme-ph");
  const substrate = lab.querySelector("#enzyme-substrate");
  const temperatureValue = lab.querySelector("#enzyme-temperature-value");
  const pHValue = lab.querySelector("#enzyme-ph-value");
  const substrateValue = lab.querySelector("#enzyme-substrate-value");
  const rateBar = lab.querySelector("#enzyme-rate");
  const rateText = lab.querySelector("#enzyme-rate-text");
  const interpretation = lab.querySelector("#enzyme-interpretation");
  const reset = lab.querySelector("[data-enzyme-reset]");

  if (
    !temperature ||
    !pH ||
    !substrate ||
    !temperatureValue ||
    !pHValue ||
    !substrateValue ||
    !rateBar ||
    !rateText ||
    !interpretation
  ) {
    return;
  }

  const update = () => {
    const temp = Number(temperature.value);
    const acidity = Number(pH.value);
    const concentration = Number(substrate.value);
    const thermalEffect = Math.exp(-0.5 * ((temp - 37) / 18) ** 2);
    const pHEffect = Math.exp(-0.5 * ((acidity - 7) / 1.8) ** 2);
    const substrateEffect =
      concentration / (35 + concentration);
    const maximumSubstrateEffect = 100 / 135;
    const relativeRate = Math.round(
      100 *
        thermalEffect *
        pHEffect *
        (substrateEffect / maximumSubstrateEffect),
    );

    temperatureValue.textContent = `${temp} °C`;
    pHValue.textContent = acidity.toFixed(1);
    substrateValue.textContent = `${concentration} unités relatives`;
    rateBar.value = relativeRate;
    rateText.textContent = `Activité relative modélisée : ${relativeRate} %`;

    if (concentration === 0) {
      interpretation.textContent =
        "Sans substrat dans ce modèle, aucune réaction catalysée n’est représentée.";
    } else if (temp > 60) {
      interpretation.textContent =
        "La température élevée réduit fortement l’activité modélisée. Dans une vraie enzyme, une chaleur suffisante peut perturber sa structure et la dénaturer.";
    } else if (relativeRate < 25) {
      interpretation.textContent =
        "Au moins une condition éloignée de l’optimum proposé limite l’activité. Compare les variables une à une pour repérer laquelle a le plus d’effet.";
    } else {
      interpretation.textContent =
        "Les conditions sont relativement favorables dans ce modèle. Une hausse du substrat ne peut toutefois pas accroître indéfiniment la vitesse : les sites actifs finissent par être occupés.";
    }
  };

  [temperature, pH, substrate].forEach((control) =>
    control.addEventListener("input", update),
  );

  reset?.addEventListener("click", () => {
    temperature.value = "37";
    pH.value = "7";
    substrate.value = "50";
    update();
  });

  update();
})();
