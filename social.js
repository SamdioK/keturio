/* =========================================================
   KETURIO STAGE 3 — SOCIAL LAYER
   ---------------------------------------------------------
   Features:
   • Feed
   • Create posts
   • Like / Love / Laugh / Wow reactions
   • Delete own posts
   • People discovery
   • Search people
   • @username / Keturio ID
   • Follow / Unfollow
   • Moments
   • My Profile
   • Edit profile
   • Bio
   • Follower / Following counts
   • Mobile-friendly social interface

   This file works alongside the existing app.js.
========================================================= */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =========================================================
   CONFIG
========================================================= */

const cfg = window.KETURIO_CONFIG || {};

const SUPABASE_URL =
  cfg.SUPABASE_URL ||
  cfg.supabaseUrl ||
  "";

const SUPABASE_KEY =
  cfg.SUPABASE_PUBLISHABLE_KEY ||
  cfg.SUPABASE_ANON_KEY ||
  cfg.supabaseKey ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Keturio Social: Supabase configuration was not found."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   STATE
========================================================= */

let socialUser = null;
let socialProfile = null;
let socialProfiles = [];

let activeSocialTab = "feed";

let socialRoot = null;

let socialLoading = false;

let peopleSearchTerm = "";

let socialInitialized = false;


/* =========================================================
   BASIC HELPERS
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function initials(value) {

  const text =
    String(value || "K")
      .trim();

  if (!text) {
    return "K";
  }

  const parts =
    text
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


function formatDate(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


function timeAgo(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  const now =
    Date.now();

  const difference =
    Math.max(
      0,
      now - date.getTime()
    );

  const seconds =
    Math.floor(
      difference / 1000
    );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(dateValue);
}


function showSocialToast(message) {

  const existing =
    document.getElementById("toast");

  if (existing) {

    existing.textContent =
      message;

    existing.classList.add(
      "show"
    );

    clearTimeout(
      existing.__keturioTimer
    );

    existing.__keturioTimer =
      setTimeout(() => {

        existing.classList.remove(
          "show"
        );

      }, 2400);

    return;
  }

  const toast =
    document.createElement("div");

  toast.className =
    "toast show";

  toast.textContent =
    message;

  document.body.appendChild(
    toast
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

    setTimeout(() => {
      toast.remove();
    }, 250);

  }, 2400);
}


function setSocialLoading(value) {

  socialLoading =
    Boolean(value);

  if (!socialRoot) {
    return;
  }

  const loader =
    socialRoot.querySelector(
      ".ket-social-loader"
    );

  if (loader) {
    loader.classList.toggle(
      "hidden",
      !socialLoading
    );
  }
}


/* =========================================================
   CURRENT USER
========================================================= */

async function getMe() {

  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (error) {

    console.error(
      "Keturio Social getUser:",
      error
    );

    return null;
  }

  socialUser =
    data?.user || null;

  return socialUser;
}


/* =========================================================
   PROFILE
========================================================= */

