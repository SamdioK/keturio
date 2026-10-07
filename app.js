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


/* =========================================================
   DIAGNOSTIC STATE
========================================================= */

const diagnostic = {

  messageStatus:
    "NOT STARTED",

  typingStatus:
    "NOT STARTED",

  lastMessageEvent:
    "NONE",

  lastTypingEvent:
    "NONE",

  lastError:
    "NONE",

  messageInsert:
    "NONE",

  conversation:
    "NONE"

};


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
    document.createElement(
      "div"
    );


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
        "
      >
        ×
      </button>

    </div>

    <div id="diagContent">
      Starting diagnostic…
    </div>

  `;


  document.body.appendChild(
    panel
  );


  const close =
    document.getElementById(
      "closeDiagnostic"
    );


  if (close) {

    close.onclick =
      () => {

        panel.style.display =
          "none";

      };

  }


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


  const colour =
    (value) => {

      const v =
        String(
          value
        ).toUpperCase();


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
        ${
          diagnostic.conversation
          || "NONE"
        }
      </span>
    </div>

    <div>
      User:
      <span style="color:#fff">
        ${
          me?.id
          || "NOT LOGGED IN"
        }
      </span>
    </div>

    <div>
      Message channel:
      <span style="color:${colour(
        diagnostic.messageStatus
      )}">
        ${
          diagnostic.messageStatus
        }
      </span>
    </div>

    <div>
      Typing channel:
      <span style="color:${colour(
        diagnostic.typingStatus
      )}">
        ${
          diagnostic.typingStatus
        }
      </span>
    </div>

    <div>
      Last message event:
      <span style="color:#fff">
        ${
          diagnostic.lastMessageEvent
        }
      </span>
    </div>

    <div>
      Last typing event:
      <span style="color:#fff">
        ${
          diagnostic.lastTypingEvent
        }
      </span>
    </div>

    <div>
      Message insert:
      <span style="color:${colour(
        diagnostic.messageInsert
      )}">
        ${
          diagnostic.messageInsert
        }
      </span>
    </div>

    <div>
      Last error:
      <span style="color:#ffb3bd">
        ${
          diagnostic.lastError
        }
      </span>
    </div>

    <div style="
      margin-top:8px;
      color:#8d9bb8;
    ">
      Type a message and watch this panel.
      Then check the OTHER phone/account.
    </div>

  `;

}


/* =========================================================
   DIAGNOSTIC EVENT
========================================================= */

function diagnosticLog(
  type,
  value
) {

  console.log(
    "[KETURIO DIAGNOSTIC]",
    type,
    value
  );


  if (
    type ===
    "messageStatus"
  ) {

    diagnostic.messageStatus =
      value;

  }


  if (
    type ===
    "typingStatus"
  ) {

    diagnostic.typingStatus =
      value;

  }


  if (
    type ===
    "messageEvent"
  ) {

    diagnostic.lastMessageEvent =
      value;

  }


  if (
    type ===
    "typingEvent"
  ) {

    diagnostic.lastTypingEvent =
      value;

  }


  if (
    type ===
    "error"
  ) {

    diagnostic.lastError =
      value;

  }


  if (
    type ===
    "insert"
  ) {

    diagnostic.messageInsert =
      value;

  }


  updateDiagnostic();

}


/* =========================================================
   NOTIFICATION
========================================================= */

const toast =
  $("#toast");


function notify(
  message,
  error = false
) {

  if (toast) {

    toast.textContent =
      message;

    toast.classList.add(
      "show"
    );


    if (error) {

      toast.style.borderColor =
        "rgba(255,113,133,.4)";

    }


    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2800
    );

  }


  console.log(
    "[KETURIO]",
    message
  );

}


/* =========================================================
   AUTH ELEMENTS
========================================================= */

const authScreen =
  $("#authScreen");

const chatApp =
  $("#chatApp");

const authForm =
  $("#authForm");

const authMessage =
  $("#authMessage");

const nameField =
  $("#nameField");

const displayName =
  $("#displayName");

const email =
  $("#email");

const password =
  $("#password");

const authSubmit =
  $("#authSubmit");

const resendConfirm =
  $("#resendConfirm");


let mode =
  "login";


/* =========================================================
   AUTH MODE
========================================================= */

