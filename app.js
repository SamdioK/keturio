import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   KETURIO
   Main application JavaScript
   ========================================================= */

const CONFIG = window.KETURIO_CONFIG;

const SITE_URL =
  "https://samdiok.github.io/keturio/";

const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);


/* =========================================================
   AUTH ELEMENTS
   ========================================================= */

const authScreen = $("#authScreen");
const chatApp = $("#chatApp");

const authForm = $("#authForm");
const authMessage = $("#authMessage");

const loginTab = $("#loginTab");
const signupTab = $("#signupTab");

const nameField = $("#nameField");
const displayName = $("#displayName");

const email = $("#email");
const password = $("#password");

const authSubmit = $("#authSubmit");
const resendConfirm = $("#resendConfirm");


/* =========================================================
   CHAT ELEMENTS
   ========================================================= */

const chatList = $("#chatList");
const chatWall = $("#chatWall");

const messageInput = $("#messageInput");
const composer = $("#composer");

const searchInput = $("#searchInput");
const newChatBtn = $("#newChatBtn");

const personName = $("#personName");
const personAvatar = $("#personAvatar");
const presence = $("#presence");

const backBtn = $("#backBtn");

const myName = $("#myName");
const myEmail = $("#myEmail");
const myAvatar = $("#myAvatar");

const logoutBtn = $("#logoutBtn");
const themeBtn = $("#themeBtn");
const emojiBtn = $("#emojiBtn");

const toast = $("#toast");


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let authMode = "login";

let me = null;

let currentChat = null;
let currentConversation = null;

let messageChannel = null;
let typingChannel = null;

let typingStopTimer = null;
let remoteTypingTimer = null;

let lastTypingState = false;

let searchTimer = null;


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function notify(message, isError = false) {

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  toast.style.borderColor =
    isError
      ? "rgba(255,113,133,.4)"
      : "";

  window.clearTimeout(
    notify.timer
  );

  notify.timer =
    window.setTimeout(
      () => {
        toast.classList.remove("show");
      },
      2600
    );
}


/* =========================================================
   AUTH MODE
   ========================================================= */

function setAuthMode(mode) {

  authMode = mode;

  loginTab?.classList.toggle(
    "active",
    mode === "login"
  );

  signupTab?.classList.toggle(
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


loginTab?.addEventListener(
  "click",
  () => setAuthMode("login")
);


signupTab?.addEventListener(
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

      if (authMessage) {

        authMessage.textContent =
          "A new confirmation email has been sent.";

        authMessage.classList.remove(
          "error"
        );
      }

      notify(
        "Confirmation email sent."
      );

    } catch (error) {

      if (authMessage) {

        authMessage.textContent =
          error?.message ||
          "Could not resend confirmation email.";

        authMessage.classList.add(
          "error"
        );
      }

    } finally {

      resendConfirm.disabled = false;
    }
  }
);


/* =========================================================
   LOGIN / SIGNUP
   ========================================================= */

authForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

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

    resendConfirm?.classList.add(
      "hidden"
    );

    try {

      /* -----------------------------------------
         SIGN UP
      ----------------------------------------- */

      if (authMode === "signup") {

        const address =
          email.value.trim();

        const name =
          displayName?.value?.trim() ||
          "Keturio User";

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
                display_name: name
              },

              emailRedirectTo:
                SITE_URL
            }
          });

        if (error) {
          throw error;
        }

        /*
          When email confirmation is enabled,
          Supabase returns no session yet.
        */

        if (!data.session) {

          if (authMessage) {

            authMessage.textContent =
              "Account created. Check your email, confirm it, then log in.";

            authMessage.classList.remove(
              "error"
            );
          }

          showResend(address);

          notify(
            "Check your email."
          );

          return;
        }

        await boot(
          data.user
        );

        return;
      }


      /* -----------------------------------------
         LOGIN
      ----------------------------------------- */

      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword({

          email:
            email.value.trim(),

          password:
            password.value
        });

      if (error) {
        throw error;
      }

      await boot(
        data.user
      );

    } catch (error) {

      const message =
        error?.message ||
        "Authentication failed.";

      if (authMessage) {

        authMessage.textContent =
          message;

        authMessage.classList.add(
          "error"
        );
      }

      const lower =
        message.toLowerCase();

      if (
        lower.includes("confirm") ||
        lower.includes("email")
      ) {

        showResend(
          email?.value?.trim()
        );
      }

    } finally {

      if (authSubmit) {
        authSubmit.disabled = false;
      }
    }
  }
);


