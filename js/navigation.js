import {
  updateMoneyDisplay,
  spendMoney,
  addToCollection,
  collection
} from "./game-state.js";

import { generateCard } from "./card-generator.js";

const container = document.getElementById("screen-container");
const buttons = document.querySelectorAll(".menu-btn");

// init money display
updateMoneyDisplay();

// menu buttons → load screens
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const screen = btn.dataset.screen;
    loadScreen(screen);
  });
});

// load a screen file into the container
export async function loadScreen(name) {
  const html = await fetch(`screens/${name}.html`).then(r => r.text());
  container.innerHTML = html;
  container.classList.remove("hidden");
  container.classList.add("active-screen");

  document.dispatchEvent(new Event("screenLoaded"));
}

// global back function
window.goBack = function () {
  container.classList.add("closing");

  setTimeout(() => {
    container.classList.add("hidden");
    container.classList.remove("active-screen");
    container.classList.remove("closing");
    container.innerHTML = "";
  }, 300);
};

// handle pack buy clicks
document.addEventListener("click", e => {
  if (e.target.classList.contains("pack-buy")) {
    const pack = e.target.closest(".pack").dataset.pack;
    buyPack(pack);
  }
});

// buy pack → spend money → open pack
function buyPack(type) {
  const cost = type === "basic" ? 100 : 150;

  if (!spendMoney(cost)) {
    alert("Not enough money!");
    return;
  }

  openPack(type);
}

// generate cards for pack
function openPack(type) {
  const count = 5;
  const cards = [];

  for (let i = 0; i < count; i++) {
    const card = generateCard();
    cards.push(card);
    addToCollection(card);
  }

  showPackOpening(cards);
}

// pack opening popup
function showPackOpening(cards) {
  const div = document.createElement("div");
  div.className = "pack-opening";

  div.innerHTML = `
    <h2>Pack Opened!</h2>
    <div id="pack-cards"></div>
    <button class="save-btn" onclick="this.parentElement.remove()">Close</button>
  `;

  document.body.appendChild(div);

  const container = div.querySelector("#pack-cards");

  cards.forEach(card => {
    const c = document.createElement("div");
    c.className = "pack-card";
    c.style.background = card.hex;
    c.title = `${card.name} (${card.rarity})`;
    container.appendChild(c);
  });
}

// when a screen loads, populate collection if it's the collection screen
document.addEventListener("screenLoaded", () => {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;

  grid.innerHTML = "";

  collection.forEach(card => {
    const div = document.createElement("div");
    div.className = "card-placeholder";
    div.style.background = card.hex;
    div.title = `${card.name} (${card.rarity})`;
    grid.appendChild(div);
  });
});
