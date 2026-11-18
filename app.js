"use strict";

const storageKey = "umbra-rpg-v1";
const channel = "umbra-projecao-v1";
const fileMode = location.protocol === "file:";
const messageOrigin = fileMode ? "*" : location.origin;
const defaultTokenScale = 100;
const minTokenScale = 50;
const maxTokenScale = 200;
const tokenScaleStep = 10;
const defaultCamera = { zoom: 1, x: .5, y: .5, rotation: 0 };
const cameraFrameRatio = 1.5;
const maxMapZoom = 6;
const mapZoomStep = .25;

const $ = (id) => document.getElementById(id);
const make = (tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
};

function button(label, className, action) {
  const element = make("button", className, label);
  element.type = "button";
  element.addEventListener("click", action);
  return element;
}

function id() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (number) => number.toString(36)).join("-");
}

const defaultItems = () => [{ id: "bau", name: "Baú", icon: "chest", color: "#d6ad70", notes: "" }];

function initialState() {
  return {
    activeScene: "ruinas",
    monsters: [],
    items: defaultItems(),
    professions: [],
    characters: [
      { id: "lyra", name: "Lyra Ventobravo", role: "Patrulheira", hp: 18, maxHp: 18, color: "#a8d0ab", attributes: "Agilidade 15", notes: "" },
      { id: "dorian", name: "Dorian Ferropedra", role: "Guerreiro", hp: 24, maxHp: 24, color: "#d9b182", attributes: "Força 16", notes: "" },
      { id: "mira", name: "Mira Valeluz", role: "Arcanista", hp: 14, maxHp: 14, color: "#c5a9fb", attributes: "Intelecto 16", notes: "" },
    ],
    scenes: [{
      id: "ruinas",
      name: "Ruínas do Musgo",
      image: "ruinas-do-musgo.png",
      ratio: 1.5,
      intro: "A trilha desaparece sob as raízes, e um arco de pedra surge entre as árvores. Do pátio em ruínas vem um som metálico, embora não haja ninguém à vista.",
      notes: "O som vem do poço. Uma escada estreita, encoberta pelo musgo, desce pela parede interna.",
      grid: true,
      tokens: [{ id: "lyra", x: .36, y: .82 }, { id: "dorian", x: .43, y: .87 }, { id: "mira", x: .49, y: .80 }],
    }],
  };
}

function post(target, type, data = {}) {
  if (target && !target.closed) target.postMessage({ channel, type, ...data }, messageOrigin);
}

function fromPeer(event, peer) {
  const validOrigin = event.origin === location.origin || (fileMode && event.origin === "null");
  return peer && event.source === peer && validOrigin && event.data?.channel === channel;
}

function setPosition(element, { x, y }) {
  element.style.left = `${x * 100}%`;
  element.style.top = `${y * 100}%`;
}

function cameraDimensions(zoom, rotation, ratio) {
  const radians = rotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const width = Math.min(ratio, cameraFrameRatio);
  const height = width / ratio;
  const rotatedWidth = cos * width + sin * height;
  const rotatedHeight = sin * width + cos * height;
  const scale = zoom * Math.min(cameraFrameRatio / rotatedWidth, 1 / rotatedHeight);
  return { cos, sin, width, height, scale };
}

function paintCamera(board, { zoom, x, y, rotation = 0 } = defaultCamera) {
  const ratio = Number(board.style.getPropertyValue("--ratio")) || cameraFrameRatio;
  const { scale } = cameraDimensions(zoom, rotation, ratio);
  board.parentElement.classList.toggle("camera-active", zoom > 1 || rotation !== 0);
  board.style.setProperty("--camera-zoom", scale);
  board.style.setProperty("--camera-angle", `${rotation}deg`);
  board.style.setProperty("--token-angle", `${-rotation}deg`);
  board.style.setProperty("--camera-x", `${(.5 - x) * scale * 100}%`);
  board.style.setProperty("--camera-y", `${(.5 - y) * scale * 100}%`);
}

function placeFogArea(element, { left, top, right, bottom }) {
  setPosition(element, { x: left, y: top });
  element.style.width = `${(right - left) * 100}%`;
  element.style.height = `${(bottom - top) * 100}%`;
}

function paintFog(board, fog) {
  board.querySelector(".fog-layer").replaceChildren(...fog.map((area) => {
    const element = make("div", "fog-area");
    placeFogArea(element, area);
    return element;
  }));
}

function isCovered({ x, y }, fog) {
  return fog.some(({ left, top, right, bottom }) => x >= left && x <= right && y >= top && y <= bottom);
}

function subtractFogArea(area, cut) {
  const left = Math.max(area.left, cut.left);
  const top = Math.max(area.top, cut.top);
  const right = Math.min(area.right, cut.right);
  const bottom = Math.min(area.bottom, cut.bottom);
  if (right <= left || bottom <= top) return [area];
  return [
    { ...area, bottom: top },
    { ...area, top: bottom },
    { left: area.left, top, right: left, bottom },
    { left: right, top, right: area.right, bottom },
  ].filter((piece) => piece.right > piece.left && piece.bottom > piece.top);
}

function tokenFace(element, token) {
  const initials = token.name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase("pt-BR");
  if (token.image) {
    const portrait = make("img", "token-portrait");
    portrait.alt = "";
    portrait.draggable = false;
    portrait.addEventListener("error", () => { element.textContent = initials; }, { once: true });
    portrait.src = token.image;
    element.replaceChildren(portrait);
  } else if (token.icon === "chest") {
    const chest = make("span", "token-chest");
    chest.setAttribute("aria-hidden", "true");
    element.replaceChildren(chest);
  } else {
    element.textContent = initials;
  }
  element.style.setProperty("--token-color", token.color);
  element.title = token.name;
  return element;
}

function paintBoard(board, empty, scene, interactive) {
  board.hidden = !scene;
  empty.hidden = Boolean(scene);
  const layer = board.querySelector(".token-layer");
  layer.replaceChildren();
  paintFog(board, scene?.fog ?? []);
  board.style.setProperty("--ratio", scene?.ratio ?? cameraFrameRatio);
  paintCamera(board, scene?.camera);
  if (!scene) return;

  const image = board.querySelector(".board-image");
  if (image.getAttribute("src") !== scene.image) image.src = scene.image;
  board.setAttribute("aria-label", scene.name);
  board.querySelector(".map-grid").hidden = !scene.grid;

  for (const token of scene.tokens) {
    const element = make(interactive ? "button" : "span", "map-token");
    const face = tokenFace(make("span", "token map-token-face"), token);
    element.append(face);
    element.dataset.token = token.id;
    element.title = token.name;
    element.style.setProperty("--token-scale", token.displayScale);
    let label = token.name;
    if (token.hp !== undefined) {
      const health = make("span", "token-health", `${token.hp}/${token.maxHp}`);
      health.setAttribute("aria-hidden", "true");
      element.append(health);
      label += `. Vida ${token.hp} de ${token.maxHp}`;
    }
    if (interactive) {
      element.type = "button";
      label += ". Use as setas para mover.";
      if (token.hasAnimations) {
        element.setAttribute("aria-haspopup", "dialog");
        label += " Pressione Enter para escolher um GIF.";
      }
    } else {
      element.setAttribute("role", "img");
      element.hidden = isCovered(token, scene.fog ?? []);
    }
    element.setAttribute("aria-label", label);
    setPosition(element, token);
    layer.append(element);
  }
}