/* =========================================================
   APPLICATION BOOT
   ========================================================= */

async function boot(user) {

  if (!user) {
    return;
  }

  me = user;

  authScreen?.classList.add(
    "hidden"
  );

  chatApp?.classList.remove(
    "hidden"
  );

  await loadMyProfile();

  await renderPeople(
    searchInput?.value || ""
  );
}


/* =========================================================
   LOAD CURRENT SESSION
   ========================================================= */

async function restoreSession() {

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

  } catch (error) {

    console.error(
      "Keturio session error:",
      error
    );
  }
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabase.auth.onAuthStateChange(
  async (event, session) => {

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {

      await boot(
        session.user
      );
    }

    if (
      event === "SIGNED_OUT"
    ) {

      await cleanupRealtime();

      me = null;
      currentChat = null;
      currentConversation = null;

      chatApp?.classList.add(
        "hidden"
      );

      authScreen?.classList.remove(
        "hidden"
      );
    }
  }
);


/* =========================================================
   PROFILE
   ========================================================= */

async function loadMyProfile() {

  if (!me) {
    return;
  }

  const {
    data,
    error
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

  if (error) {

    console.warn(
      "Profile load:",
      error.message
    );
  }

  const name =
    data?.display_name ||
    me.user_metadata?.display_name ||
    "Keturio User";

  if (myName) {
    myName.textContent = name;
  }

  if (myEmail) {
    myEmail.textContent =
      me.email || "";
  }

  if (myAvatar) {
    myAvatar.textContent =
      name.charAt(0).toUpperCase();
  }

  /*
    Update last_seen without blocking
    the application.
  */

  supabase
    .from("profiles")
    .update({
      last_seen:
        new Date().toISOString()
    })
    .eq(
      "id",
      me.id
    )
    .then(() => {});
}


/* =========================================================
   PEOPLE SEARCH
   ========================================================= */

async function renderPeople(
  filter = ""
) {

  if (!me || !chatList) {
    return;
  }

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
        "display_name",
        {
          ascending: true
        }
      )
      .limit(50);

  const term =
    filter.trim();

  if (term) {

    const safeTerm =
      term
        .replaceAll(",", "")
        .replaceAll("(", "")
        .replaceAll(")", "");

    query =
      query.or(
        `display_name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`
      );
  }

  const {
    data,
    error
  } =
    await query;

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
      document.createElement(
        "div"
      );

    empty.style.cssText =
      `
        padding:20px;
        color:var(--muted);
        font-size:12px;
        text-align:center;
      `;

    empty.textContent =
      term
        ? "No Keturio users found."
        : "No other Keturio users yet.";

    chatList.appendChild(
      empty
    );

    return;
  }

  for (const person of data) {

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
      )
        .charAt(0)
        .toUpperCase();

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
        : "Start a conversation";

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
      () => openDirectChat(person)
    );

    chatList.appendChild(
      button
    );
  }
}


/* =========================================================
   SEARCH INPUT
   ========================================================= */

searchInput?.addEventListener(
  "input",
  () => {

    window.clearTimeout(
      searchTimer
    );

    searchTimer =
      window.setTimeout(
        () => {

          renderPeople(
            searchInput.value
          );

        },
        180
      );
  }
);


/* =========================================================
   OPEN DIRECT CHAT
   ========================================================= */