function setAuthMode(
  next
) {

  mode =
    next;


  const loginTab =
    $("#loginTab");

  const signupTab =
    $("#signupTab");


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


$("#loginTab")?.addEventListener(
  "click",
  () =>
    setAuthMode("login")
);


$("#signupTab")?.addEventListener(
  "click",
  () =>
    setAuthMode("signup")
);


/* =========================================================
   SHOW RESEND
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


/* =========================================================
   AUTH FORM
========================================================= */

authForm?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    authSubmit &&
      (
        authSubmit.disabled =
          true
      );


    if (authMessage) {

      authMessage.textContent =
        "Working…";

      authMessage.classList.remove(
        "error"
      );

    }


    try {

      /* =========================================
         SIGNUP
      ========================================= */

      if (
        mode ===
        "signup"
      ) {

        const address =
          email.value.trim();


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


          showResend(
            address
          );

        }

        else {

          await boot(
            data.user
          );

        }

      }


      /* =========================================
         LOGIN
      ========================================= */

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


        await boot(
          data.user
        );

      }

    }

    catch (err) {

      console.error(
        "Auth error:",
        err
      );


      diagnosticLog(
        "error",
        err?.message ||
        "Authentication error"
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
          err?.message ||
          ""
        ).toLowerCase();


      if (
        message.includes(
          "confirm"
        ) ||
        message.includes(
          "email"
        )
      ) {

        showResend(
          email?.value?.trim()
        );

      }

    }

    finally {

      if (authSubmit) {

        authSubmit.disabled =
          false;

      }

    }

  }
);


/* =========================================================
   RESEND CONFIRMATION
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


    resendConfirm.disabled =
      true;


    try {

      const {
        error
      } =
        await supabase.auth.resend({

          type:
            "signup",

          email:
            address,

          options: {

            emailRedirectTo:
              SITE_URL

          }

        });


      if (error) {
        throw error;
      }


      authMessage &&
        (
          authMessage.textContent =
            "New confirmation email sent."
        );


      notify(
        "Confirmation email sent."
      );

    }

    catch (err) {

      diagnosticLog(
        "error",
        err?.message
      );


      authMessage &&
        (
          authMessage.textContent =
            err?.message ||
            "Could not resend email."
        );

    }

    finally {

      resendConfirm.disabled =
        false;

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


  const myName =
    $("#myName");

  if (myName) {

    myName.textContent =
      name;

  }


  const myEmail =
    $("#myEmail");

  if (myEmail) {

    myEmail.textContent =
      me.email || "";

  }


  const myAvatar =
    $("#myAvatar");

  if (myAvatar) {

    myAvatar.textContent =
      name[0]?.toUpperCase() ||
      "K";

  }

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


  if (
    filter.trim()
  ) {

    const term =
      filter
        .trim()
        .replaceAll(
          ",",
          ""
        );


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


  if (!chatList) {
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
   OPEN CHAT
========================================================= */

async function openDirectChat(
  person
) {

  await cleanupRealtime();


  currentChat =
    person;


  $("#personName") &&
    (
      $("#personName").textContent =
        person.display_name ||
        "Keturio User"
    );


  $("#personAvatar") &&
    (
      $("#personAvatar").textContent =
        (
          person.display_name ||
          "K"
        )[0].toUpperCase()
    );


  $("#presence") &&
    (
      $("#presence").textContent =
        "connecting…"
    );


  chatApp?.classList.add(
    "in-chat"
  );


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

    diagnosticLog(
      "error",
      `RPC: ${error.message}`
    );


    notify(
      error.message,
      true
    );


    return;

  }


  currentConversation =
    data;


  diagnostic.conversation =
    currentConversation;


  updateDiagnostic();


  await loadMessages();


  await subscribeToMessages();

  await subscribeToTyping();

}


/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadMessages() {

  if (!chatWall) {
    return;
  }


  chatWall.innerHTML =
    "";


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

    diagnosticLog(
      "error",
      `LOAD MESSAGES: ${error.message}`
    );


    notify(
      error.message,
      true
    );


    return;

  }


  if (!data?.length) {

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


    return;

  }


  data.forEach(
    renderMessage
  );


  scrollChat();

}


/* =========================================================
   RENDER MESSAGE
========================================================= */

