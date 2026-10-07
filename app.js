import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.KETURIO_CONFIG;
const SITE_URL = "https://samdiok.github.io/keturio/";

const supabase = createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

const $ = (s) => document.querySelector(s);

let mode = "login";
let me = null;
let currentChat = null;
let currentConversation = null;
let realtimeChannel = null;

let typingStopTimer = null;
let remoteTypingTimer = null;
let lastTypingState = false;

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
const input = $("#messageInput");
const toast = $("#toast");


/* =========================================================
   NOTIFICATIONS
========================================================= */

function notify(message, error = false) {
  toast.textContent = message;
  toast.classList.add("show");

  toast.style.borderColor = error
    ? "rgba(255,113,133,.4)"
    : "";

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}


/* =========================================================
   AUTH MODE
========================================================= */

function setAuthMode(next) {
  mode = next;

  $("#loginTab").classList.toggle(
    "active",
    mode === "login"
  );

  $("#signupTab").classList.toggle(
    "active",
    mode === "signup"
  );

  nameField.classList.toggle(
    "hidden",
    mode !== "signup"
  );

  authSubmit.textContent =
    mode === "login"
      ? "Login"
      : "Create account";

  authMessage.textContent = "";
  authMessage.classList.remove("error");

  if (resendConfirm) {
    resendConfirm.classList.add("hidden");
  }
}


function showResend(address) {
  if (!resendConfirm) return;

  resendConfirm.classList.remove("hidden");

  resendConfirm.dataset.email =
    address || email.value.trim();
}


$("#loginTab").addEventListener(
  "click",
  () => setAuthMode("login")
);

$("#signupTab").addEventListener(
  "click",
  () => setAuthMode("signup")
);


/* =========================================================
   LOGIN / SIGNUP
========================================================= */

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  authSubmit.disabled = true;

  authMessage.textContent = "Working…";
  authMessage.classList.remove("error");

  if (resendConfirm) {
    resendConfirm.classList.add("hidden");
  }

  try {

    /* ---------------- SIGN UP ---------------- */

    if (mode === "signup") {

      const address = email.value.trim();

      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: address,
        password: password.value,

        options: {
          data: {
            display_name:
              displayName.value.trim() ||
              "Keturio User"
          },

          emailRedirectTo: SITE_URL
        }
      });

      if (error) {
        throw error;
      }

      if (!data.session) {

        authMessage.textContent =
          "Account created. Check your email, then confirm it and log in.";

        showResend(address);

      } else {

        await boot(data.user);

      }

    }

    /* ---------------- LOGIN ---------------- */

    else {

      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });

      if (error) {
        throw error;
      }

      await boot(data.user);
    }

  } catch (err) {

    authMessage.textContent =
      err.message ||
      "Authentication failed.";

    authMessage.classList.add("error");

    const msg =
      String(err.message || "").toLowerCase();

    if (
      msg.includes("confirm") ||
      msg.includes("email")
    ) {
      showResend(email.value.trim());
    }

  } finally {

    authSubmit.disabled = false;
  }
});


/* =========================================================
   RESEND CONFIRMATION EMAIL
========================================================= */

if (resendConfirm) {

  resendConfirm.addEventListener(
    "click",
    async () => {

      const address =
        (
          resendConfirm.dataset.email ||
          email.value ||
          ""
        ).trim();

      if (!address) {
        notify(
          "Enter your email address first.",
          true
        );
        return;
      }

      resendConfirm.disabled = true;

      try {

        const { error } =
          await supabase.auth.resend({
            type: "signup",
            email: address,

            options: {
              emailRedirectTo: SITE_URL
            }
          });

        if (error) {
          throw error;
        }

        authMessage.classList.remove("error");

        authMessage.textContent =
          "A new confirmation email has been sent.";

        notify(
          "Confirmation email sent."
        );

      } catch (err) {

        authMessage.textContent =
          err.message ||
          "Could not resend confirmation email.";

        authMessage.classList.add("error");

      } finally {

        resendConfirm.disabled = false;
      }
    }
  );
}


/* =========================================================
   BOOT
========================================================= */