async function openDirectChat(
  person
) {

  if (!me || !person) {
    return;
  }

  await cleanupRealtime();

  currentChat = person;

  currentConversation = null;

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
      )
        .charAt(0)
        .toUpperCase();
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

    await loadMessages();

    /*
      Message realtime and typing realtime
      are deliberately separate.
    */

    await subscribeToMessages();

    await subscribeToTyping();

  } catch (error) {

    console.error(
      "Open chat error:",
      error
    );

    if (presence) {

      presence.textContent =
        "unable to open chat";
    }

    notify(
      error?.message ||
      "Could not open conversation.",
      true
    );
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

  const chip =
    document.createElement(
      "div"
    );

  chip.className =
    "day-chip";

  chip.textContent =
    "Conversation";

  chatWall.appendChild(
    chip
  );

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

  for (const message of data) {

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

  empty.innerHTML =
    `
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

  /*
    textContent prevents HTML injection.
  */

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
}


/* =========================================================
   TIME FORMAT
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
   SCROLL CHAT
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
   TYPING INDICATOR UI
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

  indicator.textContent =
    "typing…";

  indicator.style.cssText =
    `
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

  window.clearTimeout(
    remoteTypingTimer
  );

  if (show) {

    remoteTypingTimer =
      window.setTimeout(
        () => {

          indicator.style.display =
            "none";

        },
        2500
      );
  }
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
    (payload) => {

      /*
        Ignore events from an old
        conversation.
      */

      if (
        currentConversation !==
        conversationId
      ) {
        return;
      }

      if (
        payload?.new
      ) {

        renderMessage(
          payload.new
        );

        scrollChat();
      }
    }
  );

  messageChannel.subscribe(
    (status, error) => {

      console.log(
        "Keturio message realtime:",
        status,
        error || ""
      );

      if (
        status === "SUBSCRIBED"
      ) {

        if (presence) {
          presence.textContent =
            "live";
        }

      } else if (
        status === "CHANNEL_ERROR"
      ) {

        if (presence) {
          presence.textContent =
            "reconnecting…";
        }

        console.error(
          "Message channel error:",
          error
        );

        notify(
          "Message realtime interrupted.",
          true
        );

      } else if (
        status === "TIMED_OUT"
      ) {

        if (presence) {
          presence.textContent =
            "reconnecting…";
        }
      }
    }
  );
}


/* =========================================================
   AUTHENTICATE REALTIME
   ========================================================= */

async function authenticateRealtime() {

  const {
    data,
    error
  } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const token =
    data?.session?.access_token;

  if (!token) {
    throw new Error(
      "No authenticated session for Realtime."
    );
  }

  /*
    This gives private Realtime channels
    the user's authenticated JWT.
  */

  supabase.realtime.setAuth(
    token
  );
}


/* =========================================================
   PRIVATE TYPING REALTIME
   ========================================================= */