async function ensureProfile() {

  if (!socialUser) {
    await getMe();
  }

  if (!socialUser) {
    return null;
  }

  const {
    data,
    error
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", socialUser.id)
    .maybeSingle();

  if (error) {

    console.error(
      "Keturio Social profile:",
      error
    );

    return null;
  }

  socialProfile =
    data || null;

  return socialProfile;
}


/* =========================================================
   SOCIAL CSS
========================================================= */

function injectSocialStyles() {

  if (
    document.getElementById(
      "keturio-social-styles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "keturio-social-styles";

  style.textContent = `

    .ket-social-shell {
      position: fixed;
      inset: 0;
      z-index: 9000;
      background: var(--bg, #080b12);
      color: var(--text, #f4f7ff);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .ket-social-shell.open {
      display: flex;
    }

    .ket-social-header {
      height: 70px;
      min-height: 70px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--line, rgba(255,255,255,.08));
      background: var(--panel2, #0c111c);
    }

    .ket-social-header-title {
      flex: 1;
      min-width: 0;
    }

    .ket-social-header-title strong {
      display: block;
      font-size: 18px;
    }

    .ket-social-header-title span {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: var(--muted, #8d9bb8);
    }

    .ket-social-icon {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 12px;
      background: rgba(255,255,255,.05);
      color: var(--text, #fff);
      cursor: pointer;
      font-size: 18px;
    }

    .ket-social-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .ket-social-tabs {
      display: flex;
      gap: 6px;
      padding: 10px 14px;
      overflow-x: auto;
      border-bottom: 1px solid var(--line, rgba(255,255,255,.08));
      background: var(--panel2, #0c111c);
      scrollbar-width: none;
    }

    .ket-social-tabs::-webkit-scrollbar {
      display: none;
    }

    .ket-social-tab {
      flex: 0 0 auto;
      border: 0;
      border-radius: 12px;
      padding: 9px 13px;
      background: rgba(255,255,255,.045);
      color: var(--muted, #8d9bb8);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .ket-social-tab.active {
      background: linear-gradient(
        135deg,
        var(--accent, #7c5cff),
        var(--accent2, #00d4ff)
      );
      color: #fff;
    }

    .ket-social-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .ket-social-container {
      width: min(760px, 100%);
      margin: 0 auto;
    }

    .ket-social-card {
      border: 1px solid var(--line, rgba(255,255,255,.08));
      background: var(--panel, #101522);
      border-radius: 20px;
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: 0 12px 35px rgba(0,0,0,.12);
    }

    .ket-social-composer textarea {
      width: 100%;
      min-height: 105px;
      resize: vertical;
      border: 1px solid var(--line, rgba(255,255,255,.08));
      outline: none;
      border-radius: 15px;
      padding: 13px;
      background: rgba(255,255,255,.035);
      color: var(--text, #fff);
      font: inherit;
    }

    .ket-social-composer textarea:focus {
      border-color: rgba(124,92,255,.65);
    }

    .ket-social-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ket-social-space {
      flex: 1;
    }

    .ket-social-primary {
      border: 0;
      border-radius: 12px;
      padding: 10px 16px;
      background: linear-gradient(
        135deg,
        var(--accent, #7c5cff),
        var(--accent2, #00d4ff)
      );
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

    .ket-social-secondary {
      border: 1px solid var(--line, rgba(255,255,255,.08));
      border-radius: 12px;
      padding: 9px 13px;
      background: rgba(255,255,255,.035);
      color: var(--text, #fff);
      cursor: pointer;
    }

    .ket-social-danger {
      border: 1px solid rgba(255,113,133,.25);
      border-radius: 12px;
      padding: 8px 12px;
      background: rgba(255,113,133,.08);
      color: #ff7185;
      cursor: pointer;
    }

    .ket-post-head {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 12px;
    }

    .ket-avatar {
      width: 44px;
      height: 44px;
      min-width: 44px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: linear-gradient(
        135deg,
        var(--accent, #7c5cff),
        var(--accent2, #00d4ff)
      );
      color: #fff;
      font-weight: 900;
      overflow: hidden;
    }

    .ket-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ket-post-author {
      flex: 1;
      min-width: 0;
    }

    .ket-post-author strong {
      display: block;
      font-size: 14px;
    }

    .ket-post-author span {
      display: block;
      margin-top: 3px;
      color: var(--muted, #8d9bb8);
      font-size: 11px;
    }

    .ket-post-content {
      font-size: 14px;
      line-height: 1.55;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 9px 0 14px;
    }

    .ket-post-image {
      width: 100%;
      max-height: 480px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 12px;
    }

    .ket-post-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 10px;
      border-top: 1px solid var(--line, rgba(255,255,255,.08));
    }

    .ket-reaction {
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 7px 10px;
      background: rgba(255,255,255,.04);
      color: var(--muted, #8d9bb8);
      cursor: pointer;
      font-size: 12px;
    }

    .ket-reaction:hover,
    .ket-reaction.active {
      background: rgba(124,92,255,.16);
      border-color: rgba(124,92,255,.35);
      color: #fff;
    }

    .ket-people-search {
      width: 100%;
      border: 1px solid var(--line, rgba(255,255,255,.08));
      outline: none;
      border-radius: 14px;
      padding: 12px 14px;
      background: rgba(255,255,255,.035);
      color: var(--text, #fff);
      margin-bottom: 14px;
    }

    .ket-person {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 11px 0;
      border-bottom: 1px solid var(--line, rgba(255,255,255,.08));
    }

    .ket-person:last-child {
      border-bottom: 0;
    }

    .ket-person-info {
      flex: 1;
      min-width: 0;
    }

    .ket-person-info strong {
      display: block;
      font-size: 14px;
    }

    .ket-person-info span {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      color: var(--muted, #8d9bb8);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ket-empty {
      text-align: center;
      padding: 45px 20px;
      color: var(--muted, #8d9bb8);
    }

    .ket-empty .emoji {
      font-size: 38px;
      margin-bottom: 10px;
    }

    .ket-empty h3 {
      color: var(--text, #fff);
      margin: 5px 0 7px;
    }

    .ket-profile-hero {
      text-align: center;
      padding: 10px 0 20px;
    }

    .ket-profile-avatar {
      width: 82px;
      height: 82px;
      margin: 0 auto 12px;
      display: grid;
      place-items: center;
      border-radius: 25px;
      background: linear-gradient(
        135deg,
        var(--accent, #7c5cff),
        var(--accent2, #00d4ff)
      );
      color: #fff;
      font-size: 25px;
      font-weight: 900;
      overflow: hidden;
    }

    .ket-profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ket-profile-hero h2 {
      margin: 0;
    }

    .ket-profile-username {
      color: var(--muted, #8d9bb8);
      font-size: 13px;
      margin-top: 4px;
    }

    .ket-profile-bio {
      max-width: 520px;
      margin: 12px auto;
      line-height: 1.5;
      font-size: 13px;
      color: var(--muted, #8d9bb8);
    }

    .ket-profile-stats {
      display: flex;
      justify-content: center;
      gap: 35px;
      margin: 18px 0;
    }

    .ket-profile-stat strong {
      display: block;
      font-size: 18px;
    }

    .ket-profile-stat span {
      color: var(--muted, #8d9bb8);
      font-size: 10px;
    }

    .ket-field {
      display: block;
      margin: 13px 0;
    }

    .ket-field span {
      display: block;
      margin-bottom: 6px;
      color: var(--muted, #8d9bb8);
      font-size: 11px;
    }

    .ket-field input,
    .ket-field textarea {
      width: 100%;
      border: 1px solid var(--line, rgba(255,255,255,.08));
      outline: none;
      border-radius: 12px;
      padding: 11px 12px;
      background: rgba(255,255,255,.035);
      color: var(--text, #fff);
      font: inherit;
    }

    .ket-field textarea {
      min-height: 90px;
      resize: vertical;
    }

    .ket-moment {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 12px;
      background:
        radial-gradient(
          circle at top right,
          rgba(0,212,255,.18),
          transparent 45%
        ),
        radial-gradient(
          circle at bottom left,
          rgba(124,92,255,.22),
          transparent 45%
        ),
        var(--panel, #101522);
      border: 1px solid var(--line, rgba(255,255,255,.08));
    }

    .ket-moment-time {
      color: var(--muted, #8d9bb8);
      font-size: 10px;
      margin-top: 5px;
    }

    .ket-moment-content {
      margin-top: 13px;
      line-height: 1.5;
      font-size: 14px;
      white-space: pre-wrap;
    }

    .ket-social-loader {
      text-align: center;
      padding: 10px;
      color: var(--muted, #8d9bb8);
      font-size: 11px;
    }

    .ket-social-loader.hidden {
      display: none;
    }

    .ket-social-close {
      margin-left: auto;
    }

    @media (min-width: 900px) {

      .ket-social-content {
        padding: 24px;
      }

      .ket-social-tabs {
        justify-content: center;
      }

    }

    @media (max-width: 600px) {

      .ket-social-header {
        height: 62px;
        min-height: 62px;
      }

      .ket-social-content {
        padding: 12px;
      }

      .ket-social-card {
        border-radius: 17px;
        padding: 14px;
      }

      .ket-profile-stats {
        gap: 25px;
      }

    }

  `;

  document.head.appendChild(
    style
  );
}


/* =========================================================
   SOCIAL ROOT
========================================================= */

function createSocialRoot() {

  if (
    document.getElementById(
      "keturioSocialShell"
    )
  ) {

    socialRoot =
      document.getElementById(
        "keturioSocialShell"
      );

    return socialRoot;
  }

  injectSocialStyles();

  socialRoot =
    document.createElement("section");

  socialRoot.id =
    "keturioSocialShell";

  socialRoot.className =
    "ket-social-shell";

  socialRoot.innerHTML = `

    <header class="ket-social-header">

      <button
        class="ket-social-icon"
        id="ketSocialBack"
        type="button"
        aria-label="Back"
      >
        ‹
      </button>

      <div class="ket-social-header-title">

        <strong>
          Keturio
        </strong>

        <span>
          Connect. Chat. Belong.
        </span>

      </div>

      <button
        class="ket-social-icon"
        id="ketSocialRefresh"
        type="button"
        aria-label="Refresh"
      >
        ↻
      </button>

      <button
        class="ket-social-icon ket-social-close"
        id="ketSocialClose"
        type="button"
        aria-label="Close"
      >
        ×
      </button>

    </header>

    <div class="ket-social-body">

      <nav
        class="ket-social-tabs"
        id="ketSocialTabs"
      >

        <button
          class="ket-social-tab active"
          data-social-tab="feed"
          type="button"
        >
          📰 Feed
        </button>

        <button
          class="ket-social-tab"
          data-social-tab="people"
          type="button"
        >
          👥 People
        </button>

        <button
          class="ket-social-tab"
          data-social-tab="moments"
          type="button"
        >
          ✨ Moments
        </button>

        <button
          class="ket-social-tab"
          data-social-tab="profile"
          type="button"
        >
          👤 My Profile
        </button>

      </nav>

      <div
        class="ket-social-loader hidden"
        id="ketSocialLoader"
      >
        Loading Keturio…
      </div>

      <div
        class="ket-social-content"
        id="ketSocialContent"
      ></div>

    </div>

  `;

  document.body.appendChild(
    socialRoot
  );

  bindSocialRootEvents();

  return socialRoot;
}


/* =========================================================
   ROOT EVENTS
========================================================= */

function bindSocialRootEvents() {

  if (!socialRoot) {
    return;
  }

  const closeButton =
    socialRoot.querySelector(
      "#ketSocialClose"
    );

  const backButton =
    socialRoot.querySelector(
      "#ketSocialBack"
    );

  const refreshButton =
    socialRoot.querySelector(
      "#ketSocialRefresh"
    );

  closeButton?.addEventListener(
    "click",
    closeSocial
  );

  backButton?.addEventListener(
    "click",
    closeSocial
  );

  refreshButton?.addEventListener(
    "click",
    () => {
      renderSocial(
        activeSocialTab
      );
    }
  );

  socialRoot
    .querySelectorAll(
      "[data-social-tab]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const tab =
            button.dataset.socialTab;

          openSocialTab(
            tab
          );

        }
      );

    });

  window.addEventListener(
    "keturio:open-social",
    () => {
      openSocial();
    }
  );
}


