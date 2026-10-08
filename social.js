
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   KETURIO STAGE 3 — SOCIAL MODULE
   This module is deliberately separate from app.js.
========================================================= */

const cfg = window.KETURIO_CONFIG;
const supabaseSocial = createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

let socialUser = null;
let socialProfiles = new Map();
let activeSocialTab = "feed";

const $s = (selector) => document.querySelector(selector);

function socialToast(message, error = false) {
  const toast = $s("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  toast.style.borderColor = error ? "rgba(255,113,133,.4)" : "";
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "K") {
  return (name.trim()[0] || "K").toUpperCase();
}

function timeAgo(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

async function getMe() {
  const { data, error } = await supabaseSocial.auth.getUser();
  if (error) throw error;
  socialUser = data.user;
  return socialUser;
}

async function ensureProfile() {
  if (!socialUser) return null;

  const { data, error } = await supabaseSocial
    .from("profiles")
    .select("id,display_name,username,bio,avatar_url,last_seen")
    .eq("id", socialUser.id)
    .maybeSingle();

  if (error) throw error;

  const profile = data || {
    id: socialUser.id,
    display_name: socialUser.user_metadata?.display_name || "Keturio User",
    username: "",
    bio: "",
    avatar_url: ""
  };

  socialProfiles.set(profile.id, profile);
  return profile;
}

function injectSocialStyles() {
  if ($s("#keturioStage3Styles")) return;

  const style = document.createElement("style");
  style.id = "keturioStage3Styles";
  style.textContent = `
    #keturioSocialBar{
      display:flex;gap:7px;padding:9px 12px;border-bottom:1px solid var(--line);
      overflow:auto;scrollbar-width:none;
    }
    #keturioSocialBar::-webkit-scrollbar{display:none}
    .k3-tab{
      flex:0 0 auto;border:1px solid var(--line);background:rgba(255,255,255,.035);
      color:var(--muted);border-radius:999px;padding:8px 12px;font-size:11px;
    }
    .k3-tab.active{background:linear-gradient(135deg,var(--accent),#6249d8);color:#fff;border-color:transparent}
    #keturioSocialView{
      position:fixed;inset:0;z-index:70;background:var(--bg);color:var(--text);
      overflow:auto;display:none;
    }
    #keturioSocialView.open{display:block}
    .k3-shell{width:min(760px,100%);margin:auto;min-height:100%;padding-bottom:40px}
    .k3-head{
      position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;
      padding:14px 16px;border-bottom:1px solid var(--line);
      background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(18px)
    }
    .k3-head h2{margin:0;font-size:18px;flex:1}
    .k3-icon{border:0;background:transparent;color:var(--text);font-size:24px}
    .k3-compose,.k3-card,.k3-profile{
      margin:12px;border:1px solid var(--line);border-radius:20px;background:var(--panel);
      box-shadow:0 10px 35px rgba(0,0,0,.12)
    }
    .k3-compose{padding:13px}
    .k3-compose textarea{
      width:100%;min-height:82px;resize:vertical;border:0;outline:0;background:transparent;
      color:var(--text);font:inherit;font-size:14px
    }
    .k3-row{display:flex;align-items:center;gap:9px}
    .k3-spacer{flex:1}
    .k3-primary{
      border:0;border-radius:12px;padding:9px 14px;background:linear-gradient(135deg,var(--accent),var(--accent2));
      color:#fff;font-weight:800
    }
    .k3-card{padding:14px}
    .k3-user{display:flex;align-items:center;gap:10px}
    .k3-avatar{
      width:42px;height:42px;border-radius:14px;display:grid;place-items:center;
      background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:900;flex:0 0 auto
    }
    .k3-user strong,.k3-user span{display:block}
    .k3-user span,.k3-muted{color:var(--muted);font-size:11px}
    .k3-body{font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;margin:13px 0}
    .k3-actions{display:flex;gap:6px;flex-wrap:wrap}
    .k3-action{
      border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:999px;padding:7px 10px;font-size:11px
    }
    .k3-action.active{color:#fff;background:rgba(124,92,255,.22);border-color:rgba(124,92,255,.5)}
    .k3-search{
      margin:12px;width:calc(100% - 24px);padding:12px 14px;border:1px solid var(--line);
      border-radius:14px;background:var(--panel);color:var(--text);outline:0
    }
    .k3-person{display:flex;align-items:center;gap:10px;margin:8px 12px;padding:12px;border:1px solid var(--line);border-radius:17px;background:var(--panel)}
    .k3-person-copy{flex:1;min-width:0}
    .k3-person-copy strong,.k3-person-copy span{display:block;overflow:hidden;text-overflow:ellipsis}
    .k3-person-copy span{font-size:11px;color:var(--muted);margin-top:3px}
    .k3-profile{padding:20px;text-align:center}
    .k3-profile .k3-avatar{width:76px;height:76px;border-radius:24px;margin:auto;font-size:27px}
    .k3-profile h3{margin:12px 0 2px;font-size:22px}
    .k3-profile p{color:var(--muted);font-size:13px}
    .k3-editor{display:grid;gap:10px;text-align:left;margin-top:18px}
    .k3-editor input,.k3-editor textarea{
      width:100%;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035);
      color:var(--text);padding:11px;outline:0
    }
    .k3-moment{
      padding:14px;border:1px solid var(--line);border-radius:17px;background:var(--panel);margin:8px 12px
    }
    .k3-empty{padding:40px 20px;text-align:center;color:var(--muted);font-size:13px}
    @media(max-width:760px){#keturioSocialView{inset:0}.k3-card,.k3-compose,.k3-profile{border-radius:17px}}
  `;
  document.head.appendChild(style);
}

function injectSocialBar() {
  const sidebar = $s(".sidebar");
  if (!sidebar || $s("#keturioSocialBar")) return;

  const bar = document.createElement("div");
  bar.id = "keturioSocialBar";
  bar.innerHTML = `
    <button class="k3-tab active" data-k3="feed">Feed</button>
    <button class="k3-tab" data-k3="people">People</button>
    <button class="k3-tab" data-k3="moments">Moments</button>
    <button class="k3-tab" data-k3="profile">My profile</button>
  `;
  sidebar.insertBefore(bar, sidebar.querySelector(".search-wrap"));

  bar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-k3]");
    if (!button) return;
    openSocial(button.dataset.k3);
  });
}

