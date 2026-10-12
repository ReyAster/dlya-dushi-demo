"use strict";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ======================================================================
   Фото (Unsplash, примеры). Замените на настоящие работы студии.
   ====================================================================== */
const U = (id) => `https://images.unsplash.com/photo-${id}?q=80&w=900&auto=format&fit=crop`;
const SLIDES = [
  { src: U("1487530811176-3780de880c2d"), title: "Тёмный сад", caption: "Розы, ягоды и сухоцветы на глубоком фоне.", alt: "Объёмный букет из садовых роз, ягод и фиолетовых цветов" },
  { src: U("1563241527-3004b7be0ffd"), title: "Персиковое утро", caption: "Мягкая пастель в крафте с лентой.", alt: "Букет из персиковых роз и зелени в крафтовой бумаге" },
  { src: U("1561181286-d3fee7d55364"), title: "Весенние тюльпаны", caption: "Розовые тюльпаны в стеклянной вазе.", alt: "Розовые тюльпаны в стеклянной вазе" },
  { src: U("1582794543139-8ac9cb0f7b11"), title: "Пионовое облако", caption: "Крупные пионы нежного розового цвета.", alt: "Крупные розовые пионы" },
  { src: U("1457089328109-e5d9bd499191"), title: "Вечерний бордо", caption: "Алые розы и анемоны на тёмном фоне.", alt: "Тёмная композиция с красными розами и анемонами" },
  { src: U("1526047932273-341f2a7631f9"), title: "Подарок в ладонях", caption: "Яркий мини-букет на розовом.", alt: "Руки держат яркий букет на розовом фоне" },
  { src: U("1455659817273-f96807779a8a"), title: "Солнечный день", caption: "Подсолнухи для хорошего настроения.", alt: "Букет подсолнухов" },
  { src: U("1518895949257-7621c3c786d7"), title: "Одна роза", caption: "Минимализм: один цветок и стекло.", alt: "Одна розовая роза в стеклянной вазе" },
  { src: U("1496062031456-07b8f162a322"), title: "Алая роза", caption: "Роза с каплями росы.", alt: "Красная роза с каплями росы" },
];

/* ======================================================================
   Reveal on scroll
   ====================================================================== */
(function reveal() {
  const els = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
})();

/* ======================================================================
   Card deck carousel (порт card-deck-carousel.tsx на чистый JS)
   Верхнюю карточку можно бросить в любую сторону, она улетает и
   возвращается в низ стопки.
   ====================================================================== */
const wrap = (i, n) => (n ? ((i % n) + n) % n : 0);
const pad2 = (n) => (n < 10 ? "0" + n : String(n));

function deckPose(depth, tilt, noTilt) {
  const d = Math.min(depth, 3);
  return {
    y: d ? -d * 16 : 0,
    scale: 1 - d * 0.055,
    rot: depth === 0 || noTilt ? 0 : tilt,
    opacity: depth > 3 ? 0 : 1,
    shade: 1 - d * 0.07,
  };
}
function tiltFor(i, max) {
  const u = ((((i + 1) * 2654435761) >>> 0) / 4294967296);
  return (u * 2 - 1) * max;
}
function isThrow(dx, vx, w) {
  return Math.abs(dx) > w * 0.28 || (Math.abs(vx) > 0.55 && Math.abs(dx) > 24);
}

const ARROW_L = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.4"/></svg>';
const ARROW_R = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" stroke-width="1.4"/></svg>';