/* =========================================================
   OPEN / CLOSE SOCIAL
========================================================= */

async function openSocial(
  tab = "feed"
) {

  if (!socialRoot) {
    createSocialRoot();
  }

  if (!socialRoot) {
    return;
  }

  await getMe();

  if (!socialUser) {

    showSocialToast(
      "Please log in to use Keturio Social."
    );

    return;
  }

  socialRoot.classList.add(
    "open"
  );

  document.body.style.overflow =
    "hidden";

  activeSocialTab =
    tab;

  updateSocialTabButtons();

  await renderSocial(
    activeSocialTab
  );
}


function closeSocial() {

  if (!socialRoot) {
    return;
  }

  socialRoot.classList.remove(
    "open"
  );

  document.body.style.overflow =
    "";

  const chatApp =
    document.getElementById(
      "chatApp"
    );

  if (
    chatApp &&
    window.innerWidth <= 760
  ) {
    chatApp.classList.remove(
      "in-chat"
    );
  }
}


async function openSocialTab(
  tab
) {

  activeSocialTab =
    tab;

  updateSocialTabButtons();

  await renderSocial(
    tab
  );
}


function updateSocialTabButtons() {

  if (!socialRoot) {
    return;
  }

  socialRoot
    .querySelectorAll(
      "[data-social-tab]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.socialTab ===
          activeSocialTab
      );

    });
}


/* =========================================================
   MAIN RENDER
========================================================= */