function injectSocialView() {
  if ($s("#keturioSocialView")) return;

  const view = document.createElement("section");
  view.id = "keturioSocialView";
  view.innerHTML = `
    <div class="k3-shell">
      <header class="k3-head">
        <button class="k3-icon" id="k3Close" aria-label="Close">‹</button>
        <h2 id="k3Title">Keturio Feed</h2>
        <button class="k3-icon" id="k3Refresh" aria-label="Refresh">↻</button>
      </header>
      <div id="k3Content"></div>
    </div>
  `;
  document.body.appendChild(view);
  $s("#k3Close")?.addEventListener("click", closeSocial);
  $s("#k3Refresh")?.addEventListener("click", () => renderSocial(activeSocialTab));
}

function openSocial(tab) {
  activeSocialTab = tab;
  injectSocialView();
  $s("#keturioSocialView")?.classList.add("open");
  renderSocial(tab);
}

function closeSocial() {
  $s("#keturioSocialView")?.classList.remove("open");
}

async function renderSocial(tab) {
  activeSocialTab = tab;
  const content = $s("#k3Content");
  const title = $s("#k3Title");
  if (!content || !title) return;

  const titles = {feed:"Keturio Feed",people:"Discover People",moments:"Moments",profile:"My Profile"};
  title.textContent = titles[tab] || "Keturio";

  content.innerHTML = `<div class="k3-empty">Loading Keturio…</div>`;

  try {
    if (tab === "feed") await renderFeed(content);
    if (tab === "people") await renderPeople(content);
    if (tab === "moments") await renderMoments(content);
    if (tab === "profile") await renderProfile(content);
  } catch (error) {
    console.error("KETURIO SOCIAL ERROR", error);
    content.innerHTML = `<div class="k3-empty">${escapeHtml(error.message || "Could not load social content.")}</div>`;
  }
}