function createDeck(host, slides, { start = 0, scatter = 8, autoplay = 4600, autoplayDelay = 0 } = {}) {
  const n = slides.length;
  host.classList.add("deck-wrap");
  host.tabIndex = 0;
  host.setAttribute("role", "region");
  host.setAttribute("aria-roledescription", "carousel");
  host.setAttribute("aria-label", "Примеры букетов");
  host.innerHTML =
    '<div class="cd-deck"></div>' +
    '<div class="cd-meta">' +
    `<button type="button" class="cd-btn" data-prev aria-label="Предыдущий букет">${ARROW_L}</button>` +
    '<div class="cd-cap" aria-hidden="true"></div>' +
    `<button type="button" class="cd-btn" data-next aria-label="Следующий букет">${ARROW_R}</button>` +
    "</div>" +
    '<div class="sr" aria-live="polite"></div>';

  const deck = host.querySelector(".cd-deck");
  const cap = host.querySelector(".cd-cap");
  const live = host.querySelector(".sr");
  const cards = slides.map((s, i) => {
    const c = document.createElement("div");
    c.className = "cd-card";
    const img = new Image();
    img.src = s.src;
    img.alt = s.alt || s.title || "";
    img.draggable = false;
    img.decoding = "async";
    c.appendChild(img);
    deck.appendChild(c);
    return c;
  });

  let top = start;
  let over = null;
  let busy = false;
  let lastTouch = 0;
  let shownTop = -1;
  const later = (fn, ms) => window.setTimeout(fn, ms);

  function render() {
    cards.forEach((c, i) => {
      const depth = wrap(i - top, n);
      const p = deckPose(depth, tiltFor(i, scatter), reduce);
      const o = over && over.i === i ? over : null;
      const isTop = depth === 0;
      c.dataset.top = isTop ? "1" : "0";
      c.dataset.mode = o ? o.mode : "";
      c.style.transform = o
        ? `translate(${o.x}px,${o.y}px) rotate(${o.r}deg)`
        : `translateY(${p.y}px) scale(${p.scale}) rotate(${p.rot.toFixed(2)}deg)`;
      c.style.zIndex = o ? n + 1 : n - depth;
      c.style.opacity = o ? 1 : p.opacity;
      c.style.filter = o || isTop ? "none" : `brightness(${p.shade})`;
      c.setAttribute("aria-hidden", isTop ? "false" : "true");
    });
    if (shownTop !== top) {
      shownTop = top;
      const s = slides[top];
      cap.innerHTML = `<span class="cd-title"></span><span class="cd-sub"></span>`;
      cap.firstChild.textContent = s.title || "";
      cap.lastChild.textContent = s.caption || "";
      live.textContent = `Букет ${top + 1} из ${n}: ${s.title || ""}`;
    }
  }

  function throwTop(dirX, fromX = 0, fromY = 0, dirY = 0) {
    if (busy || n < 2) return;
    busy = true;
    const w = deck.offsetWidth || 360;
    const sx = dirX >= 0 ? 1 : -1;
    over = { i: top, x: fromX + sx * w * 1.25, y: fromY + dirY * 0.4 - 40, r: sx * 16, mode: "fly" };
    render();
    later(() => {
      over = null;
      top = wrap(top + 1, n);
      busy = false;
      render();
    }, reduce ? 200 : 430);
  }

  function pullBack() {
    if (busy || n < 2) return;
    busy = true;
    const w = deck.offsetWidth || 360;
    const i = wrap(top - 1, n);
    over = { i, x: -w * 1.25, y: -40, r: -16, mode: "snap" };
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      over = { i, x: 0, y: 0, r: 0, mode: "fly" };
      render();
      later(() => {
        over = null;
        top = i;
        busy = false;
        render();
      }, reduce ? 200 : 450);
    }));
  }

  const touch = () => { lastTouch = performance.now(); };

  host.querySelector("[data-prev]").addEventListener("click", () => { touch(); pullBack(); });
  host.querySelector("[data-next]").addEventListener("click", () => { touch(); throwTop(1); });
  host.addEventListener("keydown", (e) => {
    if (e.target !== host) return;
    touch();
    if (e.key === "ArrowRight") throwTop(1);
    else if (e.key === "ArrowLeft") pullBack();
    else return;
    e.preventDefault();
  });

  // drag the top card
  let drag = null;
  deck.addEventListener("pointerdown", (e) => {
    touch();
    const card = e.target.closest(".cd-card");
    if (!card || card.dataset.top !== "1") return;
    if (busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    card.setPointerCapture(e.pointerId);
    drag = { card, x: e.clientX, y: e.clientY, lx: e.clientX, lt: e.timeStamp, vx: 0 };
  });
  deck.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dt = Math.max(1, e.timeStamp - drag.lt);
    drag.vx = 0.8 * ((e.clientX - drag.lx) / dt) + 0.2 * drag.vx;
    drag.lx = e.clientX;
    drag.lt = e.timeStamp;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    over = { i: top, x: dx, y: dy, r: reduce ? 0 : dx * 0.05, mode: "drag" };
    render();
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    touch();
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const w = deck.offsetWidth || 360;
    if (isThrow(dx, d.vx, w)) throwTop(dx, dx, dy, dy);
    else { over = null; render(); }
  };
  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);

  // autoplay: пауза, пока карусель не видна, вкладка скрыта или с ней взаимодействуют
  if (autoplay && !reduce && n > 1) {
    let seen = false;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(host);
    later(() => {
      window.setInterval(() => {
        if (!seen || document.hidden || host.offsetParent === null) return;
        if (performance.now() - lastTouch < autoplay) return;
        throwTop(1);
      }, autoplay);
    }, autoplayDelay);
  }

  render();
}

(function initDecks() {
  const wrapEl = document.getElementById("decks");
  if (!wrapEl) return;
  const n = SLIDES.length;
  const offsets = [0, 3, 6];
  offsets.forEach((off, k) => {
    const host = document.createElement("div");
    wrapEl.appendChild(host);
    // каждая стопка стартует с разного фото и листает в своё время
    createDeck(host, SLIDES, { start: off % n, scatter: 8 + k, autoplay: 5200, autoplayDelay: k * 1700 });
  });
})();