async function renderSocial(
  tab
) {

  if (!socialRoot) {
    createSocialRoot();
  }

  const content =
    socialRoot?.querySelector(
      "#ketSocialContent"
    );

  if (!content) {
    return;
  }

  setSocialLoading(true);

  try {

    await ensureProfile();

    if (tab === "feed") {
      await renderFeed(content);
    }

    else if (tab === "people") {
      await renderPeople(content);
    }

    else if (tab === "moments") {
      await renderMoments(content);
    }

    else if (tab === "profile") {
      await renderProfile(content);
    }

  } catch (error) {

    console.error(
      "Keturio Social render:",
      error
    );

    content.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          ⚠️
        </div>

        <h3>
          Something went wrong
        </h3>

        <p>
          ${escapeHtml(
            error?.message ||
            "Unable to load this section."
          )}
        </p>

      </div>

    `;

  } finally {

    setSocialLoading(false);

  }
}


/* =========================================================
   FEED
========================================================= */

async function renderFeed(
  container
) {

  container.innerHTML = `

    <div class="ket-social-container">

      <div class="ket-social-card ket-social-composer">

        <div class="ket-post-head">

          <div class="ket-avatar">

            ${
              socialProfile?.avatar_url
                ? `
                  <img
                    src="${escapeHtml(
                      socialProfile.avatar_url
                    )}"
                    alt=""
                  >
                `
                : escapeHtml(
                    initials(
                      socialProfile?.display_name ||
                      "Keturio"
                    )
                  )
            }

          </div>

          <div class="ket-post-author">

            <strong>
              ${escapeHtml(
                socialProfile?.display_name ||
                socialUser?.email ||
                "Keturio User"
              )}
            </strong>

            <span>
              What's happening?
            </span>

          </div>

        </div>

        <textarea
          id="ketPostInput"
          maxlength="5000"
          placeholder="Share something with Keturio…"
        ></textarea>

        <div
          class="ket-social-row"
          style="margin-top:10px"
        >

          <span class="ket-social-space"></span>

          <button
            class="ket-social-primary"
            id="ketCreatePost"
            type="button"
          >
            Post
          </button>

        </div>

      </div>

      <div id="ketFeedList"></div>

    </div>

  `;

  const createButton =
    container.querySelector(
      "#ketCreatePost"
    );

  createButton?.addEventListener(
    "click",
    createPost
  );

  await loadFeedPosts();
}


async function loadFeedPosts() {

  const list =
    socialRoot?.querySelector(
      "#ketFeedList"
    );

  if (!list) {
    return;
  }

  list.innerHTML = `

    <div class="ket-empty">

      <div class="emoji">
        📰
      </div>

      <h3>
        Loading Feed
      </h3>

      <p>
        Getting the latest Keturio posts…
      </p>

    </div>

  `;

  const {
    data: posts,
    error
  } = await supabase
    .from("posts")
    .select(`
      id,
      author_id,
      content,
      image_url,
      created_at,
      updated_at
    `)
    .order(
      "created_at",
      {
        ascending: false
      }
    )
    .limit(50);

  if (error) {

    console.error(
      "Keturio Feed:",
      error
    );

    list.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          ⚠️
        </div>

        <h3>
          Feed unavailable
        </h3>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>

    `;

    return;
  }

  if (!posts?.length) {

    list.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          ✨
        </div>

        <h3>
          Your Feed is empty
        </h3>

        <p>
          Be the first person to post something on Keturio.
        </p>

      </div>

    `;

    return;
  }

  const authorIds =
    [
      ...new Set(
        posts.map(
          post =>
            post.author_id
        )
      )
    ];

  const {
    data: profiles
  } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      username,
      avatar_url
    `)
    .in(
      "id",
      authorIds
    );

  const profileMap =
    new Map(
      (profiles || []).map(
        profile => [
          profile.id,
          profile
        ]
      )
    );

  const postIds =
    posts.map(
      post => post.id
    );

  const {
    data: reactions
  } = await supabase
    .from("post_reactions")
    .select(`
      post_id,
      user_id,
      reaction
    `)
    .in(
      "post_id",
      postIds
    );

  const reactionMap =
    new Map();

  for (
    const reaction
    of reactions || []
  ) {

    if (
      !reactionMap.has(
        reaction.post_id
      )
    ) {
      reactionMap.set(
        reaction.post_id,
        []
      );
    }

    reactionMap
      .get(reaction.post_id)
      .push(reaction);

  }

  list.innerHTML =
    posts.map(
      post => {

        const author =
          profileMap.get(
            post.author_id
          ) || {};

        const postReactions =
          reactionMap.get(
            post.id
          ) || [];

        return renderPost(
          post,
          author,
          postReactions
        );

      }
    ).join("");

  bindPostActions(
    list
  );
}


/* =========================================================
   POST HTML
========================================================= */

function renderPost(
  post,
  author,
  reactions
) {

  const displayName =
    author.display_name ||
    "Keturio User";

  const username =
    author.username
      ? `@${author.username}`
      : "";

  const avatar =
    author.avatar_url
      ? `
        <img
          src="${escapeHtml(
            author.avatar_url
          )}"
          alt=""
        >
      `
      : escapeHtml(
          initials(
            displayName
          )
        );

  const reactionTypes = [
    ["like", "👍"],
    ["love", "❤️"],
    ["laugh", "😂"],
    ["wow", "😮"]
  ];

  const isMine =
    socialUser &&
    post.author_id ===
      socialUser.id;

  const counts =
    {};

  for (
    const reaction
    of reactions
  ) {

    counts[
      reaction.reaction
    ] =
      (
        counts[
          reaction.reaction
        ] || 0
      ) + 1;

  }

  return `

    <article
      class="ket-social-card ket-post"
      data-post-id="${escapeHtml(
        post.id
      )}"
    >

      <div class="ket-post-head">

        <div class="ket-avatar">

          ${avatar}

        </div>

        <div class="ket-post-author">

          <strong>
            ${escapeHtml(
              displayName
            )}
          </strong>

          <span>
            ${
              username
                ? escapeHtml(
                    username
                  ) + " · "
                : ""
            }
            ${escapeHtml(
              timeAgo(
                post.created_at
              )
            )}
          </span>

        </div>

        ${
          isMine
            ? `
              <button
                class="ket-social-danger"
                data-post-action="delete"
                type="button"
              >
                Delete
              </button>
            `
            : ""
        }

      </div>

      <div class="ket-post-content">

        ${escapeHtml(
          post.content
        )}

      </div>

      ${
        post.image_url
          ? `
            <img
              class="ket-post-image"
              src="${escapeHtml(
                post.image_url
              )}"
              alt="Post image"
            >
          `
          : ""
      }

      <div class="ket-post-actions">

        ${reactionTypes.map(
          ([type, emoji]) => {

            const active =
              reactions.some(
                reaction =>
                  reaction.user_id ===
                    socialUser?.id &&
                  reaction.reaction ===
                    type
              );

            const count =
              counts[type] || 0;

            return `

              <button
                class="ket-reaction ${
                  active
                    ? "active"
                    : ""
                }"
                data-post-action="react"
                data-reaction="${type}"
                type="button"
              >
                ${emoji}
                ${
                  count
                    ? ` ${count}`
                    : ""
                }
              </button>

            `;

          }
        ).join("")}

      </div>

    </article>

  `;
}