async function renderFeed(content) {
  content.innerHTML = `
    <form class="k3-compose" id="k3PostForm">
      <textarea id="k3PostText" maxlength="5000" placeholder="What's happening in your Keturio world?"></textarea>
      <div class="k3-row">
        <span class="k3-muted">Share with your Keturio community</span>
        <span class="k3-spacer"></span>
        <button class="k3-primary" type="submit">Post</button>
      </div>
    </form>
    <div id="k3FeedList"></div>
  `;

  $s("#k3PostForm")?.addEventListener("submit", createPost);

  const { data: posts, error } = await supabaseSocial
    .from("posts")
    .select("id,author_id,content,created_at")
    .order("created_at", { ascending:false })
    .limit(50);

  if (error) throw error;

  const authorIds = [...new Set((posts || []).map(p => p.author_id))];
  await loadProfiles(authorIds);

  const list = $s("#k3FeedList");
  if (!posts?.length) {
    list.innerHTML = `<div class="k3-empty">Your Keturio feed is ready. Be the first to post.</div>`;
    return;
  }

  const { data: reactions } = await supabaseSocial
    .from("post_reactions")
    .select("post_id,user_id,reaction")
    .in("post_id", posts.map(p => p.id));

  const counts = {};
  for (const r of reactions || []) {
    counts[r.post_id] ||= {like:0,love:0,laugh:0,wow:0,sad:0,angry:0, mine:null};
    counts[r.post_id][r.reaction]++;
    if (r.user_id === socialUser.id) counts[r.post_id].mine = r.reaction;
  }

  list.innerHTML = posts.map(post => {
    const p = socialProfiles.get(post.author_id) || {};
    const c = counts[post.id] || {like:0,love:0,laugh:0,wow:0,sad:0,angry:0,mine:null};
    return `
      <article class="k3-card">
        <div class="k3-user">
          <div class="k3-avatar">${initials(escapeHtml(p.display_name || "Keturio User"))}</div>
          <div>
            <strong>${escapeHtml(p.display_name || "Keturio User")}</strong>
            <span>${p.username ? "@"+escapeHtml(p.username)+" · " : ""}${timeAgo(post.created_at)}</span>
          </div>
        </div>
        <div class="k3-body">${escapeHtml(post.content)}</div>
        <div class="k3-actions">
          ${["like","love","laugh","wow"].map(r => `<button class="k3-action ${c.mine===r?"active":""}" data-react="${r}" data-post="${post.id}">${{like:"👍",love:"❤️",laugh:"😂",wow:"😮"}[r]} ${c[r] || 0}</button>`).join("")}
          ${post.author_id === socialUser.id ? `<button class="k3-action" data-delete="${post.id}">Delete</button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  list.addEventListener("click", handleFeedAction);
}

async function createPost(event) {
  event.preventDefault();
  const text = $s("#k3PostText")?.value.trim();
  if (!text) return;

  const { error } = await supabaseSocial.from("posts").insert({
    author_id: socialUser.id,
    content: text
  });
  if (error) {
    socialToast(error.message, true);
    return;
  }
  socialToast("Posted to Keturio.");
  renderSocial("feed");
}

async function handleFeedAction(event) {
  const react = event.target.closest("[data-react]");
  const del = event.target.closest("[data-delete]");

  if (react) {
    const postId = react.dataset.post;
    const reaction = react.dataset.react;
    const { data: existing } = await supabaseSocial
      .from("post_reactions")
      .select("reaction")
      .eq("post_id", postId)
      .eq("user_id", socialUser.id)
      .maybeSingle();

    let error;
    if (existing?.reaction === reaction) {
      ({ error } = await supabaseSocial.from("post_reactions").delete().eq("post_id",postId).eq("user_id",socialUser.id));
    } else {
      ({ error } = await supabaseSocial.from("post_reactions").upsert(
        {post_id:postId,user_id:socialUser.id,reaction},
        {onConflict:"post_id,user_id"}
      ));
    }
    if (error) socialToast(error.message, true);
    else renderSocial("feed");
  }

  if (del) {
    const { error } = await supabaseSocial.from("posts").delete().eq("id", del.dataset.delete).eq("author_id", socialUser.id);
    if (error) socialToast(error.message, true);
    else renderSocial("feed");
  }
}

async function renderPeople(content) {
  content.innerHTML = `
    <input class="k3-search" id="k3PeopleSearch" placeholder="Search by name or @username">
    <div id="k3PeopleList"></div>
  `;
  const input = $s("#k3PeopleSearch");
  const list = $s("#k3PeopleList");

  const load = async () => {
    const term = input.value.trim().replace(/^@/,"");
    let query = supabaseSocial.from("profiles")
      .select("id,display_name,username,bio,avatar_url")
      .neq("id",socialUser.id)
      .order("display_name")
      .limit(50);

    if (term) {
      query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data?.length) {
      list.innerHTML = `<div class="k3-empty">No people found.</div>`;
      return;
    }

    await loadProfiles(data.map(p => p.id));

    const followIds = data.map(p => p.id);
    const { data: following } = await supabaseSocial
      .from("follows").select("following_id")
      .eq("follower_id",socialUser.id)
      .in("following_id",followIds);

    const followed = new Set((following || []).map(x => x.following_id));

    list.innerHTML = data.map(p => `
      <div class="k3-person">
        <div class="k3-avatar">${initials(p.display_name || "K")}</div>
        <div class="k3-person-copy">
          <strong>${escapeHtml(p.display_name || "Keturio User")}</strong>
          <span>${p.username ? "@"+escapeHtml(p.username) : "No Keturio ID"}${p.bio ? " · "+escapeHtml(p.bio.slice(0,70)) : ""}</span>
        </div>
        <button class="k3-action ${followed.has(p.id)?"active":""}" data-follow="${p.id}" data-following="${followed.has(p.id)}">${followed.has(p.id)?"Following":"Connect"}</button>
      </div>
    `).join("");

    list.onclick = async (event) => {
      const button = event.target.closest("[data-follow]");
      if (!button) return;
      const id = button.dataset.follow;
      if (button.dataset.following === "true") {
        const { error } = await supabaseSocial.from("follows").delete().eq("follower_id",socialUser.id).eq("following_id",id);
        if (error) socialToast(error.message,true);
      } else {
        const { error } = await supabaseSocial.from("follows").insert({follower_id:socialUser.id,following_id:id});
        if (error) socialToast(error.message,true);
      }
      load();
    };
  };

  input.addEventListener("input", load);
  await load();
}

async function renderMoments(content) {
  content.innerHTML = `
    <form class="k3-compose" id="k3MomentForm">
      <textarea id="k3MomentText" maxlength="1000" placeholder="Share a moment…"></textarea>
      <div class="k3-row">
        <span class="k3-muted">Moments disappear after 24 hours</span>
        <span class="k3-spacer"></span>
        <button class="k3-primary" type="submit">Share</button>
      </div>
    </form>
    <div id="k3MomentList"></div>
  `;

  $s("#k3MomentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = $s("#k3MomentText")?.value.trim();
    if (!text) return;
    const { error } = await supabaseSocial.from("moments").insert({author_id:socialUser.id,content:text});
    if (error) socialToast(error.message,true);
    else { socialToast("Moment shared."); renderSocial("moments"); }
  });

  const { data, error } = await supabaseSocial
    .from("moments")
    .select("id,author_id,content,created_at,expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at",{ascending:false})
    .limit(50);

  if (error) throw error;
  await loadProfiles([...new Set((data || []).map(x => x.author_id))]);

  const list = $s("#k3MomentList");
  if (!data?.length) {
    list.innerHTML = `<div class="k3-empty">No active moments yet.</div>`;
    return;
  }

  list.innerHTML = data.map(m => {
    const p = socialProfiles.get(m.author_id) || {};
    return `
      <article class="k3-moment">
        <div class="k3-user">
          <div class="k3-avatar">${initials(p.display_name || "K")}</div>
          <div><strong>${escapeHtml(p.display_name || "Keturio User")}</strong><span>${p.username ? "@"+escapeHtml(p.username)+" · " : ""}${timeAgo(m.created_at)}</span></div>
        </div>
        <div class="k3-body">${escapeHtml(m.content)}</div>
      </article>
    `;
  }).join("");
}

async function renderProfile(content) {
  const profile = await ensureProfile();
  const { count: followers } = await supabaseSocial.from("follows").select("*",{count:"exact",head:true}).eq("following_id",socialUser.id);
  const { count: following } = await supabaseSocial.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",socialUser.id);

  content.innerHTML = `
    <div class="k3-profile">
      <div class="k3-avatar">${initials(profile?.display_name || "K")}</div>
      <h3>${escapeHtml(profile?.display_name || "Keturio User")}</h3>
      <div class="k3-muted">${profile?.username ? "@"+escapeHtml(profile.username) : "Choose your Keturio ID"}</div>
      <p>${escapeHtml(profile?.bio || "Add a short bio so people know you.")}</p>
      <div class="k3-row" style="justify-content:center;gap:25px;margin:16px 0">
        <span><strong>${followers || 0}</strong><small class="k3-muted"> followers</small></span>
        <span><strong>${following || 0}</strong><small class="k3-muted"> following</small></span>
      </div>

      <form class="k3-editor" id="k3ProfileForm">
        <input id="k3Name" maxlength="60" value="${escapeHtml(profile?.display_name || "")}" placeholder="Display name">
        <input id="k3Username" maxlength="30" value="${escapeHtml(profile?.username || "")}" placeholder="Keturio ID e.g. samuel_dio">
        <textarea id="k3Bio" maxlength="160" placeholder="Short bio">${escapeHtml(profile?.bio || "")}</textarea>
        <button class="k3-primary" type="submit">Save profile</button>
      </form>
    </div>
  `;

  $s("#k3ProfileForm")?.addEventListener("submit", saveProfile);
}

async function saveProfile(event) {
  event.preventDefault();

  const display_name = $s("#k3Name")?.value.trim() || "Keturio User";
  let username = ($s("#k3Username")?.value || "").trim().toLowerCase().replace(/^@/,"").replace(/[^a-z0-9_.]/g,"_");
  const bio = ($s("#k3Bio")?.value || "").trim();

  if (username.length < 3) {
    socialToast("Your Keturio ID must be at least 3 characters.", true);
    return;
  }

  const { data: taken } = await supabaseSocial
    .from("profiles").select("id").ilike("username",username).neq("id",socialUser.id).limit(1);

  if (taken?.length) {
    socialToast("@"+username+" is already taken.", true);
    return;
  }

  const { error } = await supabaseSocial
    .from("profiles")
    .update({display_name,username,bio})
    .eq("id",socialUser.id);

  if (error) {
    socialToast(error.message,true);
    return;
  }

  await supabaseSocial.auth.updateUser({data:{display_name}});
  await ensureProfile();
  socialToast("Profile updated.");
  renderSocial("profile");
}

async function loadProfiles(ids) {
  const missing = ids.filter(id => id && !socialProfiles.has(id));
  if (!missing.length) return;

  const { data, error } = await supabaseSocial
    .from("profiles")
    .select("id,display_name,username,bio,avatar_url")
    .in("id",missing);

  if (error) throw error;
  for (const p of data || []) socialProfiles.set(p.id,p);
}

async function bootSocial() {
  try {
    await getMe();
    if (!socialUser) return;
    injectSocialStyles();
    injectSocialBar();
    injectSocialView();
  } catch (error) {
    console.warn("Keturio Stage 3 could not initialize:", error);
  }
}

supabaseSocial.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    socialUser = session.user;
    setTimeout(bootSocial, 0);
  }
});

bootSocial();