/* ======================================================================
   Бутон -> цветок. t от 0 (бутон) до 1 (полностью раскрыт)
   ====================================================================== */
const flower = (function buildFlower() {
  const svg = document.getElementById("flower");
  if (!svg) return { set() {} };
  const NS = "http://www.w3.org/2000/svg";
  const CX = 100, CY = 150;
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    (parent || svg).appendChild(el);
    return el;
  };

  // стебель и листья
  mk("path", { d: `M${CX} ${CY} C ${CX - 3} 195, ${CX + 5} 228, ${CX} 266`, fill: "none", stroke: "#151112", "stroke-width": 2.6, "stroke-linecap": "round" });
  const leaves = [
    { x: 101, y: 214, flip: 1, rot: -38 },
    { x: 100, y: 190, flip: -1, rot: 40 },
  ].map((l) => {
    const g = mk("g", { transform: `translate(${l.x} ${l.y}) scale(${l.flip} 1) rotate(${l.rot * 0.35})` });
    const p = mk("path", { d: "M0 0 C 14 -10 34 -10 46 -26 C 30 -30 8 -22 0 0Z", fill: "#151112", class: "leaf" }, g);
    p.style.transformOrigin = "0 0";
    return p;
  });

  // слои лепестков: от дальнего к ближнему
  const PETAL = "M0 0 C -24 -18 -28 -66 0 -96 C 28 -66 24 -18 0 0Z";
  const layers = [
    { angles: [-78, -52, -26, 0, 26, 52, 78], len: 1.0, fill: "#4a0f20" },
    { angles: [-64, -38, -13, 13, 38, 64], len: 0.82, fill: "#5e1527" },
    { angles: [-48, -24, 0, 24, 48], len: 0.64, fill: "#7a1e36" },
    { angles: [-24, 0, 24], len: 0.44, fill: "#9a3149" },
  ].map((L) => {
    const petals = L.angles.map((a) => {
      const g = mk("g", { transform: `translate(${CX} ${CY})` });
      const p = mk("path", { d: PETAL, fill: L.fill, stroke: "#fbf9f6", "stroke-opacity": 0.35, "stroke-width": 0.8, class: "petal" }, g);
      p.dataset.angle = a;
      return p;
    });
    return { ...L, petals };
  });

  // тычинки
  const stamens = mk("g", { class: "stamen", opacity: 0 });
  [[-9, -4], [0, -10], [9, -4], [-4, 2], [5, 3]].forEach(([dx, dy]) => {
    mk("circle", { cx: CX + dx, cy: CY + dy - 8, r: 2.4, fill: "#f3e3d3" }, stamens);
  });

  // чашелистики у основания бутона
  mk("path", { d: `M${CX} ${CY + 4} C ${CX - 14} ${CY - 4}, ${CX - 16} ${CY - 18}, ${CX - 9} ${CY - 26} C ${CX - 6} ${CY - 12}, ${CX - 2} ${CY - 4}, ${CX} ${CY + 4}Z`, fill: "#151112" });
  mk("path", { d: `M${CX} ${CY + 4} C ${CX + 14} ${CY - 4}, ${CX + 16} ${CY - 18}, ${CX + 9} ${CY - 26} C ${CX + 6} ${CY - 12}, ${CX + 2} ${CY - 4}, ${CX} ${CY + 4}Z`, fill: "#151112" });

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => 1 - Math.pow(1 - v, 2.2);

  function set(t) {
    // Шаги 0, 1/4, 2/4, 3/4 дают лишь частичное раскрытие,
    // полностью цветок раскрывается только при t = 1 (после 4-го ответа).
    const o = Math.pow(clamp(t), 1.6);
    layers.forEach((L, k) => {
      L.petals.forEach((p) => {
        const a = parseFloat(p.dataset.angle);
        const rot = a * (0.1 + 0.9 * o);
        const sx = 0.72 + 0.28 * o;
        const sy = L.len * (0.86 + 0.14 * o);
        p.style.transform = `rotate(${rot}deg) scale(${sx}, ${sy})`;
        p.style.transitionDelay = `${k * 0.35}s`;
      });
    });
    leaves.forEach((p) => {
      const s = 0.35 + 0.65 * ease(t);
      p.style.transform = `scale(${s})`;
    });
    stamens.setAttribute("opacity", t >= 0.99 ? 1 : 0);
  }
  set(0);
  return { set };
})();

/* ======================================================================
   Анкета: вопросы по одному, бутон раскрывается с каждым ответом
   ====================================================================== */