function renderMessage(
  message
) {

  if (!message?.id) {
    return;
  }


  const exists =
    document.querySelector(
      `[data-message-id="${CSS.escape(
        String(message.id)
      )}"]`
    );


  if (exists) {
    return;
  }


  chatWall
    ?.querySelector(
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
      message.sender_id ===
      me.id
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
    message.content ||
    "";


  const stamp =
    document.createElement(
      "span"
    );


  stamp.className =
    "stamp";


  stamp.textContent =
    new Date(
      message.created_at
    ).toLocaleTimeString(
      [],
      {
        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    );


  bubble.appendChild(
    stamp
  );


  row.appendChild(
    bubble
  );


  chatWall?.appendChild(
    row
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
   TYPING INDICATOR
========================================================= */

function typingIndicator() {

  let element =
    document.getElementById(
      "keturioTypingIndicator"
    );


  if (element) {
    return element;
  }


  element =
    document.createElement(
      "div"
    );


  element.id =
    "keturioTypingIndicator";


  element.textContent =
    "typing…";


  element.style.cssText =
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


  const composer =
    $("#composer");


  if (
    composer &&
    composer.parentNode
  ) {

    composer.parentNode.insertBefore(
      element,
      composer
    );

  }


  return element;

}


/* =========================================================
   SHOW TYPING
========================================================= */

function showRemoteTyping(
  show
) {

  const element =
    typingIndicator();


  if (!element) {
    return;
  }


  element.style.display =
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

          element.style.display =
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

    diagnosticLog(
      "messageStatus",
      "NO CONVERSATION"
    );

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


  diagnosticLog(
    "messageStatus",
    "CONNECTING…"
  );


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

    payload => {

      console.log(
        "MESSAGE EVENT RECEIVED:",
        payload
      );


      diagnosticLog(
        "messageEvent",
        "RECEIVED"
      );


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
    status => {

      console.log(
        "MESSAGE CHANNEL:",
        status
      );


      if (
        status ===
        "SUBSCRIBED"
      ) {

        diagnosticLog(
          "messageStatus",
          "CONNECTED"
        );


        $("#presence") &&
          (
            $("#presence").textContent =
              "live"
          );


        notify(
          "Message realtime connected."
        );

      }

      else if (
        status ===
        "CHANNEL_ERROR"
      ) {

        diagnosticLog(
          "messageStatus",
          "CHANNEL ERROR"
        );


        diagnosticLog(
          "error",
          "Message channel CHANNEL_ERROR"
        );

      }

      else if (
        status ===
        "TIMED_OUT"
      ) {

        diagnosticLog(
          "messageStatus",
          "TIMEOUT"
        );


        diagnosticLog(
          "error",
          "Message channel TIMED_OUT"
        );

      }

      else if (
        status ===
        "CLOSED"
      ) {

        diagnosticLog(
          "messageStatus",
          "CLOSED"
        );

      }

    }
  );

}


/* =========================================================
   TYPING REALTIME
========================================================= */

async function subscribeToTyping() {

  if (!currentConversation) {

    diagnosticLog(
      "typingStatus",
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


  diagnosticLog(
    "typingStatus",
    "CONNECTING…"
  );


  typingChannel =
    supabase.channel(
      `keturio-type-${conversationId}`,
      {

        config: {

          broadcast: {

            self:
              false

          }

        }

      }
    );


  typingChannel.on(
    "broadcast",
    {
      event:
        "typing"
    },

    ({ payload }) => {

      console.log(
        "TYPING EVENT RECEIVED:",
        payload
      );


      diagnosticLog(
        "typingEvent",
        payload?.typing
          ? "TYPING RECEIVED"
          : "STOP TYPING RECEIVED"
      );


      if (
        payload?.user_id ===
        me?.id
      ) {

        return;

      }


      showRemoteTyping(
        Boolean(
          payload?.typing
        )
      );

    }
  );


  typingChannel.subscribe(
    status => {

      console.log(
        "TYPING CHANNEL:",
        status
      );


      if (
        status ===
        "SUBSCRIBED"
      ) {

        diagnosticLog(
          "typingStatus",
          "CONNECTED"
        );

      }

      else if (
        status ===
        "CHANNEL_ERROR"
      ) {

        diagnosticLog(
          "typingStatus",
          "CHANNEL ERROR"
        );


        diagnosticLog(
          "error",
          "Typing channel CHANNEL_ERROR"
        );

      }

      else if (
        status ===
        "TIMED_OUT"
      ) {

        diagnosticLog(
          "typingStatus",
          "TIMEOUT"
        );


        diagnosticLog(
          "error",
          "Typing channel TIMED_OUT"
        );

      }

      else if (
        status ===
        "CLOSED"
      ) {

        diagnosticLog(
          "typingStatus",
          "CLOSED"
        );

      }

    }
  );

}


/* =========================================================
   SEND TYPING
========================================================= */

async function broadcastTyping(
  isTyping
) {

  if (
    !typingChannel ||
    !me ||
    !currentConversation
  ) {

    diagnosticLog(
      "error",
      "Cannot broadcast typing: channel not ready."
    );

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
      "TYPING SENT:",
      isTyping
    );

  }

  catch (err) {

    diagnosticLog(
      "error",
      `Typing send: ${
        err?.message ||
        err
      }`
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


    if (
      typingChannel &&
      me
    ) {

      typingChannel
        .send({

          type:
            "broadcast",

          event:
            "typing",

          payload: {

            user_id:
              me.id,

            typing:
              false,

            at:
              Date.now()

          }

        })
        .catch(
          () => {}
        );

    }


    showRemoteTyping(
      false
    );

  }

  else {

    broadcastTyping(
      false
    );

  }

}


/* =========================================================
   INPUT TYPING
========================================================= */

const input =
  $("#messageInput");


input?.addEventListener(
  "input",
  () => {

    if (!currentConversation) {
      return;
    }


    broadcastTyping(
      true
    );


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

const composer =
  $("#composer");


composer?.addEventListener(
  "submit",
  async e => {

    e.preventDefault();


    if (!currentConversation) {

      notify(
        "Open a chat first.",
        true
      );

      return;

    }


    const value =
      input?.value?.trim();


    if (!value) {
      return;
    }


    stopTyping(
      true
    );


    const button =
      composer.querySelector(
        "button[type='submit']"
      );


    if (button) {

      button.disabled =
        true;

    }


    diagnosticLog(
      "insert",
      "SENDING…"
    );


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
              value,

            message_type:
              "text"

          })
          .select(
            "id,sender_id,content,created_at"
          )
          .single();


      if (error) {

        diagnosticLog(
          "insert",
          "FAILED"
        );


        diagnosticLog(
          "error",
          `INSERT: ${error.message}`
        );


        throw error;

      }


      diagnosticLog(
        "insert",
        "SUCCESS"
      );


      input.value =
        "";


      /*
        Render immediately on sender.
      */

      renderMessage(
        data
      );


      scrollChat();

    }

    catch (err) {

      console.error(
        "SEND ERROR:",
        err
      );


      notify(
        err?.message ||
        "Message failed.",
        true
      );

    }

    finally {

      if (button) {

        button.disabled =
          false;

      }


      input?.focus();

    }

  }
);


/* =========================================================
   EMOJI
========================================================= */

$("#emojiBtn")?.addEventListener(
  "click",
  () => {

    if (!input) {
      return;
    }


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
          bubbles:
            true
        }
      )
    );

  }
);


/* =========================================================
   SEARCH
========================================================= */

$("#searchInput")?.addEventListener(
  "input",
  e =>
    renderPeople(
      e.target.value
    )
);


/* =========================================================
   THEME
========================================================= */

$("#themeBtn")?.addEventListener(
  "click",
  () =>
    document.body.classList.toggle(
      "light"
    )
);


/* =========================================================
   CLEANUP
========================================================= */

async function cleanupRealtime() {

  stopTyping(
    true
  );


  if (messageChannel) {

    try {

      await supabase.removeChannel(
        messageChannel
      );

    }

    catch (_) {}


    messageChannel =
      null;

  }


  if (typingChannel) {

    try {

      await supabase.removeChannel(
        typingChannel
      );

    }

    catch (_) {}


    typingChannel =
      null;

  }


  diagnostic.messageStatus =
    "CLOSED";


  diagnostic.typingStatus =
    "CLOSED";


  diagnostic.lastMessageEvent =
    "NONE";


  diagnostic.lastTypingEvent =
    "NONE";


  diagnostic.conversation =
    "NONE";


  updateDiagnostic();

}


/* =========================================================
   BACK
========================================================= */

$("#backBtn")?.addEventListener(
  "click",
  async () => {

    await cleanupRealtime();


    currentConversation =
      null;

    currentChat =
      null;


    chatApp?.classList.remove(
      "in-chat"
    );

  }
);


/* =========================================================
   LOGOUT
========================================================= */

$("#logoutBtn")?.addEventListener(
  "click",
  async () => {

    await cleanupRealtime();


    await supabase.auth.signOut();


    location.reload();

  }
);


/* =========================================================
   NEW CHAT
========================================================= */

$("#newChatBtn")?.addEventListener(
  "click",
  () => {

    $("#searchInput")?.focus();


    notify(
      "Search for a Keturio user."
    );

  }
);


/* =========================================================
   AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    console.log(
      "AUTH EVENT:",
      event
    );


    if (
      session?.user
    ) {

      if (
        !me ||
        me.id !==
        session.user.id
      ) {

        await boot(
          session.user
        );

      }

    }


    if (
      event ===
      "SIGNED_OUT"
    ) {

      me =
        null;

    }

  }
);


/* =========================================================
   EXISTING SESSION
========================================================= */

try {

  const {
    data: {
      session
    }
  } =
    await supabase.auth.getSession();


  if (
    session?.user
  ) {

    await boot(
      session.user
    );

  }

}

catch (err) {

  console.error(
    "SESSION ERROR:",
    err
  );


  diagnosticLog(
    "error",
    err?.message ||
    "Session error"
  );

}


/* =========================================================
   START DIAGNOSTIC
========================================================= */

setTimeout(
  () => {

    if (
      me
    ) {

      createDiagnosticPanel();

    }

  },
  500
);
