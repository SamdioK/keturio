import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   KETURIO CONFIG
========================================================= */

const cfg = window.KETURIO_CONFIG;

const SITE_URL =
  "https://samdiok.github.io/keturio/";

const supabase = createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);


/* =========================================================
   STATE
========================================================= */

let me = null;

let currentChat = null;

let currentConversation = null;

let messageChannel = null;

let typingChannel = null;

let typingStopTimer = null;

let remoteTypingTimer = null;

let lastTypingState = false;

let mode = "login";

let lastSeenTimer = null;
let lastSeenUpdateInFlight = false;


/* =========================================================
   DIAGNOSTIC STATE
========================================================= */

const diagnostic = {

  messageStatus: "NOT STARTED",

  typingStatus: "NOT STARTED",

  lastMessageEvent: "NONE",

  lastTypingEvent: "NONE",

  lastError: "NONE",

  messageInsert: "NONE",

  conversation: "NONE"

};


/* =========================================================
   DOM ELEMENTS
========================================================= */

const authScreen = $("#authScreen");

const chatApp = $("#chatApp");

const authForm = $("#authForm");

const authMessage = $("#authMessage");

const nameField = $("#nameField");

const displayName = $("#displayName");

const email = $("#email");

const password = $("#password");

const authSubmit = $("#authSubmit");

const resendConfirm = $("#resendConfirm");

const chatList = $("#chatList");

const chatWall = $("#chatWall");

const messageInput = $("#messageInput");

const composer = $("#composer");

const toast = $("#toast");

const presence = $("#presence");

const personName = $("#personName");

const personAvatar = $("#personAvatar");

const backBtn = $("#backBtn");

const searchInput = $("#searchInput");

const themeBtn = $("#themeBtn");

const emojiBtn = $("#emojiBtn");

const logoutBtn = $("#logoutBtn");

const newChatBtn = $("#newChatBtn");


/* =========================================================
   NOTIFICATION
========================================================= */

function notify(message, error = false) {

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  toast.style.borderColor =
    error
      ? "rgba(255,113,133,.4)"
      : "";

  setTimeout(() => {

    toast.classList.remove("show");

  }, 2800);

  console.log("[KETURIO]", message);
}


/* =========================================================
   DIAGNOSTIC PANEL
========================================================= */

