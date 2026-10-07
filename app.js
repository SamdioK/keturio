import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   KETURIO — COMPLETE REALTIME DIAGNOSTIC VERSION
   ========================================================= */

const CONFIG = window.KETURIO_CONFIG;

const SITE_URL =
  "https://samdiok.github.io/keturio/";

const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   DOM
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);


/* =========================================================
   AUTH
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
   CHAT
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
   STATE
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
   DIAGNOSTIC PANEL
   ========================================================= */

const diagnostic = {
  conversation: "NONE",
  user: "NONE",

  messageChannel: "DISCONNECTED",
  typingChannel: "DISCONNECTED",

  lastMessageEvent: "NONE",
  lastTypingEvent: "NONE",

  messageInsert: "NONE",

  lastError: "NONE"
};


function diagnosticLog(
  key,
  value
) {

  diagnostic[key] =
    String(value ?? "NONE");

  console.log(
    `[KETURIO ${key}]`,
    value
  );

  renderDiagnostic();
}


function renderDiagnostic() {

  let panel =
    document.getElementById(
      "keturioDiagnostic"
    );

  if (!panel) {

    panel =
      document.createElement(
        "div"
      );

    panel.id =
      "keturioDiagnostic";

    panel.style.cssText =
      `
        position:fixed;
        left:10px;
        right:10px;
        bottom:10px;
        z-index:99999;

        padding:12px;

        border-radius:14px;

        background:#080b12;
        color:#e9edf5;

        border:1px solid
          rgba(255,255,255,.12);

        box-shadow:
          0 12px 40px
          rgba(0,0,0,.4);

        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          Monaco,
          Consolas,
          monospace;

        font-size:10px;

        line-height:1.55;

        max-height:42vh;
        overflow:auto;
      `;

    document.body.appendChild(
      panel
    );
  }

  panel.innerHTML =
    `
      <div style="
        font-weight:800;
        font-size:12px;
        margin-bottom:7px;
        color:#fff;
      ">
        KETURIO REALTIME DIAGNOSTIC
      </div>

      <div>
        <b>Conversation:</b>
        ${escapeDiagnostic(
          diagnostic.conversation
        )}
      </div>

      <div>
        <b>User:</b>
        ${escapeDiagnostic(
          diagnostic.user
        )}
      </div>

      <br>

      <div>
        <b>Message channel:</b>
        ${escapeDiagnostic(
          diagnostic.messageChannel
        )}
      </div>

      <div>
        <b>Typing channel:</b>
        ${escapeDiagnostic(
          diagnostic.typingChannel
        )}
      </div>

      <br>

      <div>
        <b>Last message event:</b>
        ${escapeDiagnostic(
          diagnostic.lastMessageEvent
        )}
      </div>

      <div>
        <b>Last typing event:</b>
        ${escapeDiagnostic(
          diagnostic.lastTypingEvent
        )}
      </div>

      <br>

      <div>
        <b>Message insert:</b>
        ${escapeDiagnostic(
          diagnostic.messageInsert
        )}
      </div>

      <div style="
        margin-top:7px;
        color:#ff8296;
        word-break:break-word;
      ">
        <b>Last error:</b>
        ${escapeDiagnostic(
          diagnostic.lastError
        )}
      </div>
    `;
}


function escapeDiagnostic(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

function notify(
  message,
  isError = false
) {

  if (!toast) {

    console.log(
      message
    );

    return;
  }

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  if (isError) {

    toast.style.borderColor =
      "rgba(255,113,133,.4)";
  }

  clearTimeout(
    notify.timer
  );

  notify.timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2800
    );
}


/* =========================================================
   AUTH MODE
   ========================================================= */

function setAuthMode(
  mode
) {

  authMode =
    mode;

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

    authMessage.textContent =
      "";

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

function showResend(
  address
) {

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

    resendConfirm.disabled =
      true;

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

      resendConfirm.disabled =
        false;
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

    authSubmit &&
      (authSubmit.disabled = true);

    resendConfirm?.classList.add(
      "hidden"
    );

    try {

      /* ============================
         SIGNUP
         ============================ */

      if (
        authMode === "signup"
      ) {

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

            email:
              address,

            password:
              password.value,

            options: {

              data: {
                display_name:
                  name
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
              "Account created. Check your email, confirm it, then log in.";

            authMessage.classList.remove(
              "error"
            );
          }

          showResend(
            address
          );

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


      /* ============================
         LOGIN
         ============================ */

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

      console.error(
        "AUTH ERROR:",
        error
      );

      if (authMessage) {

        authMessage.textContent =
          error?.message ||
          "Authentication failed.";

        authMessage.classList.add(
          "error"
        );
      }

      const message =
        (
          error?.message ||
          ""
        ).toLowerCase();

      if (
        message.includes("confirm") ||
        message.includes("email")
      ) {

        showResend(
          email?.value?.trim()
        );
      }

    } finally {

      authSubmit &&
        (authSubmit.disabled = false);
    }
  }
);


/* =========================================================
   BOOT
   ========================================================= */

async function boot(
  user
) {

  if (!user) {
    return;
  }

  me =
    user;

  diagnosticLog(
    "user",
    user.id
  );

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
   SESSION
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

    if (
      data?.session?.user
    ) {

      await boot(
        data.session.user
      );
    }

  } catch (error) {

    console.error(
      "SESSION ERROR:",
      error
    );
  }
}


/* =========================================================
   AUTH STATE
   ========================================================= */

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

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

      currentConversation =
        null;

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
      "PROFILE:",
      error.message
    );
  }

  const name =
    data?.display_name ||
    me.user_metadata?.display_name ||
    "Keturio User";

  if (myName) {
    myName.textContent =
      name;
  }

  if (myEmail) {
    myEmail.textContent =
      me.email || "";
  }

  if (myAvatar) {

    myAvatar.textContent =
      name
        .charAt(0)
        .toUpperCase();
  }
}