async function subscribeToTyping() {

  if (!currentConversation) {
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

    /*
      Authenticate the Realtime socket
      before opening the private channel.
    */

    await authenticateRealtime();

    typingChannel =
      supabase.channel(
        `keturio-type-${conversationId}`,
        {
          config: {

            private: true,

            broadcast: {
              self: false,
              ack: true
            }
          }
        }
      );


    /* -----------------------------------------
       RECEIVE TYPING
    ----------------------------------------- */

    typingChannel.on(
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

        if (!payload) {
          return;
        }

        /*
          Never display our own typing event.
        */

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


    /* -----------------------------------------
       CONNECT
    ----------------------------------------- */

    typingChannel.subscribe(
      (status, error) => {

        console.log(
          "Keturio typing realtime:",
          status,
          error || ""
        );

        if (
          status === "SUBSCRIBED"
        ) {

          console.log(
            "Keturio typing channel connected."
          );

        } else if (
          status === "CHANNEL_ERROR"
        ) {

          console.error(
            "Keturio typing channel error:",
            error
          );

          /*
            Keep chat usable even if typing
            temporarily fails.
          */

        } else if (
          status === "TIMED_OUT"
        ) {

          console.warn(
            "Keturio typing channel timed out."
          );
        }
      }
    );

  } catch (error) {

    console.error(
      "Typing realtime setup failed:",
      error
    );
  }
}


/* =========================================================
   BROADCAST TYPING
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

  /*
    Do not send duplicate states.
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

  } catch (error) {

    console.debug(
      "Typing broadcast failed:",
      error
    );
  }
}


/* =========================================================
   STOP TYPING
   ========================================================= */

function stopTyping(
  immediate = false
) {

  window.clearTimeout(
    typingStopTimer
  );

  typingStopTimer = null;

  if (!typingChannel) {
    return;
  }

  if (immediate) {

    /*
      Force state change so a STOP event
      is always sent after sending.
    */

    lastTypingState =
      false;

    typingChannel
      .send({

        type: "broadcast",

        event: "typing",

        payload: {

          user_id:
            me?.id,

          typing:
            false,

          at:
            Date.now()
        }

      })
      .catch(
        () => {}
      );

    return;
  }

  broadcastTyping(
    false
  ).catch(
    () => {}
  );
}


/* =========================================================
   MESSAGE INPUT / TYPING
   ========================================================= */

messageInput?.addEventListener(
  "input",
  () => {

    if (!currentConversation) {
      return;
    }

    /*
      Tell the other person immediately.
    */

    broadcastTyping(
      true
    ).catch(
      () => {}
    );


    /*
      Restart inactivity timer.
    */

    window.clearTimeout(
      typingStopTimer
    );

    typingStopTimer =
      window.setTimeout(
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

composer?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (
      !currentConversation
    ) {

      notify(
        "Choose a person first.",
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

    /*
      Stop typing immediately.
    */

    stopTyping(true);

    /*
      Prevent double taps.
    */

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

      /*
        Render our own message immediately.
        Realtime will also deliver it, but
        renderMessage prevents duplicates.
      */

      if (data) {

        renderMessage(
          data
        );

        scrollChat();
      }

      messageInput.value = "";

    } catch (error) {

      console.error(
        "Send message error:",
        error
      );

      notify(
        error?.message ||
        "Message could not be sent.",
        true
      );

    } finally {

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

      chatWall.innerHTML =
        `
          <div class="empty-chat">
            <div class="spark">✦</div>
            <h2>Your Keturio chat</h2>
            <p>Choose a person to start a real-time conversation.</p>
          </div>
        `;
    }
  }
);


/* =========================================================
   NEW CHAT
   ========================================================= */

newChatBtn?.addEventListener(
  "click",
  () => {

    searchInput?.focus();

    searchInput?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
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

      currentChat = null;
      currentConversation = null;
      me = null;

      notify(
        "Logged out."
      );

    } catch (error) {

      console.error(
        "Logout error:",
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

  window.clearTimeout(
    typingStopTimer
  );

  window.clearTimeout(
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

  if (
    saved === "light"
  ) {

    document.body.classList.add(
      "light"
    );

  } else {

    document.body.classList.remove(
      "light"
    );
  }
}


themeBtn?.addEventListener(
  "click",
  () => {

    document.body.classList.toggle(
      "light"
    );

    const isLight =
      document.body.classList.contains(
        "light"
      );

    localStorage.setItem(
      "keturio-theme",
      isLight
        ? "light"
        : "dark"
    );
  }
);


/* =========================================================
   EMOJI BUTTON
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
  "🎉"
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

  emojiPanel.style.cssText =
    `
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

  for (const emoji of emojiList) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.textContent =
      emoji;

    button.style.cssText =
      `
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
    composer &&
    composer.parentNode
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
   CLOSE EMOJI PANEL
   ========================================================= */

document.addEventListener(
  "click",
  (event) => {

    if (
      !emojiPanel ||
      !emojiBtn
    ) {
      return;
    }

    if (
      event.target === emojiBtn ||
      emojiPanel.contains(
        event.target
      )
    ) {
      return;
    }

    emojiPanel.remove();

    emojiPanel = null;
  }
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
   START KETURIO
   ========================================================= */

loadTheme();

restoreSession();