function createDiagnosticPanel() {

  if (
    document.getElementById(
      "keturioDiagnostic"
    )
  ) {
    return;
  }

  const panel =
    document.createElement("div");

  panel.id =
    "keturioDiagnostic";

  panel.style.cssText = `
    position:fixed;
    left:10px;
    right:10px;
    bottom:10px;
    z-index:99999;
    background:#080b12;
    color:#dce7ff;
    border:1px solid rgba(120,160,255,.35);
    border-radius:14px;
    padding:12px;
    font-family:monospace;
    font-size:11px;
    line-height:1.55;
    box-shadow:0 10px 35px rgba(0,0,0,.45);
    max-height:230px;
    overflow:auto;
  `;

  panel.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:7px;
    ">
      <strong style="
        color:#ffffff;
        font-size:12px;
      ">
        KETURIO REALTIME DIAGNOSTIC
      </strong>

      <button
        id="closeDiagnostic"
        style="
          background:none;
          border:0;
          color:#aaa;
          font-size:18px;
          cursor:pointer;
        "
      >
        ×
      </button>
    </div>

    <div id="diagContent">
      Starting diagnostic…
    </div>
  `;

  document.body.appendChild(panel);

  const close =
    document.getElementById(
      "closeDiagnostic"
    );

  close?.addEventListener(
    "click",
    () => {
      panel.style.display = "none";
    }
  );

  updateDiagnostic();
}


/* =========================================================
   UPDATE DIAGNOSTIC
========================================================= */

function updateDiagnostic() {
  const content = document.getElementById("diagContent");
  if (!content) return;

  const colour = (value) => {
    const v = String(value ?? "").toUpperCase();
    if (v.includes("CONNECTED") || v.includes("RECEIVED") || v === "SUCCESS") return "#6dff9a";
    if (v.includes("ERROR") || v.includes("FAILED") || v.includes("TIMEOUT")) return "#ff7185";
    if (v.includes("WAITING") || v.includes("NOT STARTED")) return "#ffd166";
    return "#9db7ff";
  };

  const rows = [
    ["Conversation", diagnostic.conversation || "NONE"],
    ["User", me?.id || "NOT LOGGED IN"],
    ["Message channel", diagnostic.messageStatus],
    ["Typing channel", diagnostic.typingStatus],
    ["Last message event", diagnostic.lastMessageEvent],
    ["Last typing event", diagnostic.lastTypingEvent],
    ["Message insert", diagnostic.messageInsert],
    ["Last error", diagnostic.lastError]
  ];

  content.replaceChildren();
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    const valueNode = document.createElement("span");
    row.append(document.createTextNode(`${label}: `));
    valueNode.textContent = String(value ?? "");
    valueNode.style.color = label === "Last error" ? "#ffb3bd" : colour(value);
    row.append(valueNode);
    content.append(row);
  }

  const hint = document.createElement("div");
  hint.style.cssText = "margin-top:8px;color:#8d9bb8";
  hint.textContent = "Type a message and check the other account.";
  content.append(hint);
}

/* =========================================================
   DIAGNOSTIC LOGGER
========================================================= */

function diagnosticLog(type, value) {

  console.log(
    "[KETURIO DIAGNOSTIC]",
    type,
    value
  );

  if (type === "messageChannel") {
    diagnostic.messageStatus = value;
  }

  if (type === "typingChannel") {
    diagnostic.typingStatus = value;
  }

  if (type === "lastMessageEvent") {
    diagnostic.lastMessageEvent = value;
  }

  if (type === "lastTypingEvent") {
    diagnostic.lastTypingEvent = value;
  }

  if (type === "lastError") {
    diagnostic.lastError = value;
  }

  if (type === "messageInsert") {
    diagnostic.messageInsert = value;
  }

  if (type === "conversation") {
    diagnostic.conversation = value;
  }

  updateDiagnostic();
}


/* =========================================================
   AUTH MODE
========================================================= */

function setAuthMode(next) {

  mode = next;

  $("#loginTab")?.classList.toggle(
    "active",
    mode === "login"
  );

  $("#signupTab")?.classList.toggle(
    "active",
    mode === "signup"
  );

  nameField?.classList.toggle(
    "hidden",
    mode !== "signup"
  );

  if (authSubmit) {

    authSubmit.textContent =
      mode === "login"
        ? "Login"
        : "Create account";
  }

  if (authMessage) {

    authMessage.textContent = "";

    authMessage.classList.remove(
      "error"
    );
  }

  resendConfirm?.classList.add(
    "hidden"
  );
}


$("#loginTab")?.addEventListener(
  "click",
  () => setAuthMode("login")
);

$("#signupTab")?.addEventListener(
  "click",
  () => setAuthMode("signup")
);


/* =========================================================
   RESEND CONFIRMATION
========================================================= */

function showResend(address) {

  if (!resendConfirm) {
    return;
  }

  resendConfirm.classList.remove(
    "hidden"
  );

  resendConfirm.dataset.email =
    address ||
    email?.value?.trim() ||
    "";
}


/* =========================================================
   AUTH FORM
========================================================= */

authForm?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    if (authSubmit) {
      authSubmit.disabled = true;
    }

    if (authMessage) {

      authMessage.textContent =
        "Working…";

      authMessage.classList.remove(
        "error"
      );
    }

    try {

      /* ===========================
         SIGNUP
      =========================== */

      if (mode === "signup") {

        const address =
          email.value.trim();

        const {
          data,
          error
        } =
          await supabase.auth.signUp({

            email: address,

            password:
              password.value,

            options: {

              data: {

                display_name:
                  displayName.value.trim() ||
                  "Keturio User"

              },

              emailRedirectTo:
                SITE_URL
            }
          });

        if (error) {
          throw error;
        }

        if (!data.session) {

          if (authMessage) {

            authMessage.textContent =
              "Account created. Check your email and confirm your account.";
          }

          showResend(address);

        } else {

          await boot(data.user);
        }

      }

      /* ===========================
         LOGIN
      =========================== */

      else {

        const {
          data,
          error
        } =
          await supabase.auth
            .signInWithPassword({

              email:
                email.value.trim(),

              password:
                password.value
            });

        if (error) {
          throw error;
        }

        await boot(data.user);
      }

    }

    catch (err) {

      console.error(
        "AUTH ERROR:",
        err
      );

      diagnosticLog(
        "lastError",
        err?.message ||
        "Authentication failed."
      );

      if (authMessage) {

        authMessage.textContent =
          err?.message ||
          "Authentication failed.";

        authMessage.classList.add(
          "error"
        );
      }

      const message =
        String(
          err?.message || ""
        ).toLowerCase();

      if (
        message.includes("confirm") ||
        message.includes("email")
      ) {

        showResend(
          email?.value?.trim()
        );
      }

    }

    finally {

      if (authSubmit) {
        authSubmit.disabled = false;
      }
    }
  }
);


/* =========================================================
   RESEND CONFIRMATION EMAIL
========================================================= */

resendConfirm?.addEventListener(
  "click",
  async () => {

    const address =
      (
        resendConfirm.dataset.email ||
        email?.value ||
        ""
      ).trim();

    if (!address) {

      notify(
        "Enter your email first.",
        true
      );

      return;
    }

    resendConfirm.disabled = true;

    try {

      const {
        error
      } =
        await supabase.auth.resend({

          type: "signup",

          email: address,

          options: {

            emailRedirectTo:
              SITE_URL
          }
        });

      if (error) {
        throw error;
      }

      if (authMessage) {

        authMessage.textContent =
          "New confirmation email sent.";
      }

      notify(
        "Confirmation email sent."
      );

    }

    catch (err) {

      console.error(
        "RESEND ERROR:",
        err
      );

      diagnosticLog(
        "lastError",
        err?.message ||
        "Could not resend confirmation email."
      );

      if (authMessage) {

        authMessage.textContent =
          err?.message ||
          "Could not resend email.";
      }

    }

    finally {

      resendConfirm.disabled = false;
    }
  }
);


/* =========================================================
   BOOT
========================================================= */

async function boot(user) {

  if (!user) {
    return;
  }

  me = user;

  if (new URLSearchParams(location.search).get("debug") === "1") {
    createDiagnosticPanel();
  }

  authScreen?.classList.add(
    "hidden"
  );

  chatApp?.classList.remove(
    "hidden"
  );

  await loadMyProfile();

  await renderRecentChats();
}


/* =========================================================
   PROFILE PRESENCE HELPERS
========================================================= */

function isRecentlyOnline(lastSeen) {
  if (!lastSeen) return false;
  const stamp = new Date(lastSeen).getTime();
  return Number.isFinite(stamp) && (Date.now() - stamp) <= 2 * 60 * 1000;
}

function formatLastSeen(lastSeen) {
  if (isRecentlyOnline(lastSeen)) return "Online";
  if (!lastSeen) return "Recently active status unavailable";
  const stamp = new Date(lastSeen).getTime();
  if (!Number.isFinite(stamp)) return "Recently active status unavailable";
  const elapsed = Math.max(0, Date.now() - stamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${new Date(stamp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

function setAvatarElement(element, profile) {
  if (!element) return;
  element.replaceChildren();
  const name = profile?.display_name || "Keturio User";
  if (profile?.avatar_url) {
    const img = document.createElement("img");
    img.src = profile.avatar_url;
    img.alt = `${name} profile photo`;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      img.remove();
      element.textContent = name.trim().charAt(0).toUpperCase() || "K";
    };
    element.appendChild(img);
  } else {
    element.textContent = name.trim().charAt(0).toUpperCase() || "K";
  }
}

async function updateMyLastSeen() {
  if (!me || lastSeenUpdateInFlight || document.visibilityState === "hidden") return;
  lastSeenUpdateInFlight = true;
  try {
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id);
  } catch (error) {
    console.warn("Keturio presence update:", error);
  } finally {
    lastSeenUpdateInFlight = false;
  }
}

function startLastSeenHeartbeat() {
  if (lastSeenTimer) clearInterval(lastSeenTimer);
  updateMyLastSeen();
  lastSeenTimer = setInterval(() => {
    if (document.visibilityState === "visible") updateMyLastSeen();
  }, 60000);
}

if (!window.__keturioPresenceListenersBound) {
  window.__keturioPresenceListenersBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") updateMyLastSeen();
  });
  window.addEventListener("pagehide", () => {
    if (me) {
      // Best-effort timestamp; the normal heartbeat remains the source of truth.
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id);
    }
  });
}


/* =========================================================
   PROFILE
========================================================= */

async function loadMyProfile() {
  const { data } = await supabase
    .from("profiles")
    .select("display_name,username,avatar_url,last_seen")
    .eq("id", me.id)
    .maybeSingle();

  const name = data?.display_name || me.user_metadata?.display_name || "Keturio User";
  if ($("#myName")) { $("#myName").textContent = name; }
  if ($("#myEmail")) { $("#myEmail").textContent = data?.username ? `@${data.username}` : (me.email || ""); }
  setAvatarElement($("#myAvatar"), { ...data, display_name: name });
  startLastSeenHeartbeat();
}


/* =========================================================
   PEOPLE
========================================================= */

async function renderPeople(
  filter = ""
) {

  let query =
    supabase
      .from("profiles")
      .select(
        "id,display_name,username,last_seen,avatar_url"
      )
      .neq(
        "id",
        me.id
      )
      .order(
        "display_name"
      )
      .limit(50);

  if (filter.trim()) {

    const term =
      filter
        .trim()
        .replaceAll(",", "");

    query =
      query.or(
        `display_name.ilike.%${term}%,username.ilike.%${term}%`
      );
  }

  const {
    data,
    error
  } = await query;

  if (error) {

    notify(
      error.message,
      true
    );

    return;
  }

  if (!chatList) {
    return;
  }

  chatList.innerHTML = "";

  if (!data?.length) {

    const empty =
      document.createElement(
        "div"
      );

    empty.style.cssText = `
      padding:20px;
      color:var(--muted);
      font-size:12px;
      text-align:center;
    `;

    empty.textContent =
      "No other Keturio users found.";

    chatList.appendChild(
      empty
    );

    return;
  }

  data.forEach(
    person => {

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "chat-item";

      const avatar =
        document.createElement(
          "div"
        );

      avatar.className = "avatar gradient person-avatar";
      setAvatarElement(avatar, person);
      if (isRecentlyOnline(person.last_seen)) avatar.classList.add("is-online");

      const meta =
        document.createElement(
          "div"
        );

      meta.className =
        "chat-meta";

      const name =
        document.createElement(
          "strong"
        );

      name.textContent =
        person.display_name ||
        "Keturio User";

      const username =
        document.createElement(
          "span"
        );

      username.textContent = person.username
        ? `${formatLastSeen(person.last_seen)} · @${person.username}`
        : formatLastSeen(person.last_seen);
      username.classList.toggle("online-label", isRecentlyOnline(person.last_seen));

      meta.append(
        name,
        username
      );

      button.append(
        avatar,
        meta
      );

      button.addEventListener(
        "click",
        () =>
          openDirectChat(
            person
          )
      );

      chatList.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   RECENT CHATS
========================================================= */

function previewMessage(message) {
  if (!message) return "No messages yet — tap to open";
  const type = message.message_type || "text";
  if (type === "image") return "📷 Photo";
  if (type === "video") return "🎬 Video";
  if (type === "audio") return "🎤 Voice message";
  if (type === "file") return "📎 File";
  if (type === "system") return message.content || "Conversation update";
  return message.content || "Message";
}

async function renderRecentChats() {
  if (!me || !chatList) return;
  chatList.innerHTML = "";

  const empty = (message) => {
    const el = document.createElement("div");
    el.style.cssText = "padding:20px;color:var(--muted);font-size:12px;text-align:center;";
    el.textContent = message;
    chatList.appendChild(el);
  };

  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", me.id);

  if (membershipError) {
    console.error("RECENT CHATS MEMBERSHIP ERROR:", membershipError);
    empty("Could not load recent chats. Please refresh.");
    return;
  }

  const ids = [...new Set((memberships || []).map(row => row.conversation_id).filter(Boolean))];
  if (!ids.length) {
    empty("No previous chats yet. Search for a person to start one.");
    return;
  }

  const [{ data: conversations, error: conversationsError }, { data: members, error: membersError }] = await Promise.all([
    supabase.from("conversations").select("id,type,name,avatar_url,created_at").eq("type", "direct").in("id", ids),
    supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids)
  ]);

  if (conversationsError || membersError) {
    console.error("RECENT CHATS LOAD ERROR:", conversationsError || membersError);
    empty("Could not load recent chats. Please refresh.");
    return;
  }

  const peerIds = [...new Set((members || []).map(row => row.user_id).filter(id => id && id !== me.id))];
  const { data: profiles, error: profilesError } = peerIds.length
    ? await supabase.from("profiles").select("id,display_name,username,last_seen,avatar_url").in("id", peerIds)
    : { data: [], error: null };

  if (profilesError) console.warn("RECENT CHATS PROFILES ERROR:", profilesError);
  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
  const memberMap = new Map();
  for (const member of (members || [])) {
    if (!memberMap.has(member.conversation_id)) memberMap.set(member.conversation_id, []);
    memberMap.get(member.conversation_id).push(member.user_id);
  }

  const rows = await Promise.all((conversations || []).map(async conversation => {
    const memberIds = memberMap.get(conversation.id) || [];
    const otherId = memberIds.find(id => id !== me.id);
    const peer = otherId ? profileMap.get(otherId) : null;
    const { data: latestRows, error: latestError } = await supabase
      .from("messages")
      .select("id,content,message_type,sender_id,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestError) console.warn("RECENT CHAT LATEST MESSAGE ERROR:", latestError);
    const latest = latestRows?.[0] || null;
    const isGroup = conversation.type === "group";
    const person = isGroup
      ? { id: otherId || conversation.id, display_name: conversation.name || "Group conversation", avatar_url: conversation.avatar_url, username: "", last_seen: null, is_group: true }
      : (peer || { id: otherId || conversation.id, display_name: "Keturio User", avatar_url: null, username: "", last_seen: null });
    return { conversation, person, latest, sortTime: latest?.created_at || conversation.created_at || "" };
  }));

  rows.sort((a, b) => new Date(b.sortTime || 0) - new Date(a.sortTime || 0));
  if (!rows.length) {
    empty("No previous chats yet. Search for a person to start one.");
    return;
  }

  for (const row of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-item";
    button.classList.toggle("active", currentConversation === row.conversation.id);

    const avatar = document.createElement("div");
    avatar.className = "avatar gradient person-avatar";
    setAvatarElement(avatar, row.person);
    if (isRecentlyOnline(row.person.last_seen)) avatar.classList.add("is-online");

    const meta = document.createElement("div");
    meta.className = "chat-meta";
    const name = document.createElement("strong");
    name.textContent = row.person.display_name || "Keturio User";
    const preview = document.createElement("span");
    const prefix = row.latest?.sender_id === me.id ? "You: " : "";
    preview.textContent = `${prefix}${previewMessage(row.latest)}`;
    preview.title = preview.textContent;
    const time = document.createElement("small");
    time.textContent = row.latest?.created_at ? formatTime(row.latest.created_at) : "";
    time.style.cssText = "display:block;color:var(--muted);font-size:10px;margin-top:3px;";
    meta.append(name, preview, time);
    button.append(avatar, meta);
    button.addEventListener("click", () => openExistingChat(row.person, row.conversation.id));
    chatList.appendChild(button);
  }
}

async function openExistingChat(person, conversationId) {
  await cleanupRealtime();
  currentChat = person;
  currentConversation = conversationId;

  if (personName) personName.textContent = person.display_name || "Keturio User";
  setAvatarElement(personAvatar, person);
  personAvatar?.classList.toggle("is-online", isRecentlyOnline(person.last_seen));
  if (presence) {
    presence.textContent = person.is_group ? "Group conversation" : formatLastSeen(person.last_seen);
    presence.classList.toggle("is-online-text", isRecentlyOnline(person.last_seen));
  }
  chatApp?.classList.add("in-chat");

  try {
    diagnosticLog("conversation", currentConversation);
    await loadMessages();
    await subscribeToMessages();
    await subscribeToTyping();
    renderRecentChats();
  } catch (error) {
    console.error("OPEN EXISTING CHAT ERROR:", error);
    notify(error?.message || "Could not open previous chat.", true);
  }
}


/* =========================================================
   OPEN DIRECT CHAT
========================================================= */

async function openDirectChat(
  person
) {

  await cleanupRealtime();

  currentChat = person;

  if (personName) {

    personName.textContent =
      person.display_name ||
      "Keturio User";
  }

  setAvatarElement(personAvatar, person);
  personAvatar?.classList.toggle("is-online", isRecentlyOnline(person.last_seen));

  if (presence) {
    presence.textContent = formatLastSeen(person.last_seen);
    presence.classList.toggle("is-online-text", isRecentlyOnline(person.last_seen));
  }

  chatApp?.classList.add(
    "in-chat"
  );

  try {

    const {
      data,
      error
    } =
      await supabase.rpc(
        "get_or_create_direct_conversation",
        {
          target_user_id:
            person.id
        }
      );

    if (error) {
      throw error;
    }

    currentConversation =
      data;

    diagnosticLog(
      "conversation",
      currentConversation
    );

    if (presence) {
      presence.textContent = formatLastSeen(currentChat?.last_seen);
      presence.classList.toggle("is-online-text", isRecentlyOnline(currentChat?.last_seen));
    }

    await loadMessages();

    await subscribeToMessages();

    await subscribeToTyping();

  }

  catch (error) {

    console.error(
      "OPEN CHAT ERROR:",
      error
    );

    notify(
      error?.message ||
      "Could not open conversation.",
      true
    );

    if (presence) {
      presence.textContent =
        "unable to open chat";
    }
  }
}


/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadMessages() {

  if (
    !currentConversation ||
    !chatWall
  ) {
    return;
  }

  chatWall.innerHTML = "";

  const {
    data,
    error
  } =
    await supabase
      .from("messages")
      .select(
        "id,sender_id,content,created_at,message_type"
      )
      .eq(
        "conversation_id",
        currentConversation
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      )
      .limit(100);

  if (error) {

    notify(
      error.message,
      true
    );

    return;
  }

  if (!data?.length) {

    showEmptyChat();

    return;
  }

  for (
    const message of data
  ) {

    renderMessage(
      message
    );
  }

  scrollChat(true);
}


/* =========================================================
   EMPTY CHAT
========================================================= */

function showEmptyChat() {

  if (!chatWall) {
    return;
  }

  const empty =
    document.createElement(
      "div"
    );

  empty.className =
    "empty-chat";

  empty.innerHTML = `
    <div class="spark">✦</div>
    <h2>Say hello</h2>
    <p>Your first message will appear here.</p>
  `;

  chatWall.appendChild(
    empty
  );
}


/* =========================================================
   MESSAGE RENDERING + FRIENDLIER TIMESTAMPS
========================================================= */

function dateKey(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateKey(date) === dateKey(today)) return "Today";
  if (dateKey(date) === dateKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric"
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatFullTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function addDayDividerIfNeeded(timestamp) {
  if (!chatWall) return;
  const key = dateKey(timestamp);
  if (!key) return;

  const messages = chatWall.querySelectorAll(".message");
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.dataset.dateKey === key) return;

  const divider = document.createElement("div");
  divider.className = "day-chip";
  divider.dataset.dateKey = key;
  divider.textContent = formatDayLabel(timestamp);
  chatWall.appendChild(divider);
}

function renderMessage(message, options = {}) {
  if (!message?.id || !chatWall || !me) return;

  const messageId = String(message.id);
  const existing = chatWall.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`
  );
  if (existing) return;

  chatWall.querySelector(".empty-chat")?.remove();

  const timestamp = message.created_at || new Date().toISOString();
  const key = dateKey(timestamp);
  addDayDividerIfNeeded(timestamp);

  const row = document.createElement("div");
  row.className = "message" + (message.sender_id === me.id ? " mine" : "");
  if (options.pending) row.classList.add("is-pending");
  if (options.failed) row.classList.add("is-failed");
  row.dataset.messageId = messageId;
  row.dataset.dateKey = key;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = message.content || "";

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const stamp = document.createElement("time");
  stamp.className = "stamp";
  stamp.textContent = formatTime(timestamp);
  stamp.dateTime = new Date(timestamp).toISOString();
  stamp.title = formatFullTimestamp(timestamp);
  stamp.setAttribute("aria-label", `Sent ${formatFullTimestamp(timestamp)}`);
  meta.appendChild(stamp);

  if (message.sender_id === me.id) {
    const state = document.createElement("span");
    state.className = "message-state";
    state.textContent = options.failed ? "Not sent" : options.pending ? "Sending…" : "Sent ✓";
    state.setAttribute("aria-live", "polite");
    meta.appendChild(state);
  }

  bubble.append(text, meta);
  row.appendChild(bubble);
  chatWall.appendChild(row);
}