function startProjection() {
  const board = $("projection-board");
  const empty = $("projection-empty");
  let activeId;
  let fog = [];
  const positions = new Map();
  window.addEventListener("message", (event) => {
    if (!fromPeer(event, window.opener)) return;
    const message = event.data;
    if (message.type === "scene") {
      activeId = message.scene?.id;
      fog = message.scene?.fog ?? [];
      positions.clear();
      for (const token of message.scene?.tokens ?? []) positions.set(token.id, token);
      if (!activeId) empty.textContent = "Selecione um cenário no painel do mestre.";
      paintBoard(board, empty, message.scene, false);
      return;
    }
    if (activeId !== message.sceneId) return;
    if (message.type === "fog") {
      fog = message.fog;
      paintFog(board, fog);
      for (const element of board.querySelectorAll(".map-token")) {
        element.hidden = isCovered(positions.get(element.dataset.token), fog);
      }
    }
    if (message.type === "camera") paintCamera(board, message.camera);
    if (message.type === "move") {
      const element = board.querySelector(`[data-token="${CSS.escape(message.token.id)}"]`);
      if (element) {
        positions.set(message.token.id, message.token);
        setPosition(element, message.token);
        element.hidden = isCovered(message.token, fog);
      }
    }
  });

  if (window.opener) post(window.opener, "ready");
  else empty.textContent = "Abra a projeção pelo painel do mestre.";

  const fullscreen = $("fullscreen");
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.body.requestFullscreen();
    } catch {
      fullscreen.querySelector("span").textContent = "Tela cheia indisponível";
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const active = Boolean(document.fullscreenElement);
    fullscreen.setAttribute("aria-pressed", active);
    fullscreen.querySelector("span").textContent = active ? "Sair da tela cheia" : "Tela cheia";
  });
}

