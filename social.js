/* =========================================================
   KETURIO SOCIAL — STAGE 4 FOUNDATION + PROFILE MEDIA
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
   • Persistent profile photo and cover image uploads
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
      padding: 0 0 20px;
      overflow: hidden;
    }

    .ket-profile-cover {
      position: relative;
      width: 100%;
      height: clamp(145px, 27vw, 235px);
      border-radius: 16px 16px 0 0;
      background: linear-gradient(135deg, #32256d, #087d91 55%, #171d36);
      background-size: cover;
      background-position: center;
      margin-bottom: 0;
    }

    .ket-profile-cover::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,.25));
      pointer-events: none;
    }

    .ket-profile-avatar-wrap {
      position: relative;
      width: 100px;
      margin: -50px auto 12px;
      z-index: 1;
    }

    .ket-profile-media-help {
      color: var(--muted, #8d9bb8);
      font-size: 12px;
      line-height: 1.5;
      margin: 6px 0 14px;
    }

    .ket-profile-file-input {
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin-top: 8px;
      padding: 10px;
      border: 1px solid var(--line, rgba(255,255,255,.12));
      border-radius: 12px;
      color: var(--text, #fff);
      background: rgba(255,255,255,.035);
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

    .ket-social-button { border:1px solid var(--line,rgba(255,255,255,.1)); border-radius:10px; padding:8px 11px; background:rgba(255,255,255,.045); color:var(--text,#fff); font:inherit; font-size:11px; cursor:pointer; }
    .ket-social-button.active { border-color:var(--accent,#7c5cff); background:rgba(124,92,255,.18); }
    .ket-social-button:disabled { opacity:.45; cursor:not-allowed; }
    .ket-stories-page .ket-field { margin: 12px 0; }
    .ket-stories-page .ket-field input[type="file"],
    .ket-stories-page .ket-field select { width: 100%; box-sizing: border-box; border: 1px solid var(--line, rgba(255,255,255,.1)); border-radius: 12px; padding: 11px; background: var(--panel, #101522); color: var(--text, #fff); font: inherit; }
    .ket-stories-hint { color: var(--muted, #8d9bb8); font-size: 11px; margin: 5px 0; }
    .ket-stories-section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:18px 0 10px; }
    .ket-stories-section-head h3 { margin:0; font-size:16px; }
    #ketMomentList { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .ket-story-card { min-width:0; overflow:hidden; border:1px solid var(--line,rgba(255,255,255,.08)); border-radius:18px; background:var(--panel,#101522); }
    .ket-story-open { display:block; width:100%; padding:0; border:0; background:#090d17; color:inherit; cursor:pointer; text-align:left; }
    .ket-story-thumb { display:block; width:100%; aspect-ratio:4/5; object-fit:cover; max-height:360px; }
    .ket-story-text-art { display:flex; flex-direction:column; align-items:center; justify-content:center; aspect-ratio:4/5; min-height:220px; padding:22px; box-sizing:border-box; color:#fff; text-align:center; background:radial-gradient(circle at 20% 20%,rgba(0,212,255,.25),transparent 45%),radial-gradient(circle at 80% 80%,rgba(124,92,255,.35),transparent 45%),#121a2c; }
    .ket-story-text-art span { font-size:28px; }
    .ket-story-text-art p { white-space:pre-wrap; overflow-wrap:anywhere; }
    .ket-story-card-meta { display:flex; align-items:center; gap:9px; padding:12px 12px 0; }
    .ket-story-author { display:flex; flex-direction:column; min-width:0; gap:3px; flex:1; }
    .ket-story-author strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
    .ket-story-author span { color:var(--muted,#8d9bb8); font-size:10px; }
    .ket-story-caption { padding:0 12px; margin:9px 0; font-size:12px; white-space:pre-wrap; overflow-wrap:anywhere; }
    .ket-story-card-footer { display:flex; align-items:center; flex-wrap:wrap; gap:9px; padding:10px 12px 12px; font-size:11px; color:var(--muted,#8d9bb8); }
    .ket-story-card-footer .ket-social-button { margin-left:auto; }
    .ket-story-viewer[hidden] { display:none !important; }
    .ket-story-viewer { position:fixed; z-index:99999; inset:0; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box; }
    .ket-story-viewer-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.84); }
    .ket-story-viewer-panel { position:relative; z-index:1; width:min(100%,520px); max-height:96%; display:flex; flex-direction:column; overflow:hidden; border:1px solid rgba(255,255,255,.14); border-radius:22px; color:#fff; background:#0b1020; box-shadow:0 24px 90px rgba(0,0,0,.58); }
    .ket-story-progress { height:3px; background:rgba(255,255,255,.2); flex-shrink:0; }
    .ket-story-progress span { display:block; height:100%; background:#fff; }
    .ket-story-viewer-header,.ket-story-viewer-footer { display:flex; align-items:center; gap:10px; padding:12px 14px; flex-shrink:0; }
    .ket-story-viewer-header { background:linear-gradient(180deg,rgba(255,255,255,.045),transparent); }
    .ket-story-viewer-header .ket-social-button { margin-left:auto; }
    .ket-story-viewer-caption { flex-shrink:0; max-height:20vh; overflow:auto; width:100%; box-sizing:border-box; padding:12px 16px; margin:0; text-align:left; font-size:14px; line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; background:linear-gradient(110deg,#151f34,#111827); border-top:1px solid rgba(255,255,255,.06); border-bottom:1px solid rgba(255,255,255,.09); }
    .ket-story-viewer-content { flex:0 1 auto; min-height:120px; max-height:48vh; min-width:0; overflow:auto; display:flex; align-items:center; justify-content:center; padding:8px; box-sizing:border-box; background:#05070c; }
    .ket-story-viewer-media { display:block; max-width:100%; max-height:46vh; width:auto; height:auto; object-fit:contain; border-radius:8px; }
    .ket-story-viewer-text { display:grid; place-items:center; min-height:260px; width:100%; padding:28px; box-sizing:border-box; text-align:center; white-space:pre-wrap; overflow-wrap:anywhere; border-radius:12px; background:radial-gradient(circle at 20% 20%,rgba(0,212,255,.25),transparent 45%),radial-gradient(circle at 80% 80%,rgba(124,92,255,.35),transparent 45%),#121a2c; }
    .ket-story-view-count { color:var(--muted,#8d9bb8); font-size:11px; }
    .ket-story-viewer-footer { flex-wrap:wrap; padding:8px 12px; border-top:1px solid rgba(255,255,255,.07); }
    .ket-story-replies { border-top:1px solid rgba(255,255,255,.1); padding:10px 12px 12px; display:flex; flex:1 1 auto; flex-direction:column; gap:8px; min-height:100px; overflow:hidden; background:linear-gradient(180deg,#0d1423,#0b1020); }
    .ket-story-replies-list { flex:1 1 auto; min-height:0; max-height:180px; overflow:auto; display:flex; flex-direction:column; gap:9px; padding:1px 2px 4px; }
    .ket-story-reply { font-size:12px; line-height:1.45; overflow-wrap:anywhere; padding:8px 10px; border-radius:12px; background:rgba(255,255,255,.045); }
    .ket-story-reply strong { margin-right:5px; color:#fff; }
    .ket-story-reply small { color:rgba(255,255,255,.55); margin-left:6px; font-size:10px; }
    .ket-story-reply-nested { margin:6px 0 0 12px; padding:7px 0 0 9px; border-left:2px solid rgba(138,180,255,.35); background:transparent; border-radius:0; }
    .ket-story-reply .ket-comment-reply-toggle { display:inline-block; }
    .ket-story-reply-form { display:flex; align-items:center; gap:7px; flex-shrink:0; }
    .ket-story-reply-form input { min-width:0; flex:1; border:1px solid rgba(255,255,255,.18); border-radius:999px; padding:11px 14px; background:#151d2d; color:#fff; font:inherit; font-size:13px; }
    .ket-story-reply-form button { border:0; border-radius:999px; padding:10px 15px; background:var(--accent,#477cff); color:#fff; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
    .ket-story-reply-form button:disabled { opacity:.55; cursor:wait; }
    .ket-comment-thread { margin-left:18px; padding-left:10px; border-left:2px solid var(--line,rgba(255,255,255,.12)); }
    .ket-comment-reply-toggle { border:0; padding:3px 7px; margin:3px 0; background:transparent; color:var(--accent,#8ab4ff); font-size:11px; cursor:pointer; }
    .ket-comment-reply-form { margin:8px 0; }
    .ket-story-viewer-footer .ket-social-space { flex:1; }
    .ket-story-viewer .ket-social-button { cursor:pointer; }
    .ket-story-viewer .ket-social-button:disabled { opacity:.4; cursor:not-allowed; }
    @media (max-width:560px) { .ket-story-viewer { padding:0; } .ket-story-viewer-panel { width:100%; max-height:100%; height:100%; border:0; border-radius:0; } .ket-story-viewer-header { padding:12px 14px; } .ket-story-viewer-caption { max-height:16vh; padding:10px 14px; } .ket-story-viewer-content { flex:0 1 auto; max-height:40vh; min-height:110px; } .ket-story-viewer-media { max-height:38vh; } .ket-story-viewer-text { min-height:190px; } .ket-story-replies { flex:1 1 auto; min-height:130px; } .ket-story-replies-list { max-height:none; } #ketMomentList { grid-template-columns:repeat(2,minmax(0,1fr)); } }

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

  style.textContent += `
    .ket-post-extra-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px solid var(--line,rgba(255,255,255,.08)); }
    .ket-post-extra-actions button, .ket-comment-actions button { border:0; border-radius:10px; padding:8px 10px; background:rgba(255,255,255,.055); color:var(--text,#f4f7ff); cursor:pointer; }
    .ket-post-extra-actions button.active { color:var(--accent,#8ab4ff); background:rgba(100,150,255,.13); }
    .ket-comments-panel { margin-top:12px; padding-top:12px; border-top:1px solid var(--line,rgba(255,255,255,.08)); }
    .ket-comment-form { display:flex; gap:8px; margin-bottom:12px; }
    .ket-comment-form input { min-width:0; flex:1; border:1px solid var(--line,rgba(255,255,255,.12)); border-radius:12px; padding:10px 12px; background:var(--panel2,#0c111c); color:var(--text,#fff); }
    .ket-comment-form button { border:0; border-radius:10px; padding:8px 12px; background:var(--accent,#477cff); color:white; cursor:pointer; }
    .ket-comment { padding:10px 0; border-bottom:1px solid var(--line,rgba(255,255,255,.07)); }
    .ket-comment strong { font-size:13px; }
    .ket-comment p { margin:5px 0; white-space:pre-wrap; overflow-wrap:anywhere; }
    .ket-comment-meta { color:var(--muted,#8d9bb8); font-size:11px; }
    .ket-unread-badge { display:inline-block; min-width:17px; margin-left:4px; border-radius:999px; padding:2px 5px; background:#e5484d; color:white; font-size:10px; }
    .ket-notification { display:flex; gap:10px; align-items:flex-start; padding:13px; border-bottom:1px solid var(--line,rgba(255,255,255,.07)); cursor:pointer; }
    .ket-notification.unread { background:rgba(85,135,255,.09); }
    .ket-notification p { margin:0; }
    .ket-notification small { display:block; margin-top:5px; color:var(--muted,#8d9bb8); }
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
          data-social-tab="notifications"
          type="button"
        >
          🔔 Notifications <span id="ketSocialUnreadBadge" class="ket-unread-badge" hidden></span>
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
  await updateUnreadNotificationsBadge();
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

    else if (tab === "notifications") {
      await renderNotifications(content);
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

  const { data: commentsForCounts } = await supabase
    .from("post_comments")
    .select("id, post_id")
    .in("post_id", postIds);

  const commentCounts = new Map();
  for (const comment of commentsForCounts || []) {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1);
  }

  const { data: savedRows } = await supabase
    .from("post_saves")
    .select("post_id")
    .eq("user_id", socialUser.id)
    .in("post_id", postIds);
  const savedPostIds = new Set((savedRows || []).map(row => row.post_id));

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
          postReactions,
          commentCounts.get(post.id) || 0,
          savedPostIds.has(post.id)
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
  reactions,
  commentCount = 0,
  isSaved = false
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

      <div class="ket-post-extra-actions">
        <button type="button" data-post-action="comments">💬 Comments${commentCount ? ` (${commentCount})` : ""}</button>
        <button type="button" data-post-action="save" class="${isSaved ? "active" : ""}">${isSaved ? "🔖 Saved" : "🔖 Save"}</button>
        <button type="button" data-post-action="share">↗ Share</button>
        <button type="button" data-post-action="repost">🔁 Repost</button>
        <button type="button" data-post-action="quote">✍️ Quote</button>
      </div>
      <div class="ket-comments-panel" hidden></div>

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

          if (action === "comments") {
            const panel = post.querySelector(".ket-comments-panel");
            if (panel) {
              const shouldOpen = panel.hidden;
              panel.hidden = !shouldOpen;
              if (shouldOpen) await loadPostComments(postId, panel);
            }
          }

          if (action === "save") await toggleSavedPost(postId, button);
          if (action === "share") await sharePost(postId, "share");
          if (action === "repost") await sharePost(postId, "repost");
          if (action === "quote") await sharePost(postId, "quote");

        }
      );

    });
}


/* =========================================================
   COMMENTS, SAVES, SHARING, NOTIFICATIONS
========================================================= */