/* =========================================================
   SMART SCROLL
========================================================= */

function scrollChat(force = false) {
  if (!chatWall) return;

  const distanceFromBottom =
    chatWall.scrollHeight - chatWall.scrollTop - chatWall.clientHeight;
  if (!force && distanceFromBottom >= 140) return;

  requestAnimationFrame(() => {
    chatWall.scrollTop = chatWall.scrollHeight;
  });
}


/* =========================================================
   MESSAGE REALTIME
========================================================= */

async function subscribeToMessages() {

  if (!currentConversation) {
    return;
  }

  if (messageChannel) {

    await supabase.removeChannel(
      messageChannel
    );

    messageChannel = null;
  }

  const conversationId =
    currentConversation;

  messageChannel =
    supabase.channel(
      `keturio-msg-${conversationId}`
    );

  messageChannel.on(
    "postgres_changes",
    {
      event: "INSERT",

      schema: "public",

      table: "messages",

      filter:
        `conversation_id=eq.${conversationId}`

    },
    payload => {

      diagnosticLog(
        "lastMessageEvent",
        "RECEIVED"
      );

      if (
        currentConversation !==
        conversationId
      ) {
        return;
      }

      renderMessage(
        payload.new
      );

      scrollChat();
      renderRecentChats();
    }
  );

  messageChannel.subscribe(
    (
      status,
      error
    ) => {

      console.log(
        "MESSAGE CHANNEL:",
        status,
        error
      );

      if (
        status === "SUBSCRIBED"
      ) {

        diagnosticLog(
          "messageChannel",
          "CONNECTED"
        );

        if (presence) {
          presence.textContent =
            "live";
        }

      }

      else if (
        status === "CHANNEL_ERROR"
      ) {

        diagnosticLog(
          "messageChannel",
          "CHANNEL_ERROR"
        );

        diagnosticLog(
          "lastError",
          JSON.stringify(
            error ||
            "Message channel error"
          )
        );

      }

      else if (
        status === "TIMED_OUT"
      ) {

        diagnosticLog(
          "messageChannel",
          "TIMED_OUT"
        );

        diagnosticLog(
          "lastError",
          JSON.stringify(
            error ||
            "Message channel timed out"
          )
        );
      }
    }
  );
}