async function boot(user) {

  if (!user) return;

  if (me?.id === user.id) {
    return;
  }

  me = user;

  authScreen.classList.add("hidden");
  chatApp.classList.remove("hidden");

  await loadMyProfile();

  await renderPeople("");
}


/* =========================================================
   PROFILE
========================================================= */

async function loadMyProfile() {

  const {
    data
  } = await supabase
    .from("profiles")
    .select(
      "display_name,username"
    )
    .eq("id", me.id)
    .maybeSingle();

  const name =
    data?.display_name ||
    me.user_metadata?.display_name ||
    "Keturio User";

  $("#myName").textContent = name;

  $("#myEmail").textContent =
    me.email || "";

  $("#myAvatar").textContent =
    name[0]?.toUpperCase() || "K";

  await supabase
    .from("profiles")
    .update({
      last_seen:
        new Date().toISOString()
    })
    .eq("id", me.id);
}


/* =========================================================
   PEOPLE SEARCH
========================================================= */

async function renderPeople(filter = "") {

  let query =
    supabase
      .from("profiles")
      .select(
        "id,display_name,username,last_seen"
      )
      .neq("id", me.id)
      .order("display_name")
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

  chatList.innerHTML = "";

  if (!data?.length) {

    const empty =
      document.createElement("div");

    empty.style.cssText =
      "padding:20px;color:var(--muted);font-size:12px;text-align:center";

    empty.textContent =
      "No other Keturio users yet. Create another account to test a real chat.";

    chatList.appendChild(empty);

    return;
  }

  data.forEach((person) => {

    const el =
      document.createElement("button");

    el.type = "button";
    el.className = "chat-item";

    const avatar =
      document.createElement("div");

    avatar.className =
      "avatar gradient";

    avatar.textContent =
      (person.display_name || "K")
        [0]
        .toUpperCase();

    const meta =
      document.createElement("div");

    meta.className =
      "chat-meta";

    const strong =
      document.createElement("strong");

    strong.textContent =
      person.display_name ||
      "Keturio User";

    const span =
      document.createElement("span");

    span.textContent =
      person.username
        ? `@${person.username}`
        : "Start a conversation";

    meta.append(
      strong,
      span
    );

    el.append(
      avatar,
      meta
    );

    el.addEventListener(
      "click",
      () => openDirectChat(person)
    );

    chatList.appendChild(el);
  });
}


/* =========================================================
   OPEN CONVERSATION
========================================================= */

async function openDirectChat(person) {

  stopTyping(true);

  currentChat = person;

  $("#personName").textContent =
    person.display_name ||
    "Keturio User";

  $("#personAvatar").textContent =
    (
      person.display_name ||
      "K"
    )[0].toUpperCase();

  $("#presence").textContent =
    "connecting…";

  chatApp.classList.add(
    "in-chat"
  );

  const {
    data,
    error
  } = await supabase.rpc(
    "get_or_create_direct_conversation",
    {
      target_user_id:
        person.id
    }
  );

  if (error) {

    notify(
      error.message,
      true
    );

    $("#presence").textContent =
      "unable to open chat";

    return;
  }

  currentConversation = data;

  await loadMessages();

  await subscribeToMessages();
}


/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadMessages() {

  chatWall.innerHTML = "";

  const day =
    document.createElement("div");

  day.className =
    "day-chip";

  day.textContent =
    "Conversation";

  chatWall.appendChild(day);

  const {
    data,
    error
  } = await supabase
    .from("messages")
    .select(
      "id,sender_id,content,created_at"
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

    const note =
      document.createElement("div");

    note.className =
      "empty-chat";

    note.innerHTML =
      "<div class='spark'>✦</div><h2>Say hello</h2><p>Your first message will appear here.</p>";

    chatWall.appendChild(note);

    return;
  }

  data.forEach(
    renderMessage
  );

  chatWall.scrollTop =
    chatWall.scrollHeight;
}


/* =========================================================
   RENDER MESSAGE
========================================================= */

