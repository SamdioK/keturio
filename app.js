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

  const content =
    document.getElementById(
      "diagContent"
    );

  if (!content) {
    return;
  }

  const colour = (value) => {

    const v =
      String(value).toUpperCase();

    if (
      v.includes("CONNECTED") ||
      v.includes("RECEIVED") ||
      v === "SUCCESS"
    ) {
      return "#6dff9a";
    }

    if (
      v.includes("ERROR") ||
      v.includes("FAILED") ||
      v.includes("TIMEOUT")
    ) {
      return "#ff7185";
    }

    if (
      v.includes("WAITING") ||
      v.includes("NOT STARTED")
    ) {
      return "#ffd166";
    }

    return "#9db7ff";
  };

  content.innerHTML = `

    <div>
      Conversation:
      <span style="color:#fff">
        ${diagnostic.conversation || "NONE"}
      </span>
    </div>

    <div>
      User:
      <span style="color:#fff">
        ${me?.id || "NOT LOGGED IN"}
      </span>
    </div>

    <div>
      Message channel:
      <span style="color:${colour(
        diagnostic.messageStatus
      )}">
        ${diagnostic.messageStatus}
      </span>
    </div>

    <div>
      Typing channel:
      <span style="color:${colour(
        diagnostic.typingStatus
      )}">
        ${diagnostic.typingStatus}
      </span>
    </div>

    <div>
      Last message event:
      <span style="color:#fff">
        ${diagnostic.lastMessageEvent}
      </span>
    </div>

    <div>
      Last typing event:
      <span style="color:#fff">
        ${diagnostic.lastTypingEvent}
      </span>
    </div>

    <div>
      Message insert:
      <span style="color:${colour(
        diagnostic.messageInsert
      )}">
        ${diagnostic.messageInsert}
      </span>
    </div>

    <div>
      Last error:
      <span style="color:#ffb3bd">
        ${diagnostic.lastError}
      </span>
    </div>

    <div style="
      margin-top:8px;
      color:#8d9bb8;
    ">
      Type a message and check the other account.
    </div>
  `;
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

  createDiagnosticPanel();

  authScreen?.classList.add(
    "hidden"
  );

  chatApp?.classList.remove(
    "hidden"
  );

  await loadMyProfile();

  await renderPeople("");
}


/* =========================================================
   PROFILE
========================================================= */

async function loadMyProfile() {

  const {
    data
  } =
    await supabase
      .from("profiles")
      .select(
        "display_name,username"
      )
      .eq(
        "id",
        me.id
      )
      .maybeSingle();

  const name =
    data?.display_name ||
    me.user_metadata?.display_name ||
    "Keturio User";

  if ($("#myName")) {
    $("#myName").textContent = name;
  }

  if ($("#myEmail")) {
    $("#myEmail").textContent =
      me.email || "";
  }

  if ($("#myAvatar")) {
    $("#myAvatar").textContent =
      name[0]?.toUpperCase() || "K";
  }

  await supabase
    .from("profiles")
    .update({
      last_seen:
        new Date().toISOString()
    })
    .eq(
      "id",
      me.id
    );
}



/* =========================================================
   KETURIO PROFILE EDITOR
========================================================= */

let profileModal = null;

function profileInitial(name = "K") {
  return (name.trim()[0] || "K").toUpperCase();
}

function closeProfileEditor() {
  profileModal?.remove();
  profileModal = null;
}