async function loadPostComments(postId, panel) {
  panel.innerHTML = `<div class="ket-comment-meta">Loading comments…</div>`;
  const { data: comments, error } = await supabase.from("post_comments")
    .select("id, post_id, author_id, parent_comment_id, content, created_at")
    .eq("post_id", postId).order("created_at", { ascending: true }).limit(200);
  if (error) {
    panel.innerHTML = `<p class="ket-comment-meta">${escapeHtml(error.message || "Unable to load comments. Run Stage 4 SQL first.")}</p>`;
    return;
  }
  const ids = [...new Set((comments || []).map(c => c.author_id))];
  let profiles = [];
  if (ids.length) {
    const result = await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids);
    profiles = result.data || [];
  }
  const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
  const commentIds = (comments || []).map(c => c.id);
  let commentReactions = [];
  if (commentIds.length) {
    const result = await supabase.from("comment_reactions").select("comment_id, user_id, reaction").in("comment_id", commentIds);
    commentReactions = result.data || [];
  }
  const reactionMap = new Map();
  for (const reaction of commentReactions) {
    if (!reactionMap.has(reaction.comment_id)) reactionMap.set(reaction.comment_id, []);
    reactionMap.get(reaction.comment_id).push(reaction);
  }
  const children = new Map();
  for (const comment of comments || []) {
    const parent = comment.parent_comment_id || "__root__";
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(comment);
  }
  const renderThread = (parentId = "__root__", depth = 0) => (children.get(parentId) || []).map(comment => {
    const author = profileMap.get(comment.author_id) || {};
    const reactions = reactionMap.get(comment.id) || [];
    const mine = reactions.some(r => r.user_id === socialUser?.id);
    const safeId = escapeHtml(comment.id);
    const nested = renderThread(comment.id, depth + 1);
    return `<article class="ket-comment ${depth ? "ket-comment-thread" : ""}" data-comment-id="${safeId}" style="${depth > 4 ? "margin-left:8px" : ""}">
      <strong>${escapeHtml(author.display_name || author.username || "Keturio User")}</strong>
      <p>${escapeHtml(comment.content)}</p>
      <span class="ket-comment-meta">${escapeHtml(timeAgo(comment.created_at))}</span>
      <span class="ket-comment-actions"><button type="button" data-comment-react="like" class="${mine ? "active" : ""}">👍 ${reactions.length || ""}</button></span>
      <button type="button" class="ket-comment-reply-toggle" data-comment-reply-toggle="${safeId}">↩ Reply</button>
      <form class="ket-comment-form ket-comment-reply-form" data-comment-form data-parent-comment="${safeId}" hidden>
        <input name="content" maxlength="2000" placeholder="Reply to ${escapeHtml(author.display_name || author.username || "this comment")}…" aria-label="Reply to comment" required>
        <button type="submit">Reply</button>
      </form>
      ${nested}
    </article>`;
  }).join("");
  panel.innerHTML = `
    <form class="ket-comment-form" data-comment-form>
      <input name="content" maxlength="2000" placeholder="Write a comment…" aria-label="Write a comment" required>
      <button type="submit">Send</button>
    </form>
    <div class="ket-comments-list">${renderThread() || `<p class="ket-comment-meta">No comments yet. Start the conversation.</p>`}</div>`;

  panel.querySelectorAll("[data-comment-reply-toggle]").forEach(button => button.addEventListener("click", () => {
    const comment = button.closest("[data-comment-id]");
    const form = comment?.querySelector(":scope > [data-comment-form]");
    if (!form) return;
    form.hidden = !form.hidden;
    if (!form.hidden) form.querySelector("input")?.focus();
  }));
  panel.querySelectorAll("[data-comment-react]").forEach(button => button.addEventListener("click", async () => {
    const commentId = button.closest("[data-comment-id]")?.dataset.commentId;
    if (!commentId || !socialUser) return showSocialToast("Please sign in to react to comments.");
    const { data: existing, error: lookupError } = await supabase.from("comment_reactions").select("comment_id").eq("comment_id", commentId).eq("user_id", socialUser.id).maybeSingle();
    if (lookupError) return showSocialToast(lookupError.message || "Unable to react to comment.");
    const result = existing
      ? await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", socialUser.id)
      : await supabase.from("comment_reactions").insert({ comment_id: commentId, user_id: socialUser.id, reaction: "like" });
    if (result.error) return showSocialToast(result.error.message || "Unable to react to comment.");
    await loadPostComments(postId, panel);
  }));
  panel.querySelectorAll("[data-comment-form]").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!socialUser) return showSocialToast("Please log in first.");
    const input = form.elements.content;
    const content = input.value.trim();
    if (!content) return;
    const submit = form.querySelector("button[type='submit']");
    if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
    const parentId = form.dataset.parentComment || null;
    const { error: insertError } = await supabase.from("post_comments").insert({ post_id: postId, author_id: socialUser.id, content, parent_comment_id: parentId });
    if (insertError) {
      if (submit) { submit.disabled = false; submit.textContent = parentId ? "Reply" : "Send"; }
      showSocialToast(insertError.message || "Unable to add comment. Run Stage 4 SQL first.");
      return;
    }
    await loadPostComments(postId, panel);
    const actionButton = socialRoot?.querySelector(`[data-post-id="${CSS.escape(postId)}"] [data-post-action="comments"]`);
    if (actionButton) actionButton.textContent = `💬 Comments (${panel.querySelectorAll(".ket-comment").length})`;
  }));
}