function renderMessage(message) {

  if (!message?.id) return;

  const existing =
    document.querySelector(
      `[data-message-id="${CSS.escape(
        String(message.id)
      )}"]`
    );

  if (existing) return;

  const empty =
    chatWall.querySelector(
      ".empty-chat"
    );

  if (empty) {
    empty.remove();
  }

  const row =
    document.createElement("div");

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
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.textContent =
    message.content || "";

  const stamp =
    document.createElement("span");

  stamp.className =
    "stamp";

  stamp.textContent =
    new Date(
      message.created_at
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
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
}


/* =========================================================
   TYPING INDICATOR
========================================================= */

function typingIndicator() {

  let indicator =
    $("#keturioTypingIndicator");

  if (indicator) {
    return indicator;
  }

  indicator =
    document.createElement("div");

  indicator.id =
    "keturioTypingIndicator";

  indicator.textContent =
    "typing…";

  indicator.style.cssText =
    [
      "display:none",
      "width:max-content",
      "margin:4px 12px 10px",
      "padding:7px 12px",
      "border-radius:14px",
      "font-size:12px",
      "color:var(--muted)",
      "background:rgba(255,255,255,.06)",
      "font-style:italic"
    ].join(";");

  const composer =
    $("#composer");

  composer.parentNode.insertBefore(
    indicator,
    composer
  );

  return indicator;
}


function showRemoteTyping(show) {

  const indicator =
    typingIndicator();

  indicator.style.display =
    show
      ? "block"
      : "none";

  if (remoteTypingTimer) {
    clearTimeout(
      remoteTypingTimer
    );
  }

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
   REALTIME SUBSCRIPTION
========================================================= */

async function subscribeToMessages() {

  if (!currentConversation) {
    return;
  }

  /*
    Remove old channel first.
  */

  if (realtimeChannel) {

    await supabase.removeChannel(
      realtimeChannel
    );

    realtimeChannel =
      null;
  }

  const conversationId =
    currentConversation;

  /*
    Create ONE channel for:

    1. Database messages
    2. Typing Broadcast
  */

  realtimeChannel =
    supabase.channel(
      `keturio-chat-${conversationId}`,
      {
        config: {
          broadcast: {
            self: false
          }
        }
      }
    );


  /* -----------------------------------------
     INSTANT MESSAGE LISTENER
  ----------------------------------------- */

  realtimeChannel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter:
        `conversation_id=eq.${conversationId}`
    },

    (payload) => {

      /*
        Ignore events belonging to another
        conversation.
      */

      if (
        currentConversation !==
        conversationId
      ) {
        return;
      }

      /*
        Avoid duplicate messages because
        the sender already renders their
        own message immediately.
      */

      const existing =
        document.querySelector(
          `[data-message-id="${CSS.escape(
            String(payload.new.id)
          )}"]`
        );

      if (!existing) {

        renderMessage(
          payload.new
        );

        chatWall.scrollTop =
          chatWall.scrollHeight;
      }
    }
  );


  /* -----------------------------------------
     LIVE TYPING LISTENER
  ----------------------------------------- */

  realtimeChannel.on(
    "broadcast",
    {
      event: "typing"
    },

    ({ payload }) => {

      if (
        currentConversation !==
        conversationId
      ) {
        return;
      }

      if (
        !payload ||
        payload.user_id === me.id
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


  /* -----------------------------------------
     CONNECT
  ----------------------------------------- */

  realtimeChannel.subscribe(
    (status) => {

      console.log(
        "Keturio Realtime:",
        status
      );

      if (
        status ===
        "SUBSCRIBED"
      ) {

        $("#presence").textContent =
          "live";

        notify(
          "Live connection ready."
        );
      }

      else if (
        status ===
        "CHANNEL_ERROR" ||
        status ===
        "TIMED_OUT"
      ) {

        $("#presence").textContent =
          "reconnecting…";

        notify(
          "Live connection interrupted. Reconnecting…",
          true
        );
      }

    }
  );
}


/* =========================================================
   SEND TYPING EVENT
========================================================= */

async function broadcastTyping(
  isTyping
) {

  if (
    !realtimeChannel ||
    !currentConversation
  ) {
    return;
  }

  /*
    Don't repeatedly send the same state.
  */

  if (
    lastTypingState ===
    isTyping
  ) {
    return;
  }

  lastTypingState =
    isTyping;

  try {

    await realtimeChannel.send({
      type: "broadcast",

      event: "typing",

      payload: {
        user_id: me.id,
        typing: isTyping,
        at: Date.now()
      }
    });

  } catch (err) {

    console.debug(
      "Typing broadcast failed:",
      err
    );
  }
}


/* =========================================================
   STOP TYPING
========================================================= */

function stopTyping(
  immediate = false
) {

  if (typingStopTimer) {

    clearTimeout(
      typingStopTimer
    );

    typingStopTimer =
      null;
  }

  if (immediate) {

    lastTypingState =
      false;

    if (realtimeChannel) {

      realtimeChannel
        .send({
          type: "broadcast",

          event: "typing",

          payload: {
            user_id:
              me?.id,

            typing: false,

            at: Date.now()
          }
        })
        .catch(
          () => {}
        );
    }

  } else {

    broadcastTyping(
      false
    ).catch(
      () => {}
    );
  }
}


/* =========================================================
   USER STARTS TYPING
========================================================= */

input.addEventListener(
  "input",
  () => {

    if (
      !currentConversation
    ) {
      return;
    }

    /*
      Immediately tell the other
      user that we are typing.
    */

    broadcastTyping(
      true
    ).catch(
      () => {}
    );


    /*
      Reset the stop timer every
      time another character is
      typed.
    */

    if (typingStopTimer) {

      clearTimeout(
        typingStopTimer
      );
    }

    typingStopTimer =
      setTimeout(
        () => {

          stopTyping(
            false
          );

        },

        1400
      );
  }
);


/* =========================================================
   SEND MESSAGE
========================================================= */

$("#composer").addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    if (
      !currentConversation
    ) {

      notify(
        "Choose a person first.",
        true
      );

      return;
    }

    const value =
      input.value.trim();

    if (!value) {
      return;
    }

    /*
      Stop typing indicator
      immediately.
    */

    stopTyping(true);

    const {
      data,
      error
    } = await supabase
      .from("messages")
      .insert({
        conversation_id:
          currentConversation,

        sender_id:
          me.id,

        content:
          value,

        message_type:
          "text"
      })
      .select(
        "id,sender_id,content,created_at"
      )
      .single();

    if (error) {

      notify(
        error.message,
        true
      );

      return;
    }

    /*
      Display sender's own
      message immediately.
    */

    input.value = "";

    renderMessage(
      data
    );

    chatWall.scrollTop =
      chatWall.scrollHeight;
  }
);


/* =========================================================
   EMOJI
========================================================= */

$("#emojiBtn").addEventListener(
  "click",
  () => {

    input.value +=
      (
        input.value
          ? " "
          : ""
      ) + "✨";

    input.focus();

    input.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );
  }
);