/* =========================================================
   CREATE POST
========================================================= */

async function createPost() {

  if (!socialUser) {
    await getMe();
  }

  if (!socialUser) {

    showSocialToast(
      "Please log in first."
    );

    return;
  }

  const input =
    socialRoot?.querySelector(
      "#ketPostInput"
    );

  if (!input) {
    return;
  }

  const content =
    input.value.trim();

  if (!content) {

    showSocialToast(
      "Write something before posting."
    );

    input.focus();

    return;
  }

  if (content.length > 5000) {

    showSocialToast(
      "Your post is too long."
    );

    return;
  }

  const button =
    socialRoot.querySelector(
      "#ketCreatePost"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Posting…";
  }

  try {

    const {
      error
    } = await supabase
      .from("posts")
      .insert({
        author_id:
          socialUser.id,
        content
      });

    if (error) {
      throw error;
    }

    input.value =
      "";

    showSocialToast(
      "Post published."
    );

    await loadFeedPosts();

  } catch (error) {

    console.error(
      "Keturio create post:",
      error
    );

    showSocialToast(
      error.message ||
      "Unable to publish post."
    );

  } finally {

    if (button) {
      button.disabled =
        false;
      button.textContent =
        "Post";
    }

  }
}


/* =========================================================
   POST ACTIONS
========================================================= */

function bindPostActions(
  container
) {

  container
    .querySelectorAll(
      "[data-post-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const post =
            button.closest(
              "[data-post-id]"
            );

          if (!post) {
            return;
          }

          const postId =
            post.dataset.postId;

          const action =
            button.dataset.postAction;

          if (
            action === "react"
          ) {

            await toggleReaction(
              postId,
              button.dataset.reaction
            );

          }

          if (
            action === "delete"
          ) {

            await deletePost(
              postId
            );

          }

        }
      );

    });
}


/* =========================================================
   REACTION
========================================================= */

async function toggleReaction(
  postId,
  reaction
) {

  if (!socialUser) {
    return;
  }

  try {

    const {
      data: existing,
      error: findError
    } = await supabase
      .from("post_reactions")
      .select(`
        post_id,
        user_id,
        reaction
      `)
      .eq(
        "post_id",
        postId
      )
      .eq(
        "user_id",
        socialUser.id
      )
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (
      existing &&
      existing.reaction ===
        reaction
    ) {

      const {
        error
      } = await supabase
        .from("post_reactions")
        .delete()
        .eq(
          "post_id",
          postId
        )
        .eq(
          "user_id",
          socialUser.id
        );

      if (error) {
        throw error;
      }

    } else if (existing) {

      const {
        error
      } = await supabase
        .from("post_reactions")
        .update({
          reaction
        })
        .eq(
          "post_id",
          postId
        )
        .eq(
          "user_id",
          socialUser.id
        );

      if (error) {
        throw error;
      }

    } else {

      const {
        error
      } = await supabase
        .from("post_reactions")
        .insert({
          post_id:
            postId,
          user_id:
            socialUser.id,
          reaction
        });

      if (error) {
        throw error;
      }

    }

    await loadFeedPosts();

  } catch (error) {

    console.error(
      "Keturio reaction:",
      error
    );

    showSocialToast(
      error.message ||
      "Unable to update reaction."
    );

  }
}


/* =========================================================
   DELETE POST
========================================================= */

async function deletePost(
  postId
) {

  if (!socialUser) {
    return;
  }

  const confirmed =
    window.confirm(
      "Delete this post?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const {
      error
    } = await supabase
      .from("posts")
      .delete()
      .eq(
        "id",
        postId
      )
      .eq(
        "author_id",
        socialUser.id
      );

    if (error) {
      throw error;
    }

    showSocialToast(
      "Post deleted."
    );

    await loadFeedPosts();

  } catch (error) {

    console.error(
      "Keturio delete post:",
      error
    );

    showSocialToast(
      error.message ||
      "Unable to delete post."
    );

  }
}


/* =========================================================
   PEOPLE
========================================================= */

async function renderPeople(
  container
) {

  container.innerHTML = `

    <div class="ket-social-container">

      <div class="ket-social-card">

        <input
          id="ketPeopleSearch"
          class="ket-people-search"
          type="search"
          placeholder="Search people or @username…"
          autocomplete="off"
        >

        <div id="ketPeopleList"></div>

      </div>

    </div>

  `;

  const search =
    container.querySelector(
      "#ketPeopleSearch"
    );

  search.value =
    peopleSearchTerm;

  search.addEventListener(
    "input",
    () => {

      peopleSearchTerm =
        search.value.trim()
          .toLowerCase();

      renderPeopleList();

    }
  );

  await loadProfiles();

  await renderPeopleList();
}