async function toggleSavedPost(postId, button) {
  if (!socialUser) return showSocialToast("Please log in first.");
  const { data: existing, error: findError } = await supabase.from("post_saves").select("post_id").eq("post_id", postId).eq("user_id", socialUser.id).maybeSingle();
  if (findError) return showSocialToast(findError.message || "Unable to check saved posts.");
  if (existing) {
    const { error } = await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", socialUser.id);
    if (error) return showSocialToast(error.message);
    button.classList.remove("active"); button.textContent = "🔖 Save";
    showSocialToast("Post removed from saved posts.");
  } else {
    const { error } = await supabase.from("post_saves").insert({ post_id: postId, user_id: socialUser.id });
    if (error) return showSocialToast(error.message || "Unable to save post. Run Stage 4 SQL first.");
    button.classList.add("active"); button.textContent = "🔖 Saved";
    showSocialToast("Post saved.");
  }
}

async function sharePost(postId, shareType) {
  if (!socialUser) return showSocialToast("Please log in first.");
  let message = null;
  if (shareType === "quote") {
    message = window.prompt("Add your thoughts to this quote (optional):", "");
    if (message === null) return;
    message = message.trim();
    if (message.length > 2000) return showSocialToast("Your quote is too long.");
  }
  if (shareType === "repost") {
    const confirmed = window.confirm("Repost this to your followers?");
    if (!confirmed) return;
  }
  const { error } = await supabase.from("post_shares").insert({ post_id: postId, user_id: socialUser.id, share_type: shareType, message });
  if (error) {
    if (error.code === "23505") return showSocialToast("You have already reposted this post.");
    return showSocialToast(error.message || "Unable to share. Run Stage 4 SQL first.");
  }
  if (shareType === "share") {
    const postUrl = `${location.origin}${location.pathname}#post-${postId}`;
    try {
      if (navigator.share) await navigator.share({ title: "Keturio post", url: postUrl });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(postUrl); showSocialToast("Post link copied."); }
      else window.prompt("Copy this post link:", postUrl);
    } catch (e) { if (e?.name !== "AbortError") showSocialToast("Share recorded."); }
  } else {
    showSocialToast(shareType === "repost" ? "Reposted successfully." : "Quote recorded.");
  }
}