/* =========================================================
   TYPING INDICATOR
========================================================= */

function getTypingIndicator() {
  let indicator = document.getElementById("keturioTypingIndicator");
  if (indicator) return indicator;

  indicator = document.createElement("div");
  indicator.id = "keturioTypingIndicator";
  indicator.className = "typing-indicator";
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-live", "polite");
  indicator.innerHTML = `
    <span class="typing-label">Typing</span>
    <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
  `;

  if (composer?.parentNode) {
    composer.parentNode.insertBefore(indicator, composer);
  }
  return indicator;
}


/* =========================================================
   SHOW REMOTE TYPING
========================================================= */

function showRemoteTyping(show) {
  const indicator = getTypingIndicator();
  if (!indicator) return;

  indicator.classList.toggle("is-visible", Boolean(show));
  clearTimeout(remoteTypingTimer);

  if (show) {
    remoteTypingTimer = setTimeout(() => {
      indicator.classList.remove("is-visible");
    }, 3200);
  }
}


/* =========================================================
   TYPING REALTIME
========================================================= */

/*
  IMPORTANT:

  Typing uses a PUBLIC Broadcast channel.

  Messages remain protected through Supabase
  database RLS + Postgres Realtime.

  Typing is temporary/ephemeral, so this avoids
  the private Broadcast authorization problem that
  was causing CHANNEL_ERROR in the previous version.
*/