async function loadProfiles() {

  const {
    data,
    error
  } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      username,
      bio,
      avatar_url
    `)
    .order(
      "display_name",
      {
        ascending: true
      }
    )
    .limit(100);

  if (error) {

    console.error(
      "Keturio people:",
      error
    );

    throw error;
  }

  socialProfiles =
    data || [];

  return socialProfiles;
}


async function renderPeopleList() {

  const list =
    socialRoot?.querySelector(
      "#ketPeopleList"
    );

  if (!list) {
    return;
  }

  let people =
    socialProfiles.filter(
      profile =>
        profile.id !==
        socialUser?.id
    );

  if (peopleSearchTerm) {

    people =
      people.filter(
        profile => {

          const name =
            String(
              profile.display_name ||
              ""
            ).toLowerCase();

          const username =
            String(
              profile.username ||
              ""
            ).toLowerCase();

          const bio =
            String(
              profile.bio ||
              ""
            ).toLowerCase();

          return (
            name.includes(
              peopleSearchTerm
            ) ||
            username.includes(
              peopleSearchTerm
                .replace(
                  /^@/,
                  ""
                )
            ) ||
            bio.includes(
              peopleSearchTerm
            )
          );

        }
      );

  }

  if (!people.length) {

    list.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          👥
        </div>

        <h3>
          No people found
        </h3>

        <p>
          Try another name or @username.
        </p>

      </div>

    `;

    return;
  }

  const {
    data: followingRows
  } = await supabase
    .from("follows")
    .select(`
      following_id
    `)
    .eq(
      "follower_id",
      socialUser.id
    );

  const following =
    new Set(
      (followingRows || [])
        .map(
          row =>
            row.following_id
        )
    );

  list.innerHTML =
    people.map(
      profile => {

        const isFollowing =
          following.has(
            profile.id
          );

        const name =
          profile.display_name ||
          "Keturio User";

        return `

          <div class="ket-person">

            <div class="ket-avatar">

              ${
                profile.avatar_url
                  ? `
                    <img
                      src="${escapeHtml(
                        profile.avatar_url
                      )}"
                      alt=""
                    >
                  `
                  : escapeHtml(
                      initials(name)
                    )
              }

            </div>

            <div class="ket-person-info">

              <strong>
                ${escapeHtml(
                  name
                )}
              </strong>

              <span>
                ${
                  profile.username
                    ? "@" +
                      escapeHtml(
                        profile.username
                      )
                    : "Keturio member"
                }

                ${
                  profile.bio
                    ? " · " +
                      escapeHtml(
                        profile.bio
                      )
                    : ""
                }

              </span>

            </div>

            <button
              class="${
                isFollowing
                  ? "ket-social-secondary"
                  : "ket-social-primary"
              }"
              data-follow-id="${escapeHtml(
                profile.id
              )}"
              data-following="${
                isFollowing
              }"
              type="button"
            >
              ${
                isFollowing
                  ? "Following"
                  : "Connect"
              }
            </button>

          </div>

        `;

      }
    ).join("");

  list
    .querySelectorAll(
      "[data-follow-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await toggleFollow(
            button.dataset.followId,
            button.dataset.following ===
              "true"
          );

        }
      );

    });
}


/* =========================================================
   FOLLOW / UNFOLLOW
========================================================= */

async function toggleFollow(
  targetUserId,
  currentlyFollowing
) {

  if (!socialUser) {
    return;
  }

  if (
    targetUserId ===
    socialUser.id
  ) {
    return;
  }

  try {

    if (
      currentlyFollowing
    ) {

      const {
        error
      } = await supabase
        .from("follows")
        .delete()
        .eq(
          "follower_id",
          socialUser.id
        )
        .eq(
          "following_id",
          targetUserId
        );

      if (error) {
        throw error;
      }

      showSocialToast(
        "Disconnected."
      );

    } else {

      const {
        error
      } = await supabase
        .from("follows")
        .insert({
          follower_id:
            socialUser.id,
          following_id:
            targetUserId
        });

      if (error) {
        throw error;
      }

      showSocialToast(
        "Connected."
      );

    }

    await loadProfiles();

    await renderPeopleList();

  } catch (error) {

    console.error(
      "Keturio follow:",
      error
    );

    if (
      error.code ===
      "23505"
    ) {

      showSocialToast(
        "You are already connected."
      );

      return;
    }

    showSocialToast(
      error.message ||
      "Unable to update connection."
    );

  }
}


/* =========================================================
   MOMENTS
========================================================= */

async function renderMoments(
  container
) {

  container.innerHTML = `

    <div class="ket-social-container">

      <div class="ket-social-card ket-social-composer">

        <div class="ket-post-head">

          <div class="ket-avatar">

            ${escapeHtml(
              initials(
                socialProfile?.display_name ||
                "Keturio"
              )
            )}

          </div>

          <div class="ket-post-author">

            <strong>
              Create a Moment
            </strong>

            <span>
              Moments disappear after 24 hours.
            </span>

          </div>

        </div>

        <textarea
          id="ketMomentInput"
          maxlength="1000"
          placeholder="Share a moment…"
        ></textarea>

        <div
          class="ket-social-row"
          style="margin-top:10px"
        >

          <span class="ket-social-space"></span>

          <button
            class="ket-social-primary"
            id="ketCreateMoment"
            type="button"
          >
            Share Moment
          </button>

        </div>

      </div>

      <div id="ketMomentList"></div>

    </div>

  `;

  container
    .querySelector(
      "#ketCreateMoment"
    )
    ?.addEventListener(
      "click",
      createMoment
    );

  await loadMoments();
}