function openProfileEditor() {
  if (!me || profileModal) return;

  const currentName =
    $("#myName")?.textContent?.trim() ||
    me.user_metadata?.display_name ||
    "Keturio User";

  profileModal = document.createElement("div");
  profileModal.className = "keturio-modal-backdrop";
  profileModal.innerHTML = `
    <div class="keturio-modal" role="dialog" aria-modal="true" aria-labelledby="profileEditorTitle">
      <div class="keturio-modal-head">
        <div>
          <strong id="profileEditorTitle">Your Keturio identity</strong>
          <span>Keep your profile simple and recognizable.</span>
        </div>
        <button type="button" class="keturio-modal-close" aria-label="Close">×</button>
      </div>

      <div class="keturio-profile-preview">
        <div class="avatar gradient" id="profilePreviewAvatar">K</div>
        <div>
          <strong id="profilePreviewName">${html.escape(currentName)}</strong>
          <span id="profilePreviewUsername">Your username</span>
        </div>
      </div>

      <label class="keturio-modal-field">
        <span>Display name</span>
        <input id="profileEditName" maxlength="60" value="${html.escape(currentName)}" autocomplete="name">
      </label>

      <label class="keturio-modal-field">
        <span>Username</span>
        <input id="profileEditUsername" maxlength="30" placeholder="your_username" autocomplete="username">
        <small>Letters, numbers, dots and underscores.</small>
      </label>

      <div id="profileEditMessage" class="keturio-modal-message"></div>

      <div class="keturio-modal-actions">
        <button type="button" class="keturio-secondary-btn" id="profileCancel">Cancel</button>
        <button type="button" class="keturio-primary-btn" id="profileSave">Save profile</button>
      </div>
    </div>
  `;

  document.body.appendChild(profileModal);

  const nameInput = $("#profileEditName");
  const usernameInput = $("#profileEditUsername");
  const previewAvatar = $("#profilePreviewAvatar");
  const previewName = $("#profilePreviewName");
  const previewUsername = $("#profilePreviewUsername");
  const message = $("#profileEditMessage");

  const existingUsername = profileModal.dataset.username || "";
  // Load the current username directly so the editor always reflects the database.
  supabase
    .from("profiles")
    .select("username")
    .eq("id", me.id)
    .maybeSingle()
    .then(({ data }) => {
      if (data?.username && usernameInput) {
        usernameInput.value = data.username;
        previewUsername.textContent = `@${data.username}`;
      }
    });

  const refreshPreview = () => {
    const nextName = nameInput?.value?.trim() || "Keturio User";
    const nextUsername = usernameInput?.value?.trim().replace(/^@/, "") || "your username";
    if (previewAvatar) previewAvatar.textContent = profileInitial(nextName);
    if (previewName) previewName.textContent = nextName;
    if (previewUsername) previewUsername.textContent = nextUsername === "your username" ? nextUsername : `@${nextUsername}`;
  };

  nameInput?.addEventListener("input", refreshPreview);
  usernameInput?.addEventListener("input", refreshPreview);

  profileModal.querySelector(".keturio-modal-close")?.addEventListener("click", closeProfileEditor);
  $("#profileCancel")?.addEventListener("click", closeProfileEditor);

  profileModal.addEventListener("click", (event) => {
    if (event.target === profileModal) closeProfileEditor();
  });

  $("#profileSave")?.addEventListener("click", async () => {
    const nextName = nameInput?.value?.trim() || "";
    const nextUsername = usernameInput?.value?.trim().replace(/^@/, "") || "";

    if (nextName.length < 2) {
      if (message) message.textContent = "Please enter a display name.";
      return;
    }

    if (nextUsername && !/^[a-zA-Z0-9._]{3,30}$/.test(nextUsername)) {
      if (message) message.textContent = "Username must be 3–30 characters: letters, numbers, dots or underscores.";
      return;
    }

    const saveButton = $("#profileSave");
    if (saveButton) saveButton.disabled = true;
    if (message) message.textContent = "Saving…";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: nextName,
          username: nextUsername || null
        })
        .eq("id", me.id);

      if (error) throw error;

      if (me.user_metadata?.display_name !== nextName) {
        await supabase.auth.updateUser({
          data: { display_name: nextName }
        });
      }

      if ($("#myName")) $("#myName").textContent = nextName;
      if ($("#myAvatar")) $("#myAvatar").textContent = profileInitial(nextName);

      if (currentChat?.id === me.id) {
        if (personName) personName.textContent = nextName;
        if (personAvatar) personAvatar.textContent = profileInitial(nextName);
      }

      notify("Profile updated.");
      closeProfileEditor();
      await renderPeople(searchInput?.value || "");
    } catch (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      if (message) message.textContent = error?.message || "Could not update your profile.";
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  });

  refreshPreview();
  setTimeout(() => nameInput?.focus(), 50);
}