async function subscribeToTyping() {

  if (!currentConversation) {

    diagnosticLog(
      "typingChannel",
      "NO CONVERSATION"
    );

    return;
  }

  if (typingChannel) {

    await supabase.removeChannel(
      typingChannel
    );

    typingChannel = null;
  }

  const conversationId =
    currentConversation;

  try {

    diagnosticLog(
      "typingChannel",
      "CONNECTING"
    );

    /*
      NO private:true HERE.

      This is intentional.
    */

    typingChannel =
      supabase.channel(
        `keturio-type-${conversationId}`,
        {
          config: {

            broadcast: {

              self: false,

              ack: false
            }
          }
        }
      );


    /* =========================
       RECEIVE TYPING
    ========================= */

    typingChannel.on(
      "broadcast",
      {
        event: "typing"
      },
      ({ payload }) => {

        console.log(
          "KETURIO TYPING RECEIVED:",
          payload
        );

        diagnosticLog(
          "lastTypingEvent",
          payload?.typing
            ? "TYPING RECEIVED"
            : "STOP TYPING RECEIVED"
        );

        if (
          currentConversation !==
          conversationId
        ) {
          return;
        }

        if (!payload) {
          return;
        }

        if (
          payload.user_id ===
          me?.id
        ) {
          return;
        }

        showRemoteTyping(
          Boolean(
            payload.typing
          )
        );
      }
    );


    /* =========================
       SUBSCRIBE
    ========================= */

    typingChannel.subscribe(
      (
        status,
        err
      ) => {

        console.log(
          "KETURIO TYPING STATUS:",
          status,
          err
        );

        if (
          status === "SUBSCRIBED"
        ) {

          diagnosticLog(
            "typingChannel",
            "CONNECTED"
          );

          diagnosticLog(
            "lastError",
            "NONE"
          );

          return;
        }

        if (
          status === "CHANNEL_ERROR"
        ) {

          diagnosticLog(
            "typingChannel",
            "CHANNEL_ERROR"
          );

          diagnosticLog(
            "lastError",
            "Typing channel error"
          );

          return;
        }

        if (
          status === "TIMED_OUT"
        ) {

          diagnosticLog(
            "typingChannel",
            "TIMED_OUT"
          );

          diagnosticLog(
            "lastError",
            "Typing channel timed out"
          );

          return;
        }

        if (
          status === "CLOSED"
        ) {

          diagnosticLog(
            "typingChannel",
            "CLOSED"
          );
        }
      }
    );

  }

  catch (error) {

    console.error(
      "TYPING SETUP ERROR:",
      error
    );

    diagnosticLog(
      "typingChannel",
      "SETUP ERROR"
    );

    diagnosticLog(
      "lastError",
      error?.message ||
      "Typing setup failed"
    );
  }
}