(function quiz() {
  const form = document.getElementById("quiz");
  if (!form) return;

  // Анкеты сохраняет server.py в SQLite (leads.db)
  const ENDPOINT = "/api/leads";
  // Демо-режим (GitHub Pages или ?demo=1): анкета работает, но никуда не отправляется
  const DEMO = /\.github\.io$/.test(location.hostname) || new URLSearchParams(location.search).has("demo");
  if (DEMO) {
    document.getElementById("demo-note").hidden = false;
    document.getElementById("consent").hidden = true;
    document.getElementById("credits").hidden = false;
    document.querySelectorAll(".demo-only").forEach((el) => { el.hidden = false; });
    form.querySelector(".done-text").textContent = "Это тестовая анкета: ваши ответы никуда не отправлены и нигде не сохранены.";
  }

  const steps = [...form.querySelectorAll("fieldset.step")];
  const done = document.getElementById("done");
  const next = document.getElementById("next");
  const back = document.getElementById("back");
  const actions = document.getElementById("actions");
  const cur = document.getElementById("qp-cur");
  const total = steps.length;
  const OUT_MS = reduce ? 200 : 800;

  const validators = {
    name: (v) => (v.trim().length >= 2 ? "" : "Подскажите, как к вам обращаться."),
    phone: (v) => (v.replace(/\D/g, "").length >= 10 ? "" : "Проверьте номер: нужно минимум 10 цифр."),
    palette: (v) => (v.trim().length >= 2 ? "" : "Опишите гамму или выберите вариант ниже."),
    date: (v) => (v.trim().length >= 2 ? "" : "Напишите дату, например 14 февраля."),
  };

  let idx = 0;
  let locked = false;
  const answers = {};

  function show(i, focus = true) {
    const el = steps[i];
    el.classList.remove("out");
    el.classList.add("in");
    cur.textContent = String(i + 1).padStart(2, "0");
    back.hidden = i === 0;
    next.textContent = i === total - 1 ? "Отправить" : "Дальше";
    if (focus) setTimeout(() => el.querySelector("input")?.focus({ preventScroll: true }), 350);
  }

  function hide(i, cb) {
    const el = steps[i];
    el.classList.remove("in");
    el.classList.add("out");
    setTimeout(() => {
      el.classList.remove("out");
      cb && cb();
    }, OUT_MS);
  }

  function go(to) {
    locked = true;
    hide(idx, () => {
      idx = to;
      show(idx);
      flower.set(idx / total);
      locked = false;
    });
  }

  async function finish() {
    locked = true;
    next.disabled = true;
    const errEl = steps[idx].querySelector(".err");
    try {
      if (DEMO) {
        await new Promise((r) => setTimeout(r, 400));
      } else {
        const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
        if (!res.ok) throw new Error("HTTP " + res.status);
      }
    } catch (err) {
      console.error("Не удалось сохранить анкету", err);
      errEl.textContent = "Не удалось отправить анкету. Проверьте, что сервер запущен (start.bat), и попробуйте ещё раз.";
      next.disabled = false;
      locked = false;
      return;
    }
    flower.set(1);
    actions.classList.add("hide");
    hide(idx, () => {
      document.getElementById("done-name").textContent = answers.name;
      done.classList.add("in");
      done.focus({ preventScroll: true });
      document.querySelector(".quiz-progress").style.visibility = "hidden";
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (locked) return;
    const step = steps[idx];
    const key = step.dataset.name;
    const input = step.querySelector("input");
    const msg = validators[key](input.value);
    const errEl = step.querySelector(".err");
    errEl.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) { input.focus({ preventScroll: true }); return; }
    answers[key] = input.value.trim();
    if (idx === total - 1) finish();
    else go(idx + 1);
  });

  back.addEventListener("click", () => { if (!locked && idx > 0) go(idx - 1); });

  form.querySelectorAll(".chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => {
      const input = form.querySelector("#f-palette");
      form.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      input.value = chip.textContent;
      form.querySelector('[data-name="palette"] .err').textContent = "";
    });
  });
  form.querySelector("#f-palette").addEventListener("input", () => {
    form.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
  });

  // Только в демо: пройти анкету ещё раз
  const again = document.getElementById("again");
  if (DEMO) {
    again.hidden = false;
    again.addEventListener("click", () => {
      done.classList.remove("in");
      form.querySelectorAll("input").forEach((i) => { i.value = ""; i.removeAttribute("aria-invalid"); });
      form.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      form.querySelectorAll(".err").forEach((e) => { e.textContent = ""; });
      Object.keys(answers).forEach((k) => delete answers[k]);
      document.querySelector(".quiz-progress").style.visibility = "";
      actions.classList.remove("hide");
      next.disabled = false;
      flower.set(0);
      idx = 0;
      locked = false;
      setTimeout(() => show(0), reduce ? 0 : 500);
    });
  }

  show(0, false);
})();