async function updateUnreadNotificationsBadge() {
  if (!socialUser || !socialRoot) return;
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", socialUser.id).eq("is_read", false);
  if (error) return;
  const badge = socialRoot.querySelector("#ketSocialUnreadBadge");
  if (badge) { badge.hidden = !count; badge.textContent = count > 99 ? "99+" : String(count || ""); }
}

async function renderNotifications(container) {
  container.innerHTML = `<div class="ket-social-container"><div class="ket-social-card"><h2>Notifications</h2><p class="ket-comment-meta">Your latest follows, reactions, comments and shares.</p><div id="ketNotificationsList">Loading notifications…</div></div></div>`;
  const list = container.querySelector("#ketNotificationsList");
  const { data: notifications, error } = await supabase.from("notifications").select("id, actor_id, notification_type, post_id, comment_id, message, is_read, created_at").eq("recipient_id", socialUser.id).order("created_at", { ascending: false }).limit(100);
  if (error) { list.innerHTML = `<p class="ket-comment-meta">${escapeHtml(error.message || "Unable to load notifications. Run Stage 4 SQL first.")}</p>`; return; }
  const actorIds = [...new Set((notifications || []).map(n => n.actor_id).filter(Boolean))];
  let profiles = [];
  if (actorIds.length) { const result = await supabase.from("profiles").select("id, display_name, username").in("id", actorIds); profiles = result.data || []; }
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const labels = { follow: "started following you", post_reaction: "reacted to your post", comment: "commented on your post", comment_reply: "replied to your comment", comment_reaction: "reacted to your comment", repost: "reposted your post", quote_post: "quoted your post", post_share: "shared your post" };
  list.innerHTML = (notifications || []).map(n => {
    const actor = profileMap.get(n.actor_id) || {};
    return `<div class="ket-notification ${n.is_read ? "" : "unread"}" data-notification-id="${escapeHtml(n.id)}"><div>🔔</div><div><p><strong>${escapeHtml(actor.display_name || actor.username || "A Keturio user")}</strong> ${escapeHtml(labels[n.notification_type] || "interacted with you")}${n.message ? `: ${escapeHtml(n.message)}` : ""}</p><small>${escapeHtml(timeAgo(n.created_at))}</small></div></div>`;
  }).join("") || `<div class="ket-empty"><div class="emoji">🔔</div><h3>You're all caught up</h3><p>New activity will appear here.</p></div>`;
  const unreadIds = (notifications || []).filter(n => !n.is_read).map(n => n.id);
  if (unreadIds.length) {
    const { error: markError } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds).eq("recipient_id", socialUser.id);
    if (!markError) { list.querySelectorAll(".ket-notification.unread").forEach(el => el.classList.remove("unread")); await updateUnreadNotificationsBadge(); }
  }
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
   MOMENTS / STORIES 2.0
========================================================= */

let ketMomentCache = [];
let ketMomentProfileMap = new Map();
let ketMomentViewerIndex = 0;

