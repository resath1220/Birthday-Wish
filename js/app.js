(() => {
  "use strict";

  const form = document.getElementById("wishForm");
  const wishList = document.getElementById("wishList");
  const statusText = document.getElementById("formStatus");
  const floatingWishes = document.getElementById("floatingWishes");
  const audio = document.getElementById("birthdayAudio");
  const MAX_FLOATING_WISHES = 12;

  // Credentials live in js/config.js (publishable key only, RLS must stay on).
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.APP_CONFIG || {};
  const configured = Boolean(
    window.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY &&
    !SUPABASE_URL.includes("YOUR_PROJECT")
  );
  const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
  const COOLDOWN_MS = 30000;

  function createWishCard(name, message) {
    const card = document.createElement("article");
    card.className = "wish-card";

    const text = document.createElement("p");
    text.textContent = message;

    const sender = document.createElement("small");
    sender.textContent = "— " + name;

    card.append(text, sender);
    wishList.prepend(card);
  }

  function floatWish(name, message) {
    const bubble = document.createElement("div");
    bubble.className = "floating-wish";

    const text = document.createElement("span");
    const shortMessage = message.length > 105
      ? message.slice(0, 102) + "…"
      : message;
    text.textContent = "“" + shortMessage + "”";

    const sender = document.createElement("strong");
    sender.textContent = "— " + name;

    bubble.append(text, sender);
    bubble.style.left = (4 + Math.random() * 76) + "%";
    bubble.style.setProperty("--float-duration", (17 + Math.random() * 10) + "s");
    bubble.style.setProperty("--float-drift", (-35 + Math.random() * 70) + "px");
    bubble.addEventListener("animationend", () => bubble.remove(), { once: true });

    floatingWishes.appendChild(bubble);
    while (floatingWishes.children.length > MAX_FLOATING_WISHES) {
      floatingWishes.firstElementChild.remove();
    }
  }

  async function loadWishes() {
    if (!db) {
      statusText.textContent = "Wish wall is not configured yet. See README → Supabase setup.";
      return;
    }
    const { data, error } = await db
      .from("wishes")
      .select("sender, message")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      statusText.textContent = "Birthday wishes are temporarily unavailable. Please try again later.";
      console.error("Supabase load error:", error);
      return;
    }

    (data || []).forEach(wish => createWishCard(wish.sender, wish.message));
    (data || []).slice(-6).forEach(wish => floatWish(wish.sender, wish.message));
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("sender").value.trim();
    const message = document.getElementById("messageInput").value.trim();

    if (!name || !message) {
      statusText.textContent = "Please enter your name and a birthday wish.";
      return;
    }
    if (name.length > 40 || message.length > 240) {
      statusText.textContent = "Please keep your name under 40 characters and your wish under 240.";
      return;
    }

    if (!db) {
      statusText.textContent = "Wish wall is not configured yet.";
      return;
    }
    let last = 0;
    try { last = Number(localStorage.getItem("lastWishAt") || 0); } catch (_) {}
    if (Date.now() - last < COOLDOWN_MS) {
      statusText.textContent = "Please wait a few seconds before sending another wish.";
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    statusText.textContent = "Sending your wish...";

    const { error } = await db
      .from("wishes")
      .insert([{ sender: name, message: message }]);

    submitButton.disabled = false;

    if (error) {
      statusText.textContent = "Your wish could not be sent. Please try again.";
      console.error("Supabase insert error:", error);
      return;
    }

    try { localStorage.setItem("lastWishAt", String(Date.now())); } catch (_) {}
    createWishCard(name, message);
    floatWish(name, message);
    statusText.textContent = "Your wish has been shared with everyone! ♡";
    form.reset();
  });

  loadWishes();

  // Try autoplay immediately. Browsers may block audible autoplay until
  // the visitor interacts with the page, so retry silently on first gesture.
  let musicStarted = false;
  async function startBackgroundMusic() {
    if (musicStarted || !audio.paused) return;
    try {
      await audio.play();
      musicStarted = true;
      window.removeEventListener("pointerdown", startBackgroundMusic);
      window.removeEventListener("keydown", startBackgroundMusic);
      window.removeEventListener("touchstart", startBackgroundMusic);
    } catch (error) {
      // Autoplay can be blocked by browser policy or the song file may be missing.
    }
  }

  startBackgroundMusic();
  window.addEventListener("pointerdown", startBackgroundMusic, { once: true });
  window.addEventListener("keydown", startBackgroundMusic, { once: true });
  window.addEventListener("touchstart", startBackgroundMusic, { once: true, passive: true });

})();