/* =========================================================
   SEND TYPING
========================================================= */

async function broadcastTyping(
  isTyping
) {

  if (
    !typingChannel ||
    !currentConversation ||
    !me
  ) {
    return;
  }

  if (
    lastTypingState ===
    isTyping
  ) {
    return;
  }

  lastTypingState =
    isTyping;

  try {

    await typingChannel.send({

      type: "broadcast",

      event: "typing",

      payload: {

        user_id:
          me.id,

        typing:
          isTyping,

        at:
          Date.now()
      }
    });

  }

  catch (error) {

    console.error(
      "TYPING SEND ERROR:",
      error
    );

    diagnosticLog(
      "lastError",
      error?.message ||
      "Typing send failed"
    );
  }
}


/* =========================================================
   STOP TYPING
========================================================= */

function stopTyping(
  immediate = false
) {

  clearTimeout(
    typingStopTimer
  );

  typingStopTimer = null;

  if (!typingChannel) {
    return;
  }

  if (immediate) {

    lastTypingState = false;

    typingChannel.send({

      type: "broadcast",

      event: "typing",

      payload: {

        user_id:
          me?.id,

        typing: false,

        at:
          Date.now()
      }

    }).catch(
      error => {

        console.debug(
          "STOP TYPING ERROR:",
          error
        );
      }
    );

    return;
  }

  broadcastTyping(false);
}