async function renderMoments(container) {
  const currentName = socialProfile?.display_name || socialUser?.email || "Keturio";
  const currentAvatar = socialProfile?.avatar_url
    ? `<img src="${escapeHtml(socialProfile.avatar_url)}" alt="">`
    : escapeHtml(initials(currentName));

  container.innerHTML = `
    <div class="ket-social-container ket-stories-page">
      <div class="ket-social-card ket-social-composer">
        <div class="ket-post-head">
          <div class="ket-avatar">${currentAvatar}</div>
          <div class="ket-post-author">
            <strong>Create a Story</strong>
            <span>Photos, short videos, or a text update. Stories expire after 24 hours.</span>
          </div>
        </div>
        <label class="ket-field"><span>Caption or update</span>
          <textarea id="ketMomentInput" maxlength="1000" placeholder="What would you like to share?"></textarea>
        </label>
        <label class="ket-field"><span>Add a photo or video (optional)</span>
          <input id="ketMomentMedia" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm">
        </label>
        <label class="ket-field"><span>Who can view this story?</span>
          <select id="ketMomentVisibility">
            <option value="everyone">Everyone on Keturio</option>
            <option value="followers">My followers only</option>
          </select>
        </label>
        <p class="ket-stories-hint">Images: JPG, PNG, WebP or GIF, up to 10 MB. Videos: MP4 or WebM, up to 25 MB on Supabase Free.</p>
        <div class="ket-social-row" style="margin-top:10px">
          <span class="ket-social-space"></span>
          <button class="ket-social-primary" id="ketCreateMoment" type="button">Share Story</button>
        </div>
      </div>
      <div class="ket-stories-section-head"><h3>Recent Stories</h3><button class="ket-social-button" id="ketRefreshMoments" type="button">↻ Refresh</button></div>
      <div id="ketMomentList"><div class="ket-empty"><div class="emoji">✨</div><h3>Loading stories…</h3></div></div>
      <div id="ketMomentViewer" class="ket-story-viewer" hidden></div>
    </div>
  `;

  container.querySelector("#ketCreateMoment")?.addEventListener("click", createMoment);
  container.querySelector("#ketRefreshMoments")?.addEventListener("click", loadMoments);
  container.querySelector("#ketMomentList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-open-moment]");
    if (!button) return;
    const index = ketMomentCache.findIndex(item => item.id === button.dataset.openMoment);
    if (index >= 0) openMomentViewer(index);
  });
  container.querySelector("#ketMomentViewer")?.addEventListener("click", handleMomentViewerAction);
  container.querySelector("#ketMomentViewer")?.addEventListener("submit", async event => {
    const form = event.target.closest("[data-story-reply-form]");
    if (!form) return;
    event.preventDefault();
    if (!socialUser) return showSocialToast("Please sign in to reply to stories.");
    const content = form.elements.content.value.trim();
    if (!content) return;
    const moment = ketMomentCache[ketMomentViewerIndex];
    if (!moment) return;
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true; submit.textContent = "Sending…";
    const { error } = await supabase.from("moment_comments").insert({ moment_id: moment.id, author_id: socialUser.id, parent_comment_id: form.dataset.parentComment || null, content });
    submit.disabled = false; submit.textContent = "Send";
    if (error) return showSocialToast(error.message || "Unable to send story reply. Run the Story Replies SQL migration.");
    form.reset(); delete form.dataset.parentComment;
    form.elements.content.placeholder = "Reply to this story…";
    const sendButton = form.querySelector("button[type=submit]");
    if (sendButton) sendButton.textContent = "Send";
    form.querySelector("[data-cancel-story-reply]")?.remove();
    await loadMomentComments(moment.id, form.closest(".ket-story-viewer-panel")?.querySelector("[data-story-replies-list]"));
    showSocialToast("Story reply sent.");
  });
  container.querySelector("#ketMomentViewer")?.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMomentViewer();
    if (event.key === "ArrowRight") moveMomentViewer(1);
    if (event.key === "ArrowLeft") moveMomentViewer(-1);
  });
  await loadMoments();
}