/* =========================================================
   BACK BUTTON
========================================================= */

$("#backBtn").addEventListener(
  "click",
  async () => {

    stopTyping(true);

    if (realtimeChannel) {

      await supabase.removeChannel(
        realtimeChannel
      );

      realtimeChannel =
        null;
    }

    chatApp.classList.remove(
      "in-chat"
    );

    currentChat =
      null;

    currentConversation =
      null;

    showRemoteTyping(
      false
    );
  }
);


/* =========================================================
   SEARCH
========================================================= */

$("#searchInput").addEventListener(
  "input",
  (e) => {

    renderPeople(
      e.target.value
    );
  }
);


/* =========================================================
   THEME
========================================================= */

$("#themeBtn").addEventListener(
  "click",
  () => {

    document.body.classList.toggle(
      "light"
    );
  }
);


/* =========================================================
   LOGOUT
========================================================= */

$("#logoutBtn").addEventListener(
  "click",
  async () => {

    stopTyping(true);

    if (realtimeChannel) {

      await supabase.removeChannel(
        realtimeChannel
      );
    }

    await supabase.auth.signOut();

    location.reload();
  }
);


/* =========================================================
   NEW CHAT
========================================================= */

$("#newChatBtn").addEventListener(
  "click",
  () => {

    $("#searchInput").focus();

    notify(
      "Search for a Keturio user to start chatting."
    );
  }
);


/* =========================================================
   AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
  async (_, session) => {

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
   EXISTING SESSION
========================================================= */

const {
  data: {
    session
  }
} = await supabase.auth.getSession();

if (session?.user) {

  await boot(
    session.user
  );
}