async function importImage(file, portrait = false) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (portrait) {
      const signature = await file.slice(0, 6).text();
      if (signature === "GIF87a" || signature === "GIF89a") {
        // O canvas exporta apenas uma imagem estática. O token usa o GIF original.
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file.slice(0, file.size, "image/gif"));
        });
        return { image: data, ratio: image.naturalWidth / image.naturalHeight };
      }
    }
    const shortestSide = Math.min(image.naturalWidth, image.naturalHeight);
    const width = portrait ? shortestSide : image.naturalWidth;
    const height = portrait ? shortestSide : image.naturalHeight;
    const scale = Math.min(1, (portrait ? 256 : 1920) / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#101013";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/webp", .85);
    if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", .85);
    if (data.length > 600_000) data = canvas.toDataURL("image/jpeg", .65);
    return { image: data, ratio: canvas.width / canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function startMaster() {
  let state = initialState();
  let storageAvailable = true;
  let popupName = `umbra-${id()}`;
  let projection;
  let drag;
  let draggedToken;
  let fogMode = null;
  let fogDrag;
  let panMode = false;
  let panDrag;
  let rotationPreview;
  let notificationTimeout;
  let pendingDelete;

  const board = $("master-board");
  const mapViewport = board.parentElement;
  const panToggle = $("toggle-pan");
  const zoomIn = $("zoom-in");
  const zoomOut = $("zoom-out");
  const resetCamera = $("reset-camera");
  const mapRotation = $("map-rotation");
  const mapAngle = $("map-angle");
  const fogSelection = board.querySelector(".fog-selection");
  const fogToggle = $("toggle-fog");
  const sceneSelect = $("active-scene");
  const characterSelect = $("available-character");
  const monsterSelect = $("available-monster");
  const itemSelect = $("available-item");
  const tokenSizeTarget = $("token-size-target");
  const decreaseTokenSize = $("decrease-token-size");
  const increaseTokenSize = $("increase-token-size");
  const characterForm = $("character-form");
  const animationDialog = $("token-animation-dialog");
  const animationForm = $("token-animation-form");
  const monsterForm = $("monster-form");
  const itemForm = $("item-form");
  const professionForm = $("profession-form");
  const sceneForm = $("scene-form");
  const deleteForm = $("delete-form");

  try {
    const key = `${storageKey}-janela`;
    popupName = sessionStorage.getItem(key) ?? popupName;
    sessionStorage.setItem(key, popupName);
  } catch {
    // A projeção também funciona quando o armazenamento da aba está indisponível.
  }

  function notify(message, persistent = false) {
    const notice = $("notification");
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(notificationTimeout);
    if (!persistent) notificationTimeout = setTimeout(() => { notice.hidden = true; }, 4600);
  }

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) state = { monsters: [], items: defaultItems(), professions: [], ...JSON.parse(saved) };
    else localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    storageAvailable = false;
    const label = document.querySelector(".local-label");
    label.classList.add("storage-unavailable");
    label.lastChild.textContent = "Sessão temporária";
    notify("O navegador não conseguiu abrir o salvamento local. As alterações desta sessão são temporárias.", true);
  }

  function commit(next, form) {
    if (storageAvailable) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        const message = "Não foi possível salvar. Verifique o espaço do navegador ou use uma imagem menor.";
        if (form) formError(form, message);
        else notify(message);
        return false;
      }
    }
    state = next;
    return true;
  }

  const activeScene = () => state.scenes.find((scene) => scene.id === state.activeScene);
  const characterById = (key) => state.characters.find((character) => character.id === key);
  const monsterById = (key) => state.monsters.find((monster) => monster.id === key);
  const itemById = (key) => state.items.find((item) => item.id === key);

  function tokenForDisplay(scene, token) {
    const record = token.itemId ? itemById(token.itemId) : token.monsterId ? monsterById(token.monsterId) : characterById(token.id);
    if (!record) return null;
    const isCharacter = !token.monsterId && !token.itemId;
    const name = isCharacter ? record.name : `${record.name} #${token.number}`;
    const baseSize = scene.tokenScale ?? defaultTokenScale;
    const size = token.scale ?? defaultTokenScale;
    const display = { ...token, name, color: record.color, image: record.image, icon: record.icon, displayScale: baseSize * size / 10_000 };
    if (isCharacter) {
      const animation = record.animations?.find((entry) => entry.id === token.animationId);
      display.image = animation?.image ?? record.image;
      display.hasAnimations = Boolean(record.animations?.length);
      display.hp = record.hp;
      display.maxHp = record.maxHp;
    }
    return display;
  }

  function sceneForDisplay(scene) {
    if (!scene) return null;
    const tokens = scene.tokens.filter((token) => !token.hidden).map((token) => tokenForDisplay(scene, token)).filter(Boolean);
    const { id, name, image, ratio, grid, fog = [] } = scene;
    const preview = rotationPreview ?? panDrag;
    const camera = preview?.sceneId === id ? preview.camera : scene.camera;
    return { id, name, image, ratio, grid, tokens, fog, camera };
  }

  function showView(name) {
    if (name !== "mesa") {
      clearFogSelection();
      finishPan(false);
    }
    document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== name; });
    document.querySelectorAll("[data-view]").forEach((control) => {
      if (control.dataset.view === name) control.setAttribute("aria-current", "page");
      else control.removeAttribute("aria-current");
    });
  }

  function selectOptions(select, records, placeholder, selected = "") {
    const empty = new Option(placeholder, "");
    empty.disabled = true;
    select.replaceChildren(empty, ...records.map((record) => new Option(record.name, record.id)));
    select.value = records.some((record) => record.id === selected) ? selected : "";
  }

  function formError(form, message = "") {
    const error = form.querySelector(".form-error");
    error.textContent = message;
    error.hidden = !message;
  }

  function selectedImage(fields, original, portrait = false) {
    const file = fields.get("image");
    if (!file.size) return fields.has("removeImage") ? {} : { image: original?.image, ratio: original?.ratio };
    return importImage(file, portrait);
  }

  async function readFormImages(form, read, errorMessage = "Não foi possível ler a imagem. Tente usar um arquivo PNG, JPEG, WebP ou GIF.") {
    const submit = form.querySelector("[type=submit]");
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    formError(form);
    try {
      return await read();
    } catch {
      formError(form, errorMessage);
      return null;
    } finally {
      form.removeAttribute("aria-busy");
      submit.disabled = false;
    }
  }

  function openRecordForm(form, record, fields) {
    form.reset();
    form.dataset.id = record?.id ?? "";
    for (const [key, value] of Object.entries(fields)) form.elements.namedItem(key).value = value;
    const portrait = form.querySelector(".portrait-controls");
    if (portrait) {
      portrait.hidden = !record?.image;
      const preview = portrait.querySelector(".portrait-preview");
      if (record?.image) tokenFace(preview, record);
      else preview.replaceChildren();
    }
    formError(form);
    form.closest("dialog").showModal();
  }

  function editCharacter(character) {
    const options = $("character-professions");
    const labels = state.professions.map((profession) => {
      const label = make("label", "check-option");
      const input = make("input");
      input.type = "checkbox";
      input.name = "profession";
      input.value = profession.id;
      input.defaultChecked = character?.professionIds?.includes(profession.id) ?? false;
      label.append(input, profession.name);
      return label;
    });
    options.replaceChildren(...(labels.length ? labels : [make("p", "muted", "Cadastre etiquetas na aba Profissões.")]));
    const animations = $("character-animations");
    animations.replaceChildren(...(character?.animations ?? []).map((animation) => {
      const row = make("li");
      const remove = make("label", "check-option");
      const checkbox = make("input");
      checkbox.type = "checkbox";
      checkbox.name = "removeAnimation";
      checkbox.value = animation.id;
      checkbox.setAttribute("aria-label", `Remover GIF ${animation.name}`);
      remove.append(checkbox, "Remover");
      row.append(tokenFace(make("span", "token animation-preview"), { ...animation, color: character.color }), make("span", "", animation.name), remove);
      return row;
    }));
    animations.hidden = !animations.childElementCount;
    openRecordForm(characterForm, character, {
      name: character?.name ?? "", role: character?.role ?? "", hp: character?.hp ?? 10,
      maxHp: character?.maxHp ?? 10, color: character?.color ?? "#c5a9fb",
      attributes: character?.attributes ?? "", notes: character?.notes ?? "",
    });
  }

  function editMonster(monster) {
    openRecordForm(monsterForm, monster, { name: monster?.name ?? "", maxHp: monster?.maxHp ?? 10, color: monster?.color ?? "#ed9eaa" });
  }

  function editItem(item) {
    openRecordForm(itemForm, item, { name: item?.name ?? "", notes: item?.notes ?? "" });
  }

  function editProfession(profession) {
    openRecordForm(professionForm, profession, { name: profession?.name ?? "" });
  }

  function editScene(scene) {
    sceneForm.dataset.id = scene?.id ?? "";
    sceneForm.reset();
    for (const field of ["name", "intro", "notes"]) sceneForm.elements.namedItem(field).value = scene?.[field] ?? "";
    $("scene-image-help").textContent = scene ? "Selecione um arquivo apenas se quiser substituir o mapa atual." : "Escolha uma imagem do computador para usar como mapa.";
    formError(sceneForm);
    $("scene-dialog").showModal();
  }

  function askDelete(type, record) {
    pendingDelete = { type, id: record.id };
    $("delete-message").textContent = {
      characters: `Excluir a ficha de ${record.name}? O token será retirado de todos os cenários.`,
      monsters: `Excluir ${record.name} do catálogo? Todas as cópias serão retiradas dos cenários.`,
      items: `Excluir o item ${record.name}? Todas as cópias serão retiradas dos cenários.`,
      professions: `Excluir a profissão ${record.name}? A etiqueta será retirada das fichas associadas.`,
      scenes: `Excluir o cenário ${record.name} e as posições dos seus tokens?`,
    }[type];
    formError(deleteForm);
    $("delete-dialog").showModal();
  }

  function renderRecords() {
    const characters = state.characters.map((character) => {
      const card = make("article", "panel record-card");
      const title = make("div", "card-title");
      const identity = make("div");
      identity.append(make("h2", "", character.name));
      if (character.role) identity.append(make("p", "", character.role));
      title.append(tokenFace(make("span", "token"), character), identity);
      card.append(title, make("p", "", `Vida ${character.hp} / ${character.maxHp}`));
      const professions = state.professions.filter((profession) => character.professionIds?.includes(profession.id));
      if (professions.length) {
        const tags = make("div", "profession-tags");
        tags.setAttribute("aria-label", "Profissões");
        tags.append(...professions.map((profession) => make("span", "profession-tag", profession.name)));
        card.append(tags);
      }
      if (character.animations?.length) {
        const gallery = make("div", "animation-gallery");
        for (const animation of character.animations) {
          gallery.append(tokenFace(make("span", "token animation-preview"), { ...animation, color: character.color }));
        }
        card.append(gallery);
      }
      const actions = make("div", "card-actions");
      actions.append(button("Editar ficha", "button small", () => editCharacter(character)), button("Excluir", "button small", () => askDelete("characters", character)));
      card.append(actions);
      return card;
    });
    $("character-list").replaceChildren(...(characters.length ? characters : [make("p", "muted", "Nenhum personagem cadastrado.")]));

    const monsters = state.monsters.map((monster) => {
      const card = make("article", "panel record-card");
      const title = make("div", "card-title");
      title.append(tokenFace(make("span", "token"), monster), make("h2", "", monster.name));
      const actions = make("div", "card-actions");
      const place = button("Colocar na mesa", "button small primary", () => {
        if (placeCopy("monsterId", monster)) showView("mesa");
      });
      place.disabled = !activeScene();
      if (place.disabled) place.title = "Selecione um cenário na mesa.";
      actions.append(place, button("Editar", "button small", () => editMonster(monster)), button("Excluir", "button small", () => askDelete("monsters", monster)));
      card.append(title, make("p", "", `Vida máxima ${monster.maxHp}`), actions);
      return card;
    });
    $("monster-list").replaceChildren(...(monsters.length ? monsters : [make("p", "muted", "Nenhum monstro cadastrado.")]));

    const items = state.items.map((item) => {
      const card = make("article", "panel record-card");
      const title = make("div", "card-title");
      title.append(tokenFace(make("span", "token"), item), make("h2", "", item.name));
      card.append(title);
      if (item.notes) card.append(make("p", "", item.notes));
      const actions = make("div", "card-actions");
      const place = button("Colocar na mesa", "button small primary", () => {
        if (placeCopy("itemId", item)) showView("mesa");
      });
      place.disabled = !activeScene();
      if (place.disabled) place.title = "Selecione um cenário na mesa.";
      actions.append(place, button("Editar", "button small", () => editItem(item)), button("Excluir", "button small", () => askDelete("items", item)));
      card.append(actions);
      return card;
    });
    $("item-list").replaceChildren(...(items.length ? items : [make("p", "muted", "Nenhum item cadastrado.")]));

    const professions = state.professions.map((profession) => {
      const card = make("article", "panel record-card");
      const actions = make("div", "card-actions");
      actions.append(button("Editar", "button small", () => editProfession(profession)), button("Excluir", "button small", () => askDelete("professions", profession)));
      card.append(make("h2", "profession-tag", profession.name), actions);
      return card;
    });
    $("profession-list").replaceChildren(...(professions.length ? professions : [make("p", "muted", "Nenhuma profissão cadastrada.")]));

    const scenes = state.scenes.map((scene) => {
      const card = make("article", "panel record-card");
      const image = make("img", "record-image");
      image.src = scene.image;
      image.alt = "";
      image.loading = "lazy";
      const actions = make("div", "card-actions");
      const selected = scene.id === state.activeScene;
      actions.append(
        button(selected ? "Ver na mesa" : "Usar na mesa", "button small primary", () => {
          if (selected || activateScene(scene.id)) showView("mesa");
        }),
        button("Editar", "button small", () => editScene(scene)),
        button("Excluir", "button small", () => askDelete("scenes", scene))
      );
      card.append(image, make("h2", "", scene.name), actions);
      return card;
    });
    $("scene-list").replaceChildren(...(scenes.length ? scenes : [make("p", "muted", "Nenhum cenário cadastrado.")]));
  }

  function renderTable() {
    drag = undefined;
    draggedToken = undefined;
    clearFogSelection();
    finishPan(false);
    rotationPreview = undefined;
    const scene = activeScene();
    const display = sceneForDisplay(scene);
    paintBoard(board, $("master-empty"), display, true);
    selectOptions(sceneSelect, state.scenes, "Nenhum cenário", state.activeScene);
    sceneSelect.disabled = state.scenes.length === 0;
    $("edit-active-scene").disabled = !scene;
    $("toggle-grid").disabled = !scene;
    $("toggle-grid").setAttribute("aria-pressed", Boolean(scene?.grid));
    fogToggle.disabled = !scene;
    if (!scene) setFogMode(null);
    updateCameraControls(scene);
    const preview = $("scene-preview");
    if (scene && preview.getAttribute("src") !== scene.image) preview.src = scene.image;
    preview.hidden = !scene;

    const tokens = display?.tokens ?? [];
    const sizeTarget = tokenSizeTarget.value;
    tokenSizeTarget.replaceChildren(new Option("Todos os tokens", ""), ...tokens.map((token) => new Option(token.name, token.id)));
    if (tokens.some((token) => token.id === sizeTarget)) tokenSizeTarget.value = sizeTarget;
    updateTokenSizeControls(scene);

    const list = $("token-list");
    list.replaceChildren();
    $("token-count").textContent = tokens.length;
    for (const token of tokens) {
      const item = make("li", "token-entry");
      const info = make("span", "entry-info");
      const details = token.itemId ? "Item" : token.monsterId
        ? `Monstro · Vida máxima ${monsterById(token.monsterId).maxHp}`
        : `Vida ${token.hp} / ${token.maxHp}`;
      info.append(make("strong", "", token.name), make("span", "", details));
      const remove = button("×", "remove-token", () => {
        setTokenHidden(scene.id, token.id, true);
      });
      remove.setAttribute("aria-label", `Retirar ${token.name} da mesa`);
      item.append(tokenFace(make("span", "token"), token), info, remove);
      list.append(item);
    }
    if (!tokens.length) list.append(make("li", "muted", "Nenhum token neste cenário."));
    renderRetiredTokens(scene);
    const available = scene ? state.characters.filter((character) => !tokens.some((token) => token.id === character.id)) : [];
    selectOptions(characterSelect, available, scene ? "Adicionar personagem" : "Selecione um cenário", characterSelect.value);
    characterSelect.disabled = available.length === 0;
    $("add-token-form").querySelector("button").disabled = !characterSelect.value;
    const monsters = scene ? state.monsters : [];
    selectOptions(monsterSelect, monsters, scene ? "Colocar monstro" : "Selecione um cenário", monsterSelect.value);
    monsterSelect.disabled = monsters.length === 0;
    $("spawn-monster-form").querySelector("button").disabled = !monsterSelect.value;
    const items = scene ? state.items : [];
    selectOptions(itemSelect, items, scene ? "Colocar item" : "Selecione um cenário", itemSelect.value);
    itemSelect.disabled = items.length === 0;
    $("place-item-form").querySelector("button").disabled = !itemSelect.value;

    $("narrative").hidden = !scene;
    $("scene-intro").textContent = scene?.intro || "Nenhum texto de abertura neste cenário.";
    const notes = $("gm-notes");
    notes.hidden = !scene?.notes;
    notes.querySelector("p").textContent = scene?.notes ?? "";
    post(projection, "scene", { scene: display });
  }

  function renderRetiredTokens(scene) {
    const retired = scene?.tokens.filter((token) => token.hidden).map((token) => tokenForDisplay(scene, token)).filter(Boolean) ?? [];
    const details = $("retired-tokens");
    details.hidden = retired.length === 0;
    if (details.hidden) details.open = false;
    $("retired-token-count").textContent = retired.length;
    $("retired-token-list").replaceChildren(...retired.map((token) => {
      const item = make("li", "token-entry");
      const name = make("span", "entry-info", token.name);
      const restore = button("Recolocar", "button small", () => setTokenHidden(scene.id, token.id, false));
      restore.setAttribute("aria-label", `Recolocar ${token.name} na mesa`);
      item.append(name, restore);
      return item;
    }));
  }

  function selectedTokenForSize(scene) {
    return scene?.tokens.find((token) => !token.hidden && token.id === tokenSizeTarget.value);
  }

  function updateTokenSizeControls(scene) {
    const token = selectedTokenForSize(scene);
    const size = (token ? token.scale : scene?.tokenScale) ?? defaultTokenScale;
    tokenSizeTarget.disabled = !scene;
    decreaseTokenSize.disabled = !scene || size <= minTokenScale;
    increaseTokenSize.disabled = !scene || size >= maxTokenScale;
    $("token-size-value").textContent = `${size}%`;
    $("token-size-help").hidden = !token;
  }

  function resizeTokens(delta) {
    const scene = activeScene();
    if (!scene) return;
    const token = selectedTokenForSize(scene);
    const size = (token ? token.scale : scene.tokenScale) ?? defaultTokenScale;
    const next = Math.max(minTokenScale, Math.min(maxTokenScale, size + delta));
    if (size === next) return;
    if (token) updateToken(scene.id, token.id, { scale: next });
    else if (saveScene({ ...scene, tokenScale: next })) renderTable();
  }

  function setTokenHidden(sceneId, tokenId, hidden) {
    updateToken(sceneId, tokenId, { hidden });
  }

  function updateToken(sceneId, tokenId, fields, form) {
    const scene = activeScene();
    if (scene?.id !== sceneId || !scene.tokens.some((token) => token.id === tokenId)) return false;
    const tokens = scene.tokens.map((entry) => entry.id === tokenId ? { ...entry, ...fields } : entry);
    if (!saveScene({ ...scene, tokens }, form)) return false;
    renderTable();
    return true;
  }

  function chooseTokenAnimation(scene, token, character) {
    const animations = character.animations;
    const current = animations.find((entry) => entry.id === token.animationId)?.id ?? null;
    const options = [{ id: null, name: "Voltar ao retrato original", image: character.image }, ...animations];
    $("token-animation-character").textContent = character.name;
    $("token-animation-options").replaceChildren(...options.map((animation) => {
      const select = button(animation.name, "button", () => {
        if (!updateToken(scene.id, token.id, { animationId: animation.id }, animationForm)) return;
        animationDialog.close();
        board.querySelector(`[data-token="${CSS.escape(token.id)}"]`)?.focus();
      });
      const preview = tokenFace(make("span", "token animation-preview"), {
        name: animation.id ? animation.name : character.name, image: animation.image, color: character.color,
      });
      preview.setAttribute("aria-hidden", "true");
      select.prepend(preview);
      select.setAttribute("aria-pressed", animation.id === current);
      return select;
    }));
    formError(animationForm);
    animationDialog.showModal();
  }

  function render() {
    renderTable();
    renderRecords();
  }

  function saveScene(scene, form) {
    const exists = state.scenes.some((entry) => entry.id === scene.id);
    const scenes = exists ? state.scenes.map((entry) => entry.id === scene.id ? scene : entry) : [...state.scenes, scene];
    return commit({ ...state, scenes, activeScene: state.activeScene ?? scene.id }, form);
  }

  function activateScene(id) {
    if (!commit({ ...state, activeScene: id })) {
      sceneSelect.value = state.activeScene;
      return false;
    }
    render();
    return true;
  }

  function saveRecord(type, record, form, message) {
    const records = form.dataset.id ? state[type].map((entry) => entry.id === record.id ? record : entry) : [...state[type], record];
    if (commit({ ...state, [type]: records }, form)) {
      form.closest("dialog").close();
      render();
      notify(message);
    }
  }

  characterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (characterForm.hasAttribute("aria-busy")) return;
    const fields = new FormData(characterForm);
    const key = characterForm.dataset.id;
    const character = {
      id: key || id(),
      name: fields.get("name").trim(),
      role: fields.get("role").trim(),
      hp: Number(fields.get("hp")),
      maxHp: Number(fields.get("maxHp")),
      color: fields.get("color"),
      attributes: fields.get("attributes").trim(),
      notes: fields.get("notes").trim(),
      professionIds: fields.getAll("profession"),
    };
    if (!character.name) return formError(characterForm, "Informe o nome do personagem.");
    if (character.hp > character.maxHp) return formError(characterForm, "A vida atual deve ser igual ou menor que a vida máxima.");
    const original = characterById(key);
    const images = await readFormImages(characterForm, async () => {
      const portrait = await selectedImage(fields, original, true);
      const removed = new Set(fields.getAll("removeAnimation"));
      const animations = (original?.animations ?? []).filter((animation) => !removed.has(animation.id));
      for (const file of fields.getAll("animations").filter((entry) => entry.name)) {
        const { image } = await importImage(file, true);
        if (!image.startsWith("data:image/gif;")) throw new Error("O arquivo de animação precisa ser um GIF.");
        animations.push({ id: id(), name: file.name.slice(0, 100), image });
      }
      return { image: portrait.image, animations };
    }, "Não foi possível ler os retratos ou animações. Selecione arquivos GIF válidos para as animações.");
    if (images) saveRecord("characters", { ...character, ...images }, characterForm, "Ficha salva.");
  });

  monsterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (monsterForm.hasAttribute("aria-busy")) return;
    const fields = new FormData(monsterForm);
    const key = monsterForm.dataset.id;
    const name = fields.get("name").trim();
    if (!name) return formError(monsterForm, "Informe o nome do monstro.");
    const portrait = await readFormImages(monsterForm, () => selectedImage(fields, monsterById(key), true));
    if (portrait) {
      const monster = { id: key || id(), name, maxHp: Number(fields.get("maxHp")), color: fields.get("color"), image: portrait.image };
      saveRecord("monsters", monster, monsterForm, "Monstro salvo.");
    }
  });

  itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (itemForm.hasAttribute("aria-busy")) return;
    const fields = new FormData(itemForm);
    const key = itemForm.dataset.id;
    const name = fields.get("name").trim();
    if (!name) return formError(itemForm, "Informe o nome do item.");
    const previous = itemById(key);
    const portrait = await readFormImages(itemForm, () => selectedImage(fields, previous, true));
    if (!portrait) return;
    const item = { id: key || id(), name, notes: fields.get("notes").trim(), color: "#d6ad70", icon: previous?.icon, image: portrait.image };
    saveRecord("items", item, itemForm, "Item salvo.");
  });

  professionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const key = professionForm.dataset.id;
    const name = new FormData(professionForm).get("name").trim();
    if (!name) return formError(professionForm, "Informe o nome da profissão.");
    if (state.professions.some((entry) => entry.id !== key && entry.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      return formError(professionForm, "Já existe uma profissão com esse nome.");
    }
    saveRecord("professions", { id: key || id(), name }, professionForm, "Profissão salva.");
  });

  sceneForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sceneForm.hasAttribute("aria-busy")) return;
    const fields = new FormData(sceneForm);
    const original = state.scenes.find((scene) => scene.id === sceneForm.dataset.id);
    const name = fields.get("name").trim();
    const file = fields.get("image");
    if (!name) return formError(sceneForm, "Informe o nome do cenário.");
    if (!file.size && !original) return formError(sceneForm, "Escolha uma imagem para o mapa.");

    const map = await readFormImages(sceneForm, () => selectedImage(fields, original));
    if (!map) return;
    const scene = {
      id: original?.id ?? id(), name, ...map,
      intro: fields.get("intro").trim(), notes: fields.get("notes").trim(),
      grid: original?.grid ?? false, tokens: original?.tokens ?? [],
      tokenScale: original?.tokenScale,
      fog: original?.fog,
      camera: original?.camera && constrainCamera(original.camera, map.ratio),
    };
    if (saveScene(scene, sceneForm)) {
      $("scene-dialog").close();
      render();
      notify("Cenário salvo.");
    }
  });

  deleteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const { type, id } = pendingDelete;
    const next = { ...state, [type]: state[type].filter((record) => record.id !== id) };
    const tokenField = { characters: "id", monsters: "monsterId", items: "itemId" }[type];
    if (tokenField) {
      next.scenes = state.scenes.map((scene) => ({
        ...scene,
        tokens: scene.tokens.filter((token) => token[tokenField] !== id),
      }));
    } else if (type === "professions") {
      next.characters = state.characters.map((character) => character.professionIds?.includes(id)
        ? { ...character, professionIds: character.professionIds.filter((key) => key !== id) }
        : character);
    } else if (state.activeScene === id) {
      next.activeScene = next.scenes[0]?.id ?? null;
    }
    if (commit(next, deleteForm)) {
      $("delete-dialog").close();
      render();
      notify({ characters: "Ficha excluída.", monsters: "Monstro excluído.", items: "Item excluído.", professions: "Profissão excluída.", scenes: "Cenário excluído." }[type]);
    }
  });

  document.querySelectorAll("[data-view]").forEach((control) => control.addEventListener("click", () => showView(control.dataset.view)));
  document.querySelectorAll("[data-close]").forEach((control) => control.addEventListener("click", () => {
    const dialog = control.closest("dialog");
    if (!dialog.querySelector('form[aria-busy="true"]')) dialog.close();
  }));
  for (const form of [characterForm, monsterForm, itemForm, sceneForm]) {
    form.closest("dialog").addEventListener("cancel", (event) => { if (form.hasAttribute("aria-busy")) event.preventDefault(); });
  }
  $("new-character").addEventListener("click", () => editCharacter());
  $("new-table-character").addEventListener("click", () => editCharacter());
  $("new-monster").addEventListener("click", () => editMonster());
  $("new-item").addEventListener("click", () => editItem());
  $("open-monsters").addEventListener("click", () => showView("monstros"));
  $("new-profession").addEventListener("click", () => editProfession());
  $("new-scene").addEventListener("click", () => editScene());
  $("edit-active-scene").addEventListener("click", () => editScene(activeScene()));
  sceneSelect.addEventListener("change", () => activateScene(sceneSelect.value));
  characterSelect.addEventListener("change", () => { $("add-token-form").querySelector("button").disabled = !characterSelect.value; });
  monsterSelect.addEventListener("change", () => { $("spawn-monster-form").querySelector("button").disabled = !monsterSelect.value; });
  itemSelect.addEventListener("change", () => { $("place-item-form").querySelector("button").disabled = !itemSelect.value; });
  tokenSizeTarget.addEventListener("change", () => updateTokenSizeControls(activeScene()));
  decreaseTokenSize.addEventListener("click", () => resizeTokens(-tokenScaleStep));
  increaseTokenSize.addEventListener("click", () => resizeTokens(tokenScaleStep));

  $("toggle-grid").addEventListener("click", () => {
    const scene = activeScene();
    if (scene && saveScene({ ...scene, grid: !scene.grid })) renderTable();
  });
  zoomIn.addEventListener("click", () => changeZoom(mapZoomStep));
  zoomOut.addEventListener("click", () => changeZoom(-mapZoomStep));
  resetCamera.addEventListener("click", () => {
    saveCamera({ ...defaultCamera, rotation: activeScene()?.camera?.rotation ?? 0 });
  });
  mapRotation.addEventListener("input", () => {
    const scene = activeScene();
    if (!scene) return;
    finishPan(false);
    clearFogSelection();
    const rotation = Number(mapRotation.value);
    const camera = constrainCamera({ ...(scene.camera ?? defaultCamera), rotation }, scene.ratio);
    rotationPreview = { sceneId: scene.id, camera };
    updateRotationLabel(rotation);
    showCamera(scene.id, camera);
  });
  mapRotation.addEventListener("change", () => {
    if (rotationPreview && rotationPreview.sceneId === activeScene()?.id) saveCamera(rotationPreview.camera);
  });
  panToggle.addEventListener("click", () => setPanMode(!panMode));
  fogToggle.addEventListener("click", () => setFogMode(fogMode ? null : "cover"));
  document.querySelectorAll("[data-fog-mode]").forEach((control) => {
    control.addEventListener("click", () => setFogMode(control.dataset.fogMode));
  });

  function addToken(scene, token) {
    const positions = Array.from({ length: 25 }, (_, index) => ({ x: .28 + (index % 5) * .11, y: .28 + Math.floor(index / 5) * .11 }));
    const occupied = scene.tokens.filter((entry) => !entry.hidden);
    const position = positions.find((point) => occupied.every((entry) => Math.hypot(entry.x - point.x, entry.y - point.y) > .065)) ?? { x: .5, y: .5 };
    if (!saveScene({ ...scene, tokens: [...scene.tokens, { ...token, ...position }] })) return false;
    render();
    return true;
  }

  function placeCopy(reference, record) {
    const scene = activeScene();
    if (!scene || !record) return false;
    const usedNumbers = new Set(scene.tokens.filter((token) => token[reference] === record.id).map((token) => token.number));
    let number = 1;
    while (usedNumbers.has(number)) number++;
    return addToken(scene, { id: id(), [reference]: record.id, number });
  }

  $("add-token-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const scene = activeScene();
    const character = characterById(characterSelect.value);
    if (!scene || !character) return;
    const existing = scene.tokens.find((token) => token.id === character.id);
    if (existing) {
      if (existing.hidden) setTokenHidden(scene.id, existing.id, false);
      return;
    }
    addToken(scene, { id: character.id });
  });
  $("spawn-monster-form").addEventListener("submit", (event) => {
    event.preventDefault();
    placeCopy("monsterId", monsterById(monsterSelect.value));
  });
  $("place-item-form").addEventListener("submit", (event) => {
    event.preventDefault();
    placeCopy("itemId", itemById(itemSelect.value));
  });

  document.querySelectorAll("[data-die]").forEach((control) => control.addEventListener("click", () => {
    const faces = Number(control.dataset.die);
    const result = 1 + Math.floor(Math.random() * faces);
    $("dice-result").replaceChildren(`d${faces} · `, make("strong", "", result));
  }));

  $("open-projection").addEventListener("click", () => {
    if (!projection || projection.closed) projection = window.open("projecao.html", popupName, "popup,width=1080,height=720");
    if (!projection) return notify("O navegador bloqueou a janela. Permita pop-ups e tente abrir a projeção novamente.");
    projection.focus();
    post(projection, "scene", { scene: sceneForDisplay(activeScene()) });
  });
  window.addEventListener("message", (event) => {
    if (fromPeer(event, projection) && event.data.type === "ready") post(projection, "scene", { scene: sceneForDisplay(activeScene()) });
  });

  function previewMove(sceneId, element, token) {
    setPosition(element, token);
    post(projection, "move", { sceneId, token });
  }

  function clamp(value, margin) {
    const safeMargin = Math.min(margin, .5);
    return Math.max(safeMargin, Math.min(1 - safeMargin, value));
  }

  function boardGeometry() {
    const bounds = board.getBoundingClientRect();
    const transform = getComputedStyle(board).transform;
    const { a, b, c, d } = new DOMMatrixReadOnly(transform === "none" ? undefined : transform);
    return {
      x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
      width: board.offsetWidth, height: board.offsetHeight, scale: Math.hypot(a, b),
      inverse: new DOMMatrixReadOnly([a, b, c, d, 0, 0]).inverse(),
    };
  }

  function mapVector(dx, dy, geometry) {
    const point = geometry.inverse.transformPoint({ x: dx, y: dy });
    return { x: point.x / geometry.width, y: point.y / geometry.height };
  }

  function mapPoint(event, geometry) {
    const point = mapVector(event.clientX - geometry.x, event.clientY - geometry.y, geometry);
    return { x: .5 + point.x, y: .5 + point.y };
  }

  function constrain(geometry, element, position) {
    const radius = element.offsetWidth / 2;
    return { ...position, x: clamp(position.x, radius / geometry.width), y: clamp(position.y, radius / geometry.height) };
  }

  function savePosition(scene, token) {
    return saveScene({ ...scene, tokens: scene.tokens.map((entry) => entry.id === token.id ? { ...entry, x: token.x, y: token.y } : entry) });
  }

  function clearFogSelection() {
    if (fogDrag && board.hasPointerCapture(fogDrag.pointer)) board.releasePointerCapture(fogDrag.pointer);
    fogDrag = undefined;
    fogSelection.hidden = true;
  }

  function setFogMode(mode) {
    clearFogSelection();
    if (mode && panMode) setPanMode(false);
    fogMode = mode;
    fogToggle.setAttribute("aria-pressed", Boolean(mode));
    board.classList.toggle("fog-editing", Boolean(mode));
    fogSelection.classList.toggle("reveal", mode === "reveal");
    $("fog-tools").hidden = !mode;
    updateMapHints();
    document.querySelectorAll("[data-fog-mode]").forEach((control) => {
      control.setAttribute("aria-pressed", control.dataset.fogMode === mode);
    });
  }

  function updateMapHints() {
    $("token-hint").hidden = Boolean(fogMode) || panMode;
    $("fog-hint").hidden = !fogMode;
    $("pan-hint").hidden = !panMode;
  }

  function setPanMode(enabled) {
    finishPan(false);
    if (enabled && fogMode) setFogMode(null);
    panMode = enabled;
    panToggle.setAttribute("aria-pressed", enabled);
    mapViewport.classList.toggle("pan-enabled", enabled);
    updateMapHints();
  }

  function updateCameraControls(scene) {
    const zoom = scene?.camera?.zoom ?? defaultCamera.zoom;
    zoomIn.disabled = !scene || zoom >= maxMapZoom;
    zoomOut.disabled = !scene || zoom <= 1;
    resetCamera.disabled = zoom <= 1;
    panToggle.disabled = zoom <= 1;
    $("map-zoom").textContent = `${Math.round(zoom * 100)}%`;
    mapRotation.disabled = !scene;
    const rotation = scene?.camera?.rotation ?? 0;
    mapRotation.value = rotation;
    updateRotationLabel(rotation);
    if (zoom <= 1 && panMode) setPanMode(false);
  }

  function updateRotationLabel(rotation) {
    mapAngle.textContent = `${rotation}°`;
    mapRotation.setAttribute("aria-valuetext", `${rotation} graus`);
  }

  function constrainCamera({ x, y, zoom, rotation = 0 }, ratio) {
    if (zoom === 1) return { ...defaultCamera, rotation };
    const { cos, sin, width, height, scale } = cameraDimensions(zoom, rotation, ratio);
    // Distância do centro até a borda da janela ao longo de cada eixo do mapa.
    const marginX = Math.min(cameraFrameRatio / cos, 1 / sin) / (2 * width * scale);
    const marginY = Math.min(cameraFrameRatio / sin, 1 / cos) / (2 * height * scale);
    return {
      zoom, rotation,
      x: clamp(x, marginX),
      y: clamp(y, marginY),
    };
  }

  function showCamera(sceneId, camera) {
    paintCamera(board, camera);
    post(projection, "camera", { sceneId, camera });
  }

  function saveCamera(camera) {
    const scene = activeScene();
    if (!scene) return;
    finishPan(false);
    rotationPreview = undefined;
    const next = { ...scene, camera };
    if (!saveScene(next)) {
      showCamera(scene.id, scene.camera ?? defaultCamera);
      updateCameraControls(scene);
      return;
    }
    showCamera(scene.id, camera);
    updateCameraControls(next);
  }

  function changeZoom(delta) {
    const scene = activeScene();
    if (!scene) return;
    const camera = scene.camera ?? defaultCamera;
    const zoom = Math.max(1, Math.min(maxMapZoom, camera.zoom + delta));
    if (zoom === camera.zoom) return;
    saveCamera(constrainCamera({ ...camera, zoom }, scene.ratio));
  }

  function finishPan(commit) {
    if (!panDrag) return;
    const { pointer, sceneId, initial, camera } = panDrag;
    panDrag = undefined;
    mapViewport.classList.remove("is-panning");
    if (mapViewport.hasPointerCapture(pointer)) mapViewport.releasePointerCapture(pointer);
    const scene = activeScene();
    if (scene?.id !== sceneId || camera === initial) return;
    if (!commit || !saveScene({ ...scene, camera })) showCamera(sceneId, scene.camera ?? defaultCamera);
  }

  mapViewport.addEventListener("pointerdown", (event) => {
    if (!panMode || event.button !== 0 || panDrag || drag) return;
    const scene = activeScene();
    if (!scene) return;
    const geometry = boardGeometry();
    const initial = scene.camera ?? defaultCamera;
    panDrag = { pointer: event.pointerId, sceneId: scene.id, ratio: scene.ratio, initial, camera: initial, geometry, x: event.clientX, y: event.clientY };
    event.preventDefault();
    mapViewport.setPointerCapture(event.pointerId);
    mapViewport.classList.add("is-panning");
  });

  function movePan(event) {
    const { initial, geometry, x, y, ratio, sceneId } = panDrag;
    const delta = mapVector(event.clientX - x, event.clientY - y, geometry);
    const camera = constrainCamera({
      ...initial,
      x: initial.x - delta.x,
      y: initial.y - delta.y,
    }, ratio);
    if (camera.x === panDrag.camera.x && camera.y === panDrag.camera.y) return;
    panDrag.camera = camera;
    showCamera(sceneId, camera);
  }

  mapViewport.addEventListener("pointermove", (event) => {
    if (event.pointerId === panDrag?.pointer) movePan(event);
  });

  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    mapViewport.addEventListener(event, (pointerEvent) => {
      if (pointerEvent.pointerId !== panDrag?.pointer) return;
      if (event === "pointerup") movePan(pointerEvent);
      finishPan(event === "pointerup");
    });
  }

  function fogPoint(event) {
    const { x, y } = mapPoint(event, boardGeometry());
    return { x: clamp(x, 0), y: clamp(y, 0) };
  }

  function fogArea(start, end) {
    return {
      left: Math.min(start.x, end.x), top: Math.min(start.y, end.y),
      right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y),
    };
  }

  function finishFog(event) {
    const { start, sceneId } = fogDrag;
    clearFogSelection();
    const scene = activeScene();
    if (event.type !== "pointerup" || scene?.id !== sceneId) return;
    const area = fogArea(start, fogPoint(event));
    if (area.right - area.left < .003 || area.bottom - area.top < .003) return;
    const fog = (scene.fog ?? []).flatMap((existing) => subtractFogArea(existing, area));
    if (fogMode === "cover") fog.push(area);
    if (!saveScene({ ...scene, fog })) return;
    paintFog(board, fog);
    post(projection, "fog", { sceneId, fog });
  }

  board.addEventListener("pointerdown", (event) => {
    if (panMode || event.button !== 0 || drag || fogDrag) return;
    const scene = activeScene();
    if (!scene) return;
    if (fogMode) {
      event.preventDefault();
      fogDrag = { pointer: event.pointerId, start: fogPoint(event), sceneId: scene.id };
      board.setPointerCapture(event.pointerId);
      return;
    }
    const element = event.target.closest("button[data-token]");
    if (!element) return;
    draggedToken = undefined;
    const token = scene.tokens.find((entry) => entry.id === element.dataset.token);
    const point = mapPoint(event, boardGeometry());
    drag = {
      pointer: event.pointerId, element, sceneId: scene.id, original: token, position: token,
      startX: event.clientX, startY: event.clientY,
      offsetX: point.x - token.x,
      offsetY: point.y - token.y,
    };
    element.setPointerCapture(event.pointerId);
  });

  board.addEventListener("pointermove", (event) => {
    if (fogDrag?.pointer === event.pointerId) {
      placeFogArea(fogSelection, fogArea(fogDrag.start, fogPoint(event)));
      fogSelection.hidden = false;
      return;
    }
    if (!drag || event.pointerId !== drag.pointer) return;
    if (drag.position === drag.original && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    const geometry = boardGeometry();
    if (!geometry.width || !geometry.height) return;
    const point = mapPoint(event, geometry);
    drag.element.classList.add("is-dragging");
    drag.position = constrain(geometry, drag.element, {
      id: drag.original.id,
      x: point.x - drag.offsetX,
      y: point.y - drag.offsetY,
    });
    previewMove(drag.sceneId, drag.element, drag.position);
  });

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const { sceneId, original, position, element } = drag;
    drag = undefined;
    element.classList.remove("is-dragging");
    const scene = activeScene();
    if (scene?.id !== sceneId || !board.contains(element) || position === original) return;
    draggedToken = element;
    if (event.type !== "pointerup" || !savePosition(scene, position)) previewMove(sceneId, element, original);
  }

  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    board.addEventListener(event, (pointerEvent) => {
      if (fogDrag?.pointer === pointerEvent.pointerId) finishFog(pointerEvent);
      else finishDrag(pointerEvent);
    });
  }

  board.addEventListener("click", (event) => {
    const element = event.target.closest('button[data-token][aria-haspopup="dialog"]');
    if (panMode || fogMode || !element || (event.detail > 0 && element === draggedToken)) return;
    const scene = activeScene();
    const token = scene?.tokens.find((entry) => entry.id === element.dataset.token);
    if (!token || token.hidden || token.monsterId || token.itemId) return;
    const character = characterById(token.id);
    if (character?.animations?.length) chooseTokenAnimation(scene, token, character);
  });

  board.addEventListener("keydown", (event) => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    const element = event.target.closest("button[data-token]");
    if (panMode || fogMode || !element || !Array.isArray(direction) || drag) return;
    event.preventDefault();
    const scene = activeScene();
    const token = scene.tokens.find((entry) => entry.id === element.dataset.token);
    const geometry = boardGeometry();
    const step = .02 * geometry.width * geometry.scale;
    const delta = mapVector(direction[0] * step, direction[1] * step, geometry);
    const position = constrain(geometry, element, {
      id: token.id,
      x: token.x + delta.x,
      y: token.y + delta.y,
    });
    if (savePosition(scene, position)) previewMove(scene.id, element, position);
  });

  render();
}

if (document.body.hasAttribute("data-projection")) startProjection();
else startMaster();