async function loadMoments() {
  const list = socialRoot?.querySelector("#ketMomentList");
  if (!list) return;
  list.innerHTML = `<div class="ket-empty"><div class="emoji">⏳</div><h3>Loading stories…</h3><p>Finding recent stories for you.</p></div>`;

  const { data: moments, error } = await supabase
    .from("moments")
    .select("id, author_id, content, image_url, media_type, visibility, created_at, expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Keturio stories:", error);
    list.innerHTML = `<div class="ket-empty"><div class="emoji">⚠️</div><h3>Stories unavailable</h3><p>${escapeHtml(error.message)}<br>Make sure the Stories 2.0 SQL has been run.</p></div>`;
    return;
  }

  ketMomentCache = await Promise.all((moments || []).map(async moment => {
    if (!moment.image_url) return { ...moment, media_signed_url: null };
    if (/^https?:\/\//i.test(moment.image_url)) return { ...moment, media_signed_url: moment.image_url };
    const { data: signedData, error: signedError } = await supabase.storage
      .from("story-media")
      .createSignedUrl(moment.image_url, 3600);
    if (signedError) console.warn("Story media URL:", signedError.message);
    return { ...moment, media_signed_url: signedData?.signedUrl || null };
  }));
  if (!ketMomentCache.length) {
    list.innerHTML = `<div class="ket-empty"><div class="emoji">✨</div><h3>No active stories yet</h3><p>Share a photo, video, or quick update to start the story feed.</p></div>`;
    return;
  }

  const authorIds = [...new Set(ketMomentCache.map(item => item.author_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", authorIds);
  if (profileError) console.warn("Keturio story profiles:", profileError);
  ketMomentProfileMap = new Map((profiles || []).map(profile => [profile.id, profile]));

  const ids = ketMomentCache.map(item => item.id);
  const [viewsResult, reactionsResult] = await Promise.all([
    supabase.from("moment_views").select("moment_id, viewer_id").in("moment_id", ids),
    supabase.from("moment_reactions").select("moment_id, user_id, reaction").in("moment_id", ids)
  ]);
  const viewsByMoment = new Map();
  (viewsResult.data || []).forEach(view => viewsByMoment.set(view.moment_id, (viewsByMoment.get(view.moment_id) || 0) + 1));
  const reactionsByMoment = new Map();
  (reactionsResult.data || []).forEach(reaction => reactionsByMoment.set(reaction.moment_id, (reactionsByMoment.get(reaction.moment_id) || 0) + 1));
  const myReactionByMoment = new Map((reactionsResult.data || []).filter(row => row.user_id === socialUser?.id).map(row => [row.moment_id, row.reaction]));

  list.innerHTML = ketMomentCache.map(moment => {
    const author = ketMomentProfileMap.get(moment.author_id) || {};
    const name = author.display_name || "Keturio User";
    const avatar = author.avatar_url
      ? `<img src="${escapeHtml(author.avatar_url)}" alt="">`
      : escapeHtml(initials(name));
    const mediaUrl = moment.media_signed_url || (/^https?:\/\//i.test(moment.image_url || "") ? moment.image_url : "");
    const media = mediaUrl
      ? (moment.media_type === "video"
        ? `<video class="ket-story-thumb" src="${escapeHtml(mediaUrl)}" muted playsinline preload="metadata"></video>`
        : `<img class="ket-story-thumb" src="${escapeHtml(mediaUrl)}" alt="Story media" loading="lazy">`)
      : `<div class="ket-story-text-art"><span>✨</span><p>${escapeHtml((moment.content || "").slice(0, 115))}</p></div>`;
    const mine = moment.author_id === socialUser?.id;
    return `<article class="ket-story-card">
      <button type="button" class="ket-story-open" data-open-moment="${escapeHtml(moment.id)}" aria-label="Open story by ${escapeHtml(name)}">${media}</button>
      <div class="ket-story-card-meta"><div class="ket-avatar">${avatar}</div><div class="ket-story-author"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(timeAgo(moment.created_at))} · ${moment.visibility === "followers" ? "Followers" : "Everyone"}</span></div></div>
      ${moment.content ? `<p class="ket-story-caption">${escapeHtml(moment.content)}</p>` : ""}
      <div class="ket-story-card-footer"><span>❤️ ${reactionsByMoment.get(moment.id) || 0}</span>${mine ? `<span>👁 ${viewsByMoment.get(moment.id) || 0} views</span>` : `<span>${myReactionByMoment.has(moment.id) ? "❤️ You reacted" : "24-hour story"}</span>`}<button type="button" class="ket-social-button" data-open-moment="${escapeHtml(moment.id)}">View Story</button></div>
    </article>`;
  }).join("");
  const sharedStoryMatch = /^#story-(.+)$/.exec(location.hash || "");
  if (sharedStoryMatch) {
    const sharedStoryId = decodeURIComponent(sharedStoryMatch[1]);
    const sharedStoryIndex = ketMomentCache.findIndex(item => item.id === sharedStoryId);
    if (sharedStoryIndex >= 0) openMomentViewer(sharedStoryIndex);
  }
}

async function createMoment() {
  if (!socialUser) return showSocialToast("Please sign in before sharing a story.");
  const input = socialRoot?.querySelector("#ketMomentInput");
  const mediaInput = socialRoot?.querySelector("#ketMomentMedia");
  const visibilityInput = socialRoot?.querySelector("#ketMomentVisibility");
  const button = socialRoot?.querySelector("#ketCreateMoment");
  if (!input || !button) return;

  const file = mediaInput?.files?.[0] || null;
  let content = input.value.trim();
  if (!content && !file) {
    showSocialToast("Add a caption or choose a photo/video first.");
    input.focus();
    return;
  }
  if (content.length > 1000) return showSocialToast("Your story text is too long.");

  let mediaType = null;
  if (file) {
    const allowedImages = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const allowedVideos = ["video/mp4", "video/webm"];
    if (![...allowedImages, ...allowedVideos].includes(file.type)) return showSocialToast("Choose a JPG, PNG, WebP, GIF, MP4, or WebM file.");
    mediaType = allowedVideos.includes(file.type) ? "video" : "image";
    const maxBytes = mediaType === "video" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxLabel = mediaType === "video" ? "25 MB" : "10 MB";
    if (file.size > maxBytes) return showSocialToast(`${mediaType === "video" ? "Videos" : "Images"} must be ${maxLabel} or smaller on Supabase Free.`);
  }

  button.disabled = true;
  button.textContent = file ? "Uploading…" : "Sharing…";
  let mediaPath = null;
  try {
    if (file) {
      const extMap = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm" };
      const path = `${socialUser.id}/moments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extMap[file.type]}`;
      const { error: uploadError } = await supabase.storage.from("story-media").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      mediaPath = path;
    }
    if (!content) content = mediaType === "video" ? "🎬 Video story" : "📷 Photo story";
    const { error: insertError } = await supabase.from("moments").insert({
      author_id: socialUser.id,
      content,
      image_url: mediaPath,
      media_type: mediaType,
      visibility: visibilityInput?.value || "everyone"
    });
    if (insertError) {
      if (mediaPath) {
        // Remove the just-uploaded file if its story row could not be saved.
        const { error: cleanupError } = await supabase.storage.from("story-media").remove([mediaPath]);
        if (cleanupError) console.warn("Story upload cleanup:", cleanupError.message);
        showSocialToast("The story could not be saved. Check that the Stories 2.0 SQL has been run.");
      }
      throw insertError;
    }
    input.value = "";
    if (mediaInput) mediaInput.value = "";
    showSocialToast("Story shared! It will expire in 24 hours.");
    await loadMoments();
  } catch (error) {
    console.error("Keturio create story:", error);
    const message = error?.message || "Unable to share this story.";
    if (/bucket|mime|size|not found/i.test(message)) {
      showSocialToast("Check the story-media storage bucket and run the Stories 2.0 SQL.");
    } else if (/media_type|visibility|moment_views|moment_reactions|column/i.test(message)) {
      showSocialToast("Run the Stories 2.0 SQL in Supabase, then try again.");
    } else {
      showSocialToast(message);
    }
  } finally {
    button.disabled = false;
    button.textContent = "Share Story";
  }
}

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

          <div
            class="ket-profile-cover"
            style="${socialProfile.cover_url ? `background-image:url(&quot;${escapeHtml(socialProfile.cover_url)}&quot;)` : ""}"
            role="img"
            aria-label="Profile cover image"
          ></div>

          <div class="ket-profile-avatar-wrap">
            <div class="ket-profile-avatar">
              ${
                socialProfile.avatar_url
                  ? `
                    <img
                      src="${escapeHtml(socialProfile.avatar_url)}"
                      alt="Profile photo"
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

        <p class="ket-profile-media-help">
          Personalise your profile with a photo and a wide cover image. JPG, PNG, WebP or GIF; maximum 5 MB per image.
        </p>

        <label class="ket-field">
          <span>Profile photo</span>
          <input
            class="ket-profile-file-input"
            id="ketAvatarUpload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
          >
        </label>

        <label class="ket-field">
          <span>Cover image</span>
          <input
            class="ket-profile-file-input"
            id="ketCoverUpload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
          >
        </label>

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

  container
    .querySelector("#ketAvatarUpload")
    ?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) uploadProfileImage(file, "avatar");
    });

  container
    .querySelector("#ketCoverUpload")
    ?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) uploadProfileImage(file, "cover");
    });
}


/* =========================================================
   PROFILE IMAGE UPLOADS
========================================================= */

async function uploadProfileImage(file, kind) {
  if (!socialUser) {
    showSocialToast("Please sign in before uploading images.");
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    showSocialToast("Choose a JPG, PNG, WebP or GIF image.");
    return;
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    showSocialToast("Images must be 5 MB or smaller.");
    return;
  }

  const inputId = kind === "avatar" ? "#ketAvatarUpload" : "#ketCoverUpload";
  const input = socialRoot?.querySelector(inputId);
  if (input) input.disabled = true;

  showSocialToast(kind === "avatar" ? "Uploading profile photo…" : "Uploading cover image…");

  try {
    const extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };
    const extension = extensionByType[file.type] || "jpg";
    const path = `${socialUser.id}/${kind}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-media")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from("profile-media")
      .getPublicUrl(path);
    const imageUrl = publicData?.publicUrl;
    if (!imageUrl) throw new Error("Could not create the image URL.");

    const update = kind === "avatar"
      ? { avatar_url: imageUrl }
      : { cover_url: imageUrl };

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", socialUser.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    socialProfile = data;
    showSocialToast(kind === "avatar" ? "Profile photo updated." : "Cover image updated.");
    await renderProfile(socialRoot.querySelector("#ketSocialContent"));
  } catch (error) {
    console.error(`Keturio ${kind} upload:`, error);
    const message = error?.message || "Image upload failed.";
    if (/bucket|not found/i.test(message)) {
      showSocialToast("Storage is not set up yet. Run the profile-media SQL setup first.");
    } else if (/cover_url|column/i.test(message)) {
      showSocialToast("Run the profile-media SQL setup first, then try again.");
    } else {
      showSocialToast(message);
    }
  } finally {
    const currentInput = socialRoot?.querySelector(inputId);
    if (currentInput) currentInput.disabled = false;
  }
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




async function openMomentViewer(index) {
  ketMomentViewerIndex = index;
  const viewer = socialRoot?.querySelector("#ketMomentViewer");
  if (!viewer || !ketMomentCache[index]) return;
  const moment = ketMomentCache[index];
  const author = ketMomentProfileMap.get(moment.author_id) || {};
  const mine = moment.author_id === socialUser?.id;
  if (socialUser?.id) {
    const { error: viewError } = await supabase.from("moment_views").upsert({ moment_id: moment.id, viewer_id: socialUser.id, viewed_at: new Date().toISOString() }, { onConflict: "moment_id,viewer_id" });
    if (viewError) console.warn("Could not record story view:", viewError);
  }
  const { data: reactions } = await supabase.from("moment_reactions").select("user_id, reaction").eq("moment_id", moment.id);
  const myReaction = (reactions || []).find(row => row.user_id === socialUser?.id)?.reaction || "";
  const mediaUrl = moment.media_signed_url || (/^https?:\/\//i.test(moment.image_url || "") ? moment.image_url : "");
  const media = mediaUrl
    ? (moment.media_type === "video"
      ? `<video class="ket-story-viewer-media" src="${escapeHtml(mediaUrl)}" controls autoplay playsinline></video>`
      : `<img class="ket-story-viewer-media" src="${escapeHtml(mediaUrl)}" alt="Story media">`)
    : `<div class="ket-story-viewer-text"><p>${escapeHtml(moment.content || "")}</p></div>`;
  const caption = moment.image_url && moment.content && !/^(📷 Photo story|🎬 Video story)$/.test(moment.content)
    ? `<p class="ket-story-viewer-caption">${escapeHtml(moment.content)}</p>` : "";
  viewer.innerHTML = `<div class="ket-story-viewer-backdrop" data-viewer-close="true"></div><section class="ket-story-viewer-panel" role="dialog" aria-modal="true" aria-label="Keturio story">
    <div class="ket-story-progress"><span style="width:100%"></span></div>
    <header class="ket-story-viewer-header"><div class="ket-avatar">${author.avatar_url ? `<img src="${escapeHtml(author.avatar_url)}" alt="">` : escapeHtml(initials(author.display_name || "Keturio User"))}</div><div class="ket-story-author"><strong>${escapeHtml(author.display_name || "Keturio User")}</strong><span>${escapeHtml(timeAgo(moment.created_at))} · expires ${escapeHtml(formatDate(moment.expires_at))}</span></div><button class="ket-social-button" type="button" data-viewer-close="true" aria-label="Close story">✕</button></header>
    ${caption}<div class="ket-story-viewer-content">${media}</div>
    <footer class="ket-story-viewer-footer"><button class="ket-social-button ${myReaction ? "active" : ""}" type="button" data-story-react="${escapeHtml(moment.id)}">${myReaction ? "❤️ Loved" : "🤍 Love"} · ${(reactions || []).length}</button>${mine ? `<span class="ket-story-view-count">👁 ${(await countMomentViews(moment.id))} views</span><button class="ket-social-button" type="button" data-story-delete="${escapeHtml(moment.id)}">🗑 Delete</button>` : ""}<span class="ket-social-space"></span><button class="ket-social-button" type="button" data-story-share="${escapeHtml(moment.id)}">↗ Share</button><button class="ket-social-button" type="button" data-story-nav="prev" ${index === 0 ? "disabled" : ""}>‹</button><button class="ket-social-button" type="button" data-story-nav="next" ${index >= ketMomentCache.length - 1 ? "disabled" : ""}>›</button></footer>
    <section class="ket-story-replies" aria-label="Story replies"><div class="ket-story-replies-list" data-story-replies-list><span class="ket-story-view-count">Loading replies…</span></div><form class="ket-story-reply-form" data-story-reply-form><input name="content" maxlength="1000" placeholder="Reply to this story…" aria-label="Reply to this story" required><button type="submit">Send</button></form></section>
  </section>`;
  viewer.hidden = false;
  document.body.classList.add("ket-story-viewing");
  await loadMomentComments(moment.id, viewer.querySelector("[data-story-replies-list]"));
}

async function loadMomentComments(momentId, list) {
  if (!list) return;
  const { data: comments, error } = await supabase.from("moment_comments")
    .select("id, moment_id, author_id, parent_comment_id, content, created_at")
    .eq("moment_id", momentId).order("created_at", { ascending: true }).limit(100);
  if (error) {
    list.innerHTML = `<span class="ket-story-view-count">Story replies need the Story Replies SQL migration. ${escapeHtml(error.message)}</span>`;
    return;
  }
  const authorIds = [...new Set((comments || []).map(c => c.author_id))];
  let profiles = [];
  if (authorIds.length) {
    const result = await supabase.from("profiles").select("id, display_name, username").in("id", authorIds);
    profiles = result.data || [];
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const children = new Map();
  for (const comment of comments || []) {
    const parent = comment.parent_comment_id || "__root__";
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(comment);
  }
  const render = (parentId="__root__", depth=0) => (children.get(parentId) || []).map(comment => {
    const profile = profileMap.get(comment.author_id) || {};
    return `<div class="ket-story-reply ${depth ? "ket-story-reply-nested" : ""}"><strong>${escapeHtml(profile.display_name || profile.username || "Keturio User")}</strong>${escapeHtml(comment.content)}<small>${escapeHtml(timeAgo(comment.created_at))}</small><button type="button" class="ket-comment-reply-toggle" data-story-reply-to="${escapeHtml(comment.id)}" data-story-reply-name="${escapeHtml(profile.display_name || profile.username || "user")}">Reply</button>${render(comment.id, depth + 1)}</div>`;
  }).join("");
  list.innerHTML = render() || `<span class="ket-story-view-count">No replies yet. Be the first to reply.</span>`;
  list.querySelectorAll("[data-story-reply-to]").forEach(button => button.addEventListener("click", () => {
    const form = socialRoot?.querySelector("[data-story-reply-form]");
    if (!form) return;
    form.dataset.parentComment = button.dataset.storyReplyTo;
    const input = form.elements.content;
    input.placeholder = `Reply to ${button.dataset.storyReplyName}…`;
    const submit = form.querySelector("button[type=submit]");
    if (submit) submit.textContent = "Reply";
    input.focus();
    let cancel = form.querySelector("[data-cancel-story-reply]");
    if (!cancel) {
      cancel = document.createElement("button"); cancel.type = "button"; cancel.dataset.cancelStoryReply = "true"; cancel.textContent = "×"; cancel.setAttribute("aria-label", "Cancel reply");
      cancel.addEventListener("click", () => { delete form.dataset.parentComment; input.placeholder = "Reply to this story…"; const send = form.querySelector("button[type=submit]"); if (send) send.textContent = "Send"; cancel.remove(); });
      form.insertBefore(cancel, form.querySelector("button[type=submit]"));
    }
  }));
}

async function countMomentViews(momentId) {
  const { count, error } = await supabase.from("moment_views").select("viewer_id", { count: "exact", head: true }).eq("moment_id", momentId);
  return error ? 0 : (count || 0);
}

async function handleMomentViewerAction(event) {
  const share = event.target.closest("[data-story-share]");
  if (share) {
    const moment = ketMomentCache.find(item => item.id === share.dataset.storyShare);
    const url = `${location.origin}${location.pathname}#story-${encodeURIComponent(share.dataset.storyShare)}`;
    const text = `${moment?.content || "Check out this story on Keturio"}\n${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Keturio story", text, url }); } catch (error) { if (error?.name !== "AbortError") showSocialToast("Unable to share this story."); }
    } else if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); showSocialToast("Story link copied. Share it in your favourite app."); } catch { showSocialToast(text); }
    } else { showSocialToast(text); }
    return;
  }
  const close = event.target.closest("[data-viewer-close]");
  if (close) return closeMomentViewer();
  const nav = event.target.closest("[data-story-nav]");
  if (nav) return moveMomentViewer(nav.dataset.storyNav === "next" ? 1 : -1);
  const react = event.target.closest("[data-story-react]");
  if (react) {
    if (!socialUser) return showSocialToast("Please sign in to react.");
    const momentId = react.dataset.storyReact;
    const { data: existing, error: findError } = await supabase.from("moment_reactions").select("reaction").eq("moment_id", momentId).eq("user_id", socialUser.id).maybeSingle();
    if (findError) return showSocialToast(findError.message);
    if (existing) {
      const { error } = await supabase.from("moment_reactions").delete().eq("moment_id", momentId).eq("user_id", socialUser.id);
      if (error) return showSocialToast(error.message);
    } else {
      const { error } = await supabase.from("moment_reactions").upsert({ moment_id: momentId, user_id: socialUser.id, reaction: "love" }, { onConflict: "moment_id,user_id" });
      if (error) return showSocialToast(error.message);
    }
    await openMomentViewer(ketMomentViewerIndex);
    await loadMoments();
    return;
  }
  const del = event.target.closest("[data-story-delete]");
  if (del) {
    const moment = ketMomentCache.find(item => item.id === del.dataset.storyDelete);
    if (!moment || moment.author_id !== socialUser?.id) return showSocialToast("You can only delete your own story.");
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    const { error } = await supabase.from("moments").delete().eq("id", moment.id).eq("author_id", socialUser.id);
    if (error) return showSocialToast(error.message);
    if (moment.image_url && !/^https?:\/\//i.test(moment.image_url)) {
      const { error: storageError } = await supabase.storage.from("story-media").remove([moment.image_url]);
      if (storageError) console.warn("Story media cleanup:", storageError.message);
    }
    showSocialToast("Story deleted.");
    closeMomentViewer();
    await loadMoments();
  }
}

function moveMomentViewer(direction) {
  const next = ketMomentViewerIndex + direction;
  if (next >= 0 && next < ketMomentCache.length) openMomentViewer(next);
}

function closeMomentViewer() {
  const viewer = socialRoot?.querySelector("#ketMomentViewer");
  if (viewer) { viewer.hidden = true; viewer.innerHTML = ""; }
  document.body.classList.remove("ket-story-viewing");
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
   ---------------------------------------------------------
   IMPORTANT:
   The Social button is already present in index.html.
   This function intentionally does NOTHING so that
   social.js does not create a second Social button.
========================================================= */

function createSocialNavigation() {

  // Social navigation is already provided by index.html.
  // Do not create another button here.
  return;
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

      /*
       * Do NOT create another Social button here.
       * index.html already provides it.
       */

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

    /*
     * The Social button already exists in index.html.
     * createSocialNavigation() intentionally does nothing.
     */

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
    openSocial("profile"),

  openNotifications: () =>
    openSocial("notifications")

};