async function loadMoments() {

  const list =
    socialRoot?.querySelector(
      "#ketMomentList"
    );

  if (!list) {
    return;
  }

  const {
    data: moments,
    error
  } = await supabase
    .from("moments")
    .select(`
      id,
      author_id,
      content,
      image_url,
      created_at,
      expires_at
    `)
    .gt(
      "expires_at",
      new Date().toISOString()
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    )
    .limit(100);

  if (error) {

    console.error(
      "Keturio moments:",
      error
    );

    list.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          ⚠️
        </div>

        <h3>
          Moments unavailable
        </h3>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>

    `;

    return;
  }

  if (!moments?.length) {

    list.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          ✨
        </div>

        <h3>
          No Moments yet
        </h3>

        <p>
          Share the first Moment with your Keturio community.
        </p>

      </div>

    `;

    return;
  }

  const authorIds =
    [
      ...new Set(
        moments.map(
          moment =>
            moment.author_id
        )
      )
    ];

  const {
    data: profiles
  } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      username,
      avatar_url
    `)
    .in(
      "id",
      authorIds
    );

  const profileMap =
    new Map(
      (profiles || []).map(
        profile => [
          profile.id,
          profile
        ]
      )
    );

  list.innerHTML =
    moments.map(
      moment => {

        const author =
          profileMap.get(
            moment.author_id
          ) || {};

        const name =
          author.display_name ||
          "Keturio User";

        const avatar =
          author.avatar_url
            ? `
              <img
                src="${escapeHtml(
                  author.avatar_url
                )}"
                alt=""
              >
            `
            : escapeHtml(
                initials(name)
              );

        return `

          <article
            class="ket-moment"
          >

            <div class="ket-post-head">

              <div class="ket-avatar">

                ${avatar}

              </div>

              <div class="ket-post-author">

                <strong>
                  ${escapeHtml(
                    name
                  )}
                </strong>

                <span>
                  ${
                    author.username
                      ? "@" +
                        escapeHtml(
                          author.username
                        )
                      : ""
                  }
                </span>

              </div>

            </div>

            <div class="ket-moment-content">

              ${escapeHtml(
                moment.content
              )}

            </div>

            <div class="ket-moment-time">

              ${escapeHtml(
                timeAgo(
                  moment.created_at
                )
              )}

              · expires
              ${escapeHtml(
                formatDate(
                  moment.expires_at
                )
              )}

            </div>

          </article>

        `;

      }
    ).join("");
}


/* =========================================================
   CREATE MOMENT
========================================================= */

async function createMoment() {

  if (!socialUser) {
    return;
  }

  const input =
    socialRoot?.querySelector(
      "#ketMomentInput"
    );

  if (!input) {
    return;
  }

  const content =
    input.value.trim();

  if (!content) {

    showSocialToast(
      "Write something first."
    );

    input.focus();

    return;
  }

  if (content.length > 1000) {

    showSocialToast(
      "Your Moment is too long."
    );

    return;
  }

  const button =
    socialRoot.querySelector(
      "#ketCreateMoment"
    );

  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Sharing…";

  }

  try {

    const {
      error
    } = await supabase
      .from("moments")
      .insert({
        author_id:
          socialUser.id,
        content
      });

    if (error) {
      throw error;
    }

    input.value =
      "";

    showSocialToast(
      "Moment shared."
    );

    await loadMoments();

  } catch (error) {

    console.error(
      "Keturio create moment:",
      error
    );

    showSocialToast(
      error.message ||
      "Unable to share Moment."
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Share Moment";

    }

  }
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile(
  container
) {

  await ensureProfile();

  if (!socialProfile) {

    container.innerHTML = `

      <div class="ket-empty">

        <div class="emoji">
          👤
        </div>

        <h3>
          Profile unavailable
        </h3>

        <p>
          We could not load your Keturio profile.
        </p>

      </div>

    `;

    return;
  }

  const {
    count: followersCount
  } = await supabase
    .from("follows")
    .select(
      "*",
      {
        count: "exact",
        head: true
      }
    )
    .eq(
      "following_id",
      socialUser.id
    );

  const {
    count: followingCount
  } = await supabase
    .from("follows")
    .select(
      "*",
      {
        count: "exact",
        head: true
      }
    )
    .eq(
      "follower_id",
      socialUser.id
    );

  container.innerHTML = `

    <div class="ket-social-container">

      <div class="ket-social-card">

        <div class="ket-profile-hero">

          <div class="ket-profile-avatar">

            ${
              socialProfile.avatar_url
                ? `
                  <img
                    src="${escapeHtml(
                      socialProfile.avatar_url
                    )}"
                    alt=""
                  >
                `
                : escapeHtml(
                    initials(
                      socialProfile.display_name ||
                      "Keturio"
                    )
                  )
            }

          </div>

          <h2>
            ${escapeHtml(
              socialProfile.display_name ||
              "Keturio User"
            )}
          </h2>

          <div class="ket-profile-username">

            ${
              socialProfile.username
                ? "@" +
                  escapeHtml(
                    socialProfile.username
                  )
                : "Set your @username"
            }

          </div>

          <div class="ket-profile-bio">

            ${
              socialProfile.bio
                ? escapeHtml(
                    socialProfile.bio
                  )
                : "Add a short bio so people know you."
            }

          </div>

          <div class="ket-profile-stats">

            <div class="ket-profile-stat">

              <strong>
                ${followersCount || 0}
              </strong>

              <span>
                Followers
              </span>

            </div>

            <div class="ket-profile-stat">

              <strong>
                ${followingCount || 0}
              </strong>

              <span>
                Following
              </span>

            </div>

          </div>

        </div>


        <div class="ket-social-row">

          <button
            class="ket-social-primary"
            id="ketEditProfile"
            type="button"
          >
            Edit Profile
          </button>

        </div>

      </div>


      <div
        class="ket-social-card hidden"
        id="ketProfileEditor"
      >

        <h3>
          Edit your Keturio profile
        </h3>

        <label class="ket-field">

          <span>
            Display name
          </span>

          <input
            id="ketProfileName"
            maxlength="60"
            value="${escapeHtml(
              socialProfile.display_name ||
              ""
            )}"
          >

        </label>

        <label class="ket-field">

          <span>
            Keturio ID / @username
          </span>

          <input
            id="ketProfileUsername"
            maxlength="30"
            placeholder="yourusername"
            value="${escapeHtml(
              socialProfile.username ||
              ""
            )}"
          >

        </label>

        <label class="ket-field">

          <span>
            Bio
          </span>

          <textarea
            id="ketProfileBio"
            maxlength="500"
            placeholder="Tell people about yourself…"
          >${escapeHtml(
            socialProfile.bio ||
            ""
          )}</textarea>

        </label>

        <div class="ket-social-row">

          <button
            class="ket-social-secondary"
            id="ketCancelProfile"
            type="button"
          >
            Cancel
          </button>

          <span class="ket-social-space"></span>

          <button
            class="ket-social-primary"
            id="ketSaveProfile"
            type="button"
          >
            Save Profile
          </button>

        </div>

      </div>

    </div>

  `;

  container
    .querySelector(
      "#ketEditProfile"
    )
    ?.addEventListener(
      "click",
      () => {

        container
          .querySelector(
            "#ketProfileEditor"
          )
          ?.classList.remove(
            "hidden"
          );

      }
    );

  container
    .querySelector(
      "#ketCancelProfile"
    )
    ?.addEventListener(
      "click",
      () => {

        container
          .querySelector(
            "#ketProfileEditor"
          )
          ?.classList.add(
            "hidden"
          );

      }
    );

  container
    .querySelector(
      "#ketSaveProfile"
    )
    ?.addEventListener(
      "click",
      saveProfile
    );
}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

  if (!socialUser) {
    return;
  }

  const nameInput =
    socialRoot.querySelector(
      "#ketProfileName"
    );

  const usernameInput =
    socialRoot.querySelector(
      "#ketProfileUsername"
    );

  const bioInput =
    socialRoot.querySelector(
      "#ketProfileBio"
    );

  if (
    !nameInput ||
    !usernameInput ||
    !bioInput
  ) {
    return;
  }

  const displayName =
    nameInput.value.trim();

  let username =
    usernameInput.value
      .trim()
      .toLowerCase();

  const bio =
    bioInput.value.trim();

  username =
    username
      .replace(
        /^@/,
        ""
      )
      .replace(
        /[^a-z0-9_.]/g,
        ""
      );

  if (!displayName) {

    showSocialToast(
      "Please enter a display name."
    );

    return;
  }

  if (
    username &&
    username.length < 3
  ) {

    showSocialToast(
      "Username must contain at least 3 characters."
    );

    return;
  }

  const saveButton =
    socialRoot.querySelector(
      "#ketSaveProfile"
    );

  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      "Saving…";

  }

  try {

    if (username) {

      const {
        data: existing,
        error: usernameError
      } = await supabase
        .from("profiles")
        .select("id")
        .eq(
          "username",
          username
        )
        .neq(
          "id",
          socialUser.id
        )
        .maybeSingle();

      if (usernameError) {
        throw usernameError;
      }

      if (existing) {

        showSocialToast(
          "That @username is already taken."
        );

        return;
      }

    }

    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .update({
        display_name:
          displayName,
        username:
          username || null,
        bio
      })
      .eq(
        "id",
        socialUser.id
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    socialProfile =
      data;

    try {

      await supabase.auth.updateUser({
        data: {
          display_name:
            displayName,
          username:
            username || null
        }
      });

    } catch (metadataError) {

      console.warn(
        "Keturio auth metadata update:",
        metadataError
      );

    }

    showSocialToast(
      "Profile updated."
    );

    await renderProfile(
      socialRoot.querySelector(
        "#ketSocialContent"
      )
    );

  } catch (error) {

    console.error(
      "Keturio save profile:",
      error
    );

    if (
      error.code ===
      "23505"
    ) {

      showSocialToast(
        "That @username is already taken."
      );

    } else {

      showSocialToast(
        error.message ||
        "Unable to save profile."
      );

    }

  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        "Save Profile";

    }

  }
}


/* =========================================================
   PROFILE BAR → OPEN PROFILE
========================================================= */

function connectExistingProfileBar() {

  const profileBar =
    document.querySelector(
      ".profile-bar"
    );

  if (!profileBar) {
    return;
  }

  if (
    profileBar.dataset.keturioSocialBound ===
    "true"
  ) {
    return;
  }

  profileBar.dataset.keturioSocialBound =
    "true";

  profileBar.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "#logoutBtn"
        )
      ) {
        return;
      }

      openSocial(
        "profile"
      );

    }
  );
}


/* =========================================================
   SOCIAL NAVIGATION
========================================================= */

function createSocialNavigation() {

  const bottomNav =
    document.querySelector(
      ".bottom-nav"
    );

  if (!bottomNav) {
    return;
  }

  /*
   * Do not duplicate the navigation.
   */

  if (
    document.getElementById(
      "keturioSocialNav"
    )
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "keturioSocialNav";

  button.className =
    "nav-item";

  button.type =
    "button";

  button.innerHTML = `
    🌐
    <span>
      Social
    </span>
  `;

  button.addEventListener(
    "click",
    () => {
      openSocial(
        "feed"
      );
    }
  );

  bottomNav.appendChild(
    button
  );
}


/* =========================================================
   AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    socialUser =
      session?.user ||
      null;

    if (
      socialUser
    ) {

      await ensureProfile();

      connectExistingProfileBar();

      createSocialNavigation();

    }

  }
);


/* =========================================================
   BOOT
========================================================= */

async function bootSocial() {

  if (
    socialInitialized
  ) {
    return;
  }

  socialInitialized =
    true;

  createSocialRoot();

  await getMe();

  if (socialUser) {

    await ensureProfile();

    connectExistingProfileBar();

    createSocialNavigation();

  }

}


/* =========================================================
   WAIT FOR APP
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    bootSocial
  );

} else {

  bootSocial();

}


/* =========================================================
   EXPORT OPTIONAL GLOBAL API
========================================================= */

window.KeturioSocial = {

  open: openSocial,

  close: closeSocial,

  openFeed: () =>
    openSocial("feed"),

  openPeople: () =>
    openSocial("people"),

  openMoments: () =>
    openSocial("moments"),

  openProfile: () =>
    openSocial("profile")

};