/* =========================================================
   MESSAGE INPUT
========================================================= */

messageInput?.addEventListener(
  "input",
  () => {

    if (!currentConversation) {
      return;
    }

    broadcastTyping(true);

    clearTimeout(
      typingStopTimer
    );

    typingStopTimer =
      setTimeout(
        () => {

          stopTyping(false);

        },
        1400
      );
  }
);


/* =========================================================
   SEND MESSAGE WITH LOCAL SENDING/FAILED STATE
========================================================= */

composer?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentConversation) {
    notify("Choose a chat first.", true);
    return;
  }

  const content = messageInput?.value?.trim() || "";
  if (!content) return;

  stopTyping(true);

  const sendButton = composer.querySelector(".send-btn");
  if (sendButton) sendButton.disabled = true;

  const conversationId = currentConversation;
  const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const optimisticMessage = {
    id: localId,
    sender_id: me.id,
    content,
    created_at: new Date().toISOString(),
    message_type: "text"
  };

  renderMessage(optimisticMessage, { pending: true });
  scrollChat();
  if (messageInput) messageInput.value = "";

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: me.id,
        content,
        message_type: "text"
      })
      .select("id,sender_id,content,created_at,message_type")
      .single();

    if (error) throw error;

    diagnosticLog("messageInsert", "SUCCESS");

    // Realtime may have rendered the persisted row already.
    const pendingRow = chatWall?.querySelector(
      `[data-message-id="${CSS.escape(localId)}"]`
    );
    if (pendingRow) {
      const previous = pendingRow.previousElementSibling;
      const next = pendingRow.nextElementSibling;
      if (
        previous?.classList.contains("day-chip") &&
        !next?.classList.contains("message")
      ) previous.remove();
      pendingRow.remove();
    }

    if (data && currentConversation === conversationId) {
      renderMessage(data);
      scrollChat();
    }
  } catch (error) {
    console.error("MESSAGE INSERT ERROR:", error);
    diagnosticLog("messageInsert", "FAILED");
    diagnosticLog("lastError", error?.message || "Message could not be sent.");

    const pendingRow = chatWall?.querySelector(
      `[data-message-id="${CSS.escape(localId)}"]`
    );
    if (pendingRow) {
      pendingRow.classList.remove("is-pending");
      pendingRow.classList.add("is-failed");
      const state = pendingRow.querySelector(".message-state");
      if (state) state.textContent = "Not sent";
      const stamp = pendingRow.querySelector(".stamp");
      if (stamp) stamp.title = "Message failed to send";
    }

    if (
      currentConversation === conversationId &&
      messageInput &&
      !messageInput.value
    ) {
      messageInput.value = content;
    }

    notify("Message could not be sent. Check your connection and try again.", true);
  } finally {
    if (sendButton) sendButton.disabled = false;
    messageInput?.focus();
  }
});


/* =========================================================
   BACK BUTTON
========================================================= */