function installProfileEditor() {
  const profileBar = document.querySelector(".profile-bar");
  if (!profileBar || profileBar.dataset.profileEditorInstalled) return;

  profileBar.dataset.profileEditorInstalled = "true";
  profileBar.title = "Edit your Keturio profile";
  profileBar.style.cursor = "pointer";
  profileBar.addEventListener("click", (event) => {
    if (event.target.closest("#logoutBtn")) return;
    openProfileEditor();
  });
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
        "id,display_name,username,last_seen"
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

      avatar.className =
        "avatar gradient";

      avatar.textContent =
        (
          person.display_name ||
          "K"
        )[0].toUpperCase();

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

      username.textContent =
        person.username
          ? `@${person.username}`
          : "Start conversation";

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

  if (personAvatar) {

    personAvatar.textContent =
      (
        person.display_name ||
        "K"
      )[0].toUpperCase();
  }

  if (presence) {
    presence.textContent =
      "connecting…";
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
      presence.textContent =
        "ready";
    }

    await loadMessages();
    restoreDraft();

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

  scrollChat();
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
   RENDER MESSAGE
========================================================= */

function renderMessage(
  message
) {

  if (
    !message?.id ||
    !chatWall ||
    !me
  ) {
    return;
  }

  const existing =
    document.querySelector(
      `[data-message-id="${CSS.escape(
        String(message.id)
      )}"]`
    );

  if (existing) {
    return;
  }

  chatWall
    .querySelector(
      ".empty-chat"
    )
    ?.remove();

  const row =
    document.createElement(
      "div"
    );

  row.className =
    "message" +
    (
      message.sender_id === me.id
        ? " mine"
        : ""
    );

  row.dataset.messageId =
    message.id;

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "bubble";

  bubble.textContent =
    message.content || "";

  const stamp =
    document.createElement(
      "span"
    );

  stamp.className =
    "stamp";

  stamp.textContent =
    formatTime(
      message.created_at
    );

  bubble.appendChild(
    stamp
  );

  row.appendChild(
    bubble
  );

  chatWall.appendChild(
    row
  );

  installMessageActions(row, message);
}


/* =========================================================
   TIME
========================================================= */

function formatTime(
  timestamp
) {

  if (!timestamp) {
    return "";
  }

  return new Date(
    timestamp
  ).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   SCROLL
========================================================= */

function scrollChat() {

  if (!chatWall) {
    return;
  }

  requestAnimationFrame(
    () => {

      chatWall.scrollTop =
        chatWall.scrollHeight;

    }
  );
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

  let indicator =
    document.getElementById(
      "keturioTypingIndicator"
    );

  if (indicator) {
    return indicator;
  }

  indicator =
    document.createElement(
      "div"
    );

  indicator.id =
    "keturioTypingIndicator";

  indicator.innerHTML = `<span class="typing-label">typing</span><span class="typing-dots"><i></i><i></i><i></i></span>`;

  indicator.style.cssText = `
    display:none;
    width:max-content;
    margin:4px 12px 10px;
    padding:7px 12px;
    border-radius:14px;
    font-size:12px;
    color:var(--muted);
    background:rgba(255,255,255,.06);
    font-style:italic;
  `;

  if (
    composer &&
    composer.parentNode
  ) {

    composer.parentNode.insertBefore(
      indicator,
      composer
    );
  }

  return indicator;
}


/* =========================================================
   SHOW REMOTE TYPING
========================================================= */

function showRemoteTyping(
  show
) {

  const indicator =
    getTypingIndicator();

  if (!indicator) {
    return;
  }

  indicator.style.display =
    show
      ? "block"
      : "none";

  clearTimeout(
    remoteTypingTimer
  );

  if (show) {

    remoteTypingTimer =
      setTimeout(
        () => {

          indicator.style.display =
            "none";

        },
        2500
      );
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
   KETURIO MESSAGE ACTIONS + DRAFTS
========================================================= */

function draftKey() {
  return currentConversation
    ? `keturio-draft-${currentConversation}`
    : null;
}

function saveDraft() {
  const key = draftKey();
  if (!key || !messageInput) return;

  const value = messageInput.value || "";
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
}

function restoreDraft() {
  const key = draftKey();
  if (!key || !messageInput) return;

  const value = localStorage.getItem(key) || "";
  messageInput.value = value;

  if (value) {
    requestAnimationFrame(() => {
      messageInput.focus();
      messageInput.setSelectionRange(value.length, value.length);
      broadcastTyping(true);
      clearTimeout(typingStopTimer);
      typingStopTimer = setTimeout(() => stopTyping(false), 1400);
    });
  }
}

async function copyMessageText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify("Message copied.");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    notify("Message copied.");
  }
}

function openMessageActions(message, row) {
  document.querySelector(".keturio-message-menu")?.remove();

  const menu = document.createElement("div");
  menu.className = "keturio-message-menu";
  menu.innerHTML = `
    <button type="button" data-action="copy">Copy</button>
    <button type="button" data-action="quote">Quote</button>
  `;

  document.body.appendChild(menu);

  const rect = row.getBoundingClientRect();
  const width = 140;
  const left = Math.min(
    Math.max(10, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 10
  );
  const top = Math.max(10, rect.top - 58);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  menu.querySelector('[data-action="copy"]')?.addEventListener("click", () => {
    copyMessageText(message.content || "");
    menu.remove();
  });

  menu.querySelector('[data-action="quote"]')?.addEventListener("click", () => {
    if (messageInput) {
      const quote = `↪ "${String(message.content || "").replace(/\n/g, " ")}"\n`;
      messageInput.value = quote + messageInput.value;
      messageInput.focus();
      messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
      saveDraft();
    }
    menu.remove();
  });

  const close = (event) => {
    if (!menu.contains(event.target)) {
      menu.remove();
      document.removeEventListener("pointerdown", close);
    }
  };

  setTimeout(() => document.addEventListener("pointerdown", close), 0);
}

function installMessageActions(row, message) {
  let pressTimer = null;

  row.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openMessageActions(message, row);
  });

  row.addEventListener("pointerdown", () => {
    pressTimer = setTimeout(() => openMessageActions(message, row), 520);
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
    row.addEventListener(type, () => clearTimeout(pressTimer));
  });
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
   SEND MESSAGE
========================================================= */

composer?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!currentConversation) {

      notify(
        "Choose a chat first.",
        true
      );

      return;
    }

    const content =
      messageInput?.value?.trim() ||
      "";

    if (!content) {
      return;
    }

    stopTyping(true);

    const sendButton =
      composer.querySelector(
        ".send-btn"
      );

    if (sendButton) {
      sendButton.disabled = true;
    }

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("messages")
          .insert({

            conversation_id:
              currentConversation,

            sender_id:
              me.id,

            content:
              content,

            message_type:
              "text"

          })
          .select(
            "id,sender_id,content,created_at,message_type"
          )
          .single();

      if (error) {
        throw error;
      }

      diagnosticLog(
        "messageInsert",
        "SUCCESS"
      );

      if (data) {

        renderMessage(
          data
        );

        scrollChat();
      }

      messageInput.value = "";

    }

    catch (error) {

      console.error(
        "MESSAGE INSERT ERROR:",
        error
      );

      diagnosticLog(
        "messageInsert",
        "FAILED"
      );

      diagnosticLog(
        "lastError",
        error?.message ||
        "Message could not be sent."
      );

      notify(
        error?.message ||
        "Message could not be sent.",
        true
      );

    }

    finally {

      if (sendButton) {
        sendButton.disabled = false;
      }

      messageInput?.focus();
    }
  }
);


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

    if (personAvatar) {
      personAvatar.textContent =
        "K";
    }

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
  e =>
    renderPeople(
      e.target.value
    )
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