/* =========================================================
   PEOPLE
   ========================================================= */

async function renderPeople(
  filter = ""
) {

  if (
    !me ||
    !chatList
  ) {
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
          ascending:
            true
        }
      )
      .limit(50);

  const term =
    filter.trim();

  if (term) {

    query =
      query.or(
        `display_name.ilike.%${term}%,username.ilike.%${term}%`
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

  chatList.innerHTML =
    "";

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

  for (
    const person of data
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

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
      () =>
        openDirectChat(
          person
        )
    );

    chatList.appendChild(
      button
    );
  }
}


/* =========================================================
   SEARCH
   ========================================================= */

searchInput?.addEventListener(
  "input",
  () => {

    clearTimeout(
      searchTimer
    );

    searchTimer =
      setTimeout(
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
   OPEN CHAT
   ========================================================= */

async function openDirectChat(
  person
) {

  if (
    !me ||
    !person
  ) {
    return;
  }

  await cleanupRealtime();

  currentChat =
    person;

  currentConversation =
    null;

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

    diagnosticLog(
      "conversation",
      data
    );

    await loadMessages();

    await subscribeToMessages();

    await subscribeToTyping();

  } catch (error) {

    console.error(
      "OPEN CHAT ERROR:",
      error
    );

    diagnosticLog(
      "lastError",
      error?.message ||
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

  chatWall.innerHTML =
    "";

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
          ascending:
            true
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

  if (
    document.querySelector(
      `[data-message-id="${CSS.escape(
        String(message.id)
      )}"]`
    )
  ) {

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
      hour:
        "2-digit",

      minute:
        "2-digit"
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

    messageChannel =
      null;
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
      event:
        "INSERT",

      schema:
        "public",

      table:
        "messages",

      filter:
        `conversation_id=eq.${conversationId}`
    },
    (payload) => {

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
        status ===
        "SUBSCRIBED"
      ) {

        diagnosticLog(
          "messageChannel",
          "CONNECTED"
        );

        if (presence) {

          presence.textContent =
            "live";
        }

      } else if (
        status ===
        "CHANNEL_ERROR"
      ) {

        diagnosticLog(
          "messageChannel",
          "CHANNEL_ERROR"
        );

        diagnosticLog(
          "lastError",
          JSON.stringify(
            error ||
            "Message channel CHANNEL_ERROR"
          )
        );

      } else if (
        status ===
        "TIMED_OUT"
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
   REALTIME AUTH
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
      "No authenticated session token available for Realtime."
    );
  }

  /*
    Supabase JS v2:
    set the authenticated JWT
    on the Realtime client.
  */

  supabase.realtime.setAuth(
    token
  );

  console.log(
    "KETURIO REALTIME AUTH SET"
  );
}


/* =========================================================
   TYPING REALTIME
   ========================================================= */

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

    typingChannel =
      null;
  }

  const conversationId =
    currentConversation;

  try {

    diagnosticLog(
      "typingChannel",
      "AUTHENTICATING"
    );

    await authenticateRealtime();

    diagnosticLog(
      "typingChannel",
      "CONNECTING"
    );


    /* -----------------------------------------
       IMPORTANT:
       PRIVATE CHANNEL
    ----------------------------------------- */

    typingChannel =
      supabase.channel(
        `keturio-type-${conversationId}`,
        {
          config: {

            private:
              true,

            broadcast: {

              self:
                false,

              ack:
                true
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
        event:
          "typing"
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


    /* -----------------------------------------
       SUBSCRIBE
       ----------------------------------------- */

    typingChannel.subscribe(
      (
        status,
        err
      ) => {

        console.log(
          "KETURIO TYPING STATUS:",
          status
        );

        console.error(
          "KETURIO TYPING ERROR:",
          err
        );


        if (
          status ===
          "SUBSCRIBED"
        ) {

          diagnosticLog(
            "typingChannel",
            "CONNECTED"
          );

          /*
            Clear an old typing error
            once the channel successfully
            reconnects.
          */

          if (
            diagnostic.lastError
              .includes(
                "Typing channel"
              )
          ) {

            diagnosticLog(
              "lastError",
              "NONE"
            );
          }

          return;
        }


        if (
          status ===
          "CHANNEL_ERROR"
        ) {

          diagnosticLog(
            "typingChannel",
            "CHANNEL_ERROR"
          );


          /*
            THIS IS THE IMPORTANT PART.

            We save the COMPLETE error,
            not just "CHANNEL_ERROR".
          */

          let errorText =
            "Typing channel CHANNEL_ERROR";

          try {

            if (err) {

              errorText =
                JSON.stringify(
                  err,
                  null,
                  2
                );
            }

          } catch {

            errorText =
              String(
                err
              );
          }

          diagnosticLog(
            "lastError",
            errorText
          );

          return;
        }


        if (
          status ===
          "TIMED_OUT"
        ) {

          diagnosticLog(
            "typingChannel",
            "TIMED_OUT"
          );

          let errorText =
            "Typing channel timed out";

          try {

            if (err) {

              errorText =
                JSON.stringify(
                  err,
                  null,
                  2
                );
            }

          } catch {

            errorText =
              String(
                err
              );
          }

          diagnosticLog(
            "lastError",
            errorText
          );

          return;
        }


        if (
          status ===
          "CLOSED"
        ) {

          diagnosticLog(
            "typingChannel",
            "CLOSED"
          );
        }
      }
    );

  } catch (error) {

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
      JSON.stringify(
        error
      )
    );
  }
}


/* =========================================================
   TYPING UI
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

    const result =
      await typingChannel.send({

        type:
          "broadcast",

        event:
          "typing",

        payload: {

          user_id:
            me.id,

          typing:
            isTyping,

          at:
            Date.now()
        }
      });

    console.log(
      "KETURIO TYPING SEND:",
      result
    );

  } catch (error) {

    console.error(
      "TYPING SEND ERROR:",
      error
    );

    diagnosticLog(
      "lastError",
      error?.message ||
      JSON.stringify(
        error
      )
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

  typingStopTimer =
    null;

  if (
    !typingChannel
  ) {
    return;
  }

  if (immediate) {

    /*
      Force a STOP event.
    */

    lastTypingState =
      false;

    typingChannel
      .send({

        type:
          "broadcast",

        event:
          "typing",

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
        error => {

          console.debug(
            "STOP TYPING ERROR:",
            error
          );
        }
      );

    return;
  }

  broadcastTyping(
    false
  );
}


/* =========================================================
   MESSAGE INPUT
   ========================================================= */

messageInput?.addEventListener(
  "input",
  () => {

    if (
      !currentConversation
    ) {
      return;
    }

    broadcastTyping(
      true
    );

    clearTimeout(
      typingStopTimer
    );

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

composer?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (
      !currentConversation
    ) {

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

    stopTyping(
      true
    );

    const sendButton =
      composer.querySelector(
        ".send-btn"
      );

    if (sendButton) {
      sendButton.disabled =
        true;
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

      messageInput.value =
        "";

    } catch (error) {

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
        JSON.stringify(
          error
        )
      );

      notify(
        error?.message ||
        "Message could not be sent.",
        true
      );

    } finally {

      if (sendButton) {

        sendButton.disabled =
          false;
      }

      messageInput?.focus();
    }
  }
);


/* =========================================================
   BACK
   ========================================================= */

backBtn?.addEventListener(
  "click",
  async () => {

    await cleanupRealtime();

    currentChat =
      null;

    currentConversation =
      null;

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

    } catch (error) {

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
   CLEANUP
   ========================================================= */

async function cleanupRealtime() {

  clearTimeout(
    typingStopTimer
  );

  clearTimeout(
    remoteTypingTimer
  );

  typingStopTimer =
    null;

  remoteTypingTimer =
    null;

  lastTypingState =
    false;

  showRemoteTyping(
    false
  );

  if (messageChannel) {

    await supabase.removeChannel(
      messageChannel
    );

    messageChannel =
      null;
  }

  if (typingChannel) {

    await supabase.removeChannel(
      typingChannel
    );

    typingChannel =
      null;
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
  "🎉"
];


let emojiPanel =
  null;


function toggleEmojiPanel() {

  if (emojiPanel) {

    emojiPanel.remove();

    emojiPanel =
      null;

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
      grid-template-columns:
        repeat(6,1fr);

      gap:4px;

      padding:8px;

      border-radius:14px;

      background:
        var(--panel,#171a27);

      box-shadow:
        0 12px 35px
        rgba(0,0,0,.25);
    `;

  for (
    const emoji of emojiList
  ) {

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
          new Event(
            "input"
          )
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

      stopTyping(
        true
      );
    }
  }
);


/* =========================================================
   START
   ========================================================= */

renderDiagnostic();

loadTheme();

restoreSession();