backBtn?.addEventListener(
  "click",
  async () => {

    await cleanupRealtime();

    currentChat = null;

    currentConversation = null;

    diagnosticLog(
      "conversation",
      "NONE"
    );

    diagnosticLog(
      "messageChannel",
      "DISCONNECTED"
    );

    diagnosticLog(
      "typingChannel",
      "DISCONNECTED"
    );

    chatApp?.classList.remove(
      "in-chat"
    );

    if (personName) {
      personName.textContent =
        "Select a chat";
    }

    setAvatarElement(personAvatar, { display_name: "Keturio" });
    personAvatar?.classList.remove("is-online");
    presence?.classList.remove("is-online-text");

    if (presence) {
      presence.textContent =
        "Choose a person";
    }

    if (chatWall) {

      chatWall.innerHTML = `
        <div class="empty-chat">
          <div class="spark">✦</div>
          <h2>Your Keturio chat</h2>
          <p>
            Choose a person to start a real-time conversation.
          </p>
        </div>
      `;
    }
  }
);


/* =========================================================
   SEARCH
========================================================= */

searchInput?.addEventListener(
  "input",
  e => {
    const term = e.target.value || "";
    if (term.trim()) renderPeople(term);
    else renderRecentChats();
  }
);


/* =========================================================
   NEW CHAT
========================================================= */

newChatBtn?.addEventListener(
  "click",
  () => {

    searchInput?.focus();

    notify(
      "Search for a Keturio user to start chatting."
    );
  }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await cleanupRealtime();

      const {
        error
      } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      location.reload();

    }

    catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );

      notify(
        error?.message ||
        "Could not log out.",
        true
      );
    }
  }
);


/* =========================================================
   CLEANUP REALTIME
========================================================= */

async function cleanupRealtime() {

  clearTimeout(
    typingStopTimer
  );

  clearTimeout(
    remoteTypingTimer
  );

  typingStopTimer = null;

  remoteTypingTimer = null;

  lastTypingState = false;

  showRemoteTyping(false);

  if (messageChannel) {

    await supabase.removeChannel(
      messageChannel
    );

    messageChannel = null;
  }

  if (typingChannel) {

    await supabase.removeChannel(
      typingChannel
    );

    typingChannel = null;
  }
}


/* =========================================================
   THEME
========================================================= */

function loadTheme() {

  const saved =
    localStorage.getItem(
      "keturio-theme"
    );

  document.body.classList.toggle(
    "light",
    saved === "light"
  );
}


loadTheme();


themeBtn?.addEventListener(
  "click",
  () => {

    document.body.classList.toggle(
      "light"
    );

    localStorage.setItem(
      "keturio-theme",
      document.body.classList.contains(
        "light"
      )
        ? "light"
        : "dark"
    );
  }
);


/* =========================================================
   EMOJI
========================================================= */

const emojiList = [

  "😀",
  "😂",
  "😍",
  "🥰",
  "😊",
  "😎",
  "🤗",
  "❤️",
  "🔥",
  "👍",
  "🙏",
  "🎉",
  "✨",
  "💙",
  "💖",
  "🤣",
  "😅",
  "😉",
  "😘",
  "🥳",
  "😇",
  "🤩",
  "🙌",
  "👏"

];

let emojiPanel = null;


function toggleEmojiPanel() {

  if (emojiPanel) {

    emojiPanel.remove();

    emojiPanel = null;

    return;
  }

  emojiPanel =
    document.createElement(
      "div"
    );

  emojiPanel.style.cssText = `
    position:absolute;
    bottom:65px;
    left:12px;
    z-index:50;
    display:grid;
    grid-template-columns:repeat(6,1fr);
    gap:4px;
    padding:8px;
    border-radius:14px;
    background:var(--panel,#171a27);
    box-shadow:0 12px 35px rgba(0,0,0,.25);
  `;

  for (
    const emoji of emojiList
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.type = "button";

    button.textContent =
      emoji;

    button.style.cssText = `
      border:0;
      background:transparent;
      font-size:21px;
      padding:5px;
      cursor:pointer;
    `;

    button.addEventListener(
      "click",
      () => {

        if (!messageInput) {
          return;
        }

        const start =
          messageInput.selectionStart ??
          messageInput.value.length;

        const end =
          messageInput.selectionEnd ??
          messageInput.value.length;

        messageInput.value =
          messageInput.value.slice(
            0,
            start
          ) +
          emoji +
          messageInput.value.slice(
            end
          );

        messageInput.focus();

        const position =
          start +
          emoji.length;

        messageInput.setSelectionRange(
          position,
          position
        );

        messageInput.dispatchEvent(
          new Event("input")
        );

        toggleEmojiPanel();
      }
    );

    emojiPanel.appendChild(
      button
    );
  }

  if (
    composer?.parentNode
  ) {

    composer.parentNode.style.position =
      "relative";

    composer.parentNode.appendChild(
      emojiPanel
    );
  }
}


emojiBtn?.addEventListener(
  "click",
  toggleEmojiPanel
);


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "hidden"
    ) {

      stopTyping(true);
    }
  }
);


/* =========================================================
   AUTH SESSION
========================================================= */

supabase.auth.onAuthStateChange(
  async (
    _event,
    session
  ) => {

    if (
      session?.user &&
      !me
    ) {

      await boot(
        session.user
      );
    }
  }
);


/* =========================================================
   INITIAL SESSION
========================================================= */

(async () => {

  try {

    const {
      data,
      error
    } =
      await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (data?.session?.user) {

      await boot(
        data.session.user
      );
    }

  }

  catch (error) {

    console.error(
      "SESSION ERROR:",
      error
    );

    diagnosticLog(
      "lastError",
      error?.message ||
      "Could not restore session."
    );
  }

})();
