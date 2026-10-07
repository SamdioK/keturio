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
   APP STATE
========================================================= */

let mode = "login";

let me = null;

let currentChat = null;

let currentConversation = null;

/*
  IMPORTANT:
  We now use TWO separate realtime channels.

  1. messageChannel
     PostgreSQL INSERT realtime messages.

  2. typingChannel
     Lightweight typing broadcasts.
*/

let messageChannel = null;

let typingChannel = null;

let typingStopTimer = null;

let remoteTypingTimer = null;

let lastTypingState = false;


/* =========================================================
   DOM ELEMENTS
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

const chatList =
  $("#chatList");

const chatWall =
  $("#chatWall");

const input =
  $("#messageInput");

const toast =
  $("#toast");


/* =========================================================
   NOTIFICATIONS
========================================================= */

function notify(
  message,
  error = false
) {
  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  toast.style.borderColor =
    error
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

  const loginTab =
    $("#loginTab");

  const signupTab =
    $("#signupTab");

  if (loginTab) {
    loginTab.classList.toggle(
      "active",
      mode === "login"
    );
  }

  if (signupTab) {
    signupTab.classList.toggle(
      "active",
      mode === "signup"
    );
  }

  if (nameField) {
    nameField.classList.toggle(
      "hidden",
      mode !== "signup"
    );
  }

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

  if (resendConfirm) {
    resendConfirm.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   SHOW RESEND CONFIRMATION
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
   AUTH TABS
========================================================= */

const loginTab =
  $("#loginTab");

if (loginTab) {
  loginTab.addEventListener(
    "click",
    () => setAuthMode("login")
  );
}


const signupTab =
  $("#signupTab");

if (signupTab) {
  signupTab.addEventListener(
    "click",
    () => setAuthMode("signup")
  );
}


/* =========================================================
   LOGIN / SIGNUP
========================================================= */

if (authForm) {

  authForm.addEventListener(
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

      if (resendConfirm) {
        resendConfirm.classList.add(
          "hidden"
        );
      }

      try {

        /* =========================================
           SIGN UP
        ========================================= */

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


          /*
            Supabase normally returns no session
            when email confirmation is required.
          */

          if (!data.session) {

            if (authMessage) {

              authMessage.textContent =
                "Account created. Check your email, confirm it, then log in.";

            }

            showResend(address);

          } else {

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
          "Keturio Auth Error:",
          err
        );


        if (authMessage) {

          authMessage.textContent =
            err?.message ||
            "Authentication failed.";

          authMessage.classList.add(
            "error"
          );

        }


        const msg =
          String(
            err?.message || ""
          ).toLowerCase();


        if (
          msg.includes("confirm") ||
          msg.includes("email")
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

}


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


        if (authMessage) {

          authMessage.classList.remove(
            "error"
          );

          authMessage.textContent =
            "A new confirmation email has been sent.";

        }


        notify(
          "Confirmation email sent."
        );

      }

      catch (err) {

        console.error(
          "Resend email error:",
          err
        );


        if (authMessage) {

          authMessage.textContent =
            err?.message ||
            "Could not resend confirmation email.";

          authMessage.classList.add(
            "error"
          );

        }

      }

      finally {

        resendConfirm.disabled =
          false;

      }

    }
  );

}


/* =========================================================
   BOOT APP
========================================================= */

async function boot(user) {

  if (!user) {
    return;
  }


  if (
    me?.id === user.id
  ) {

    return;

  }


  me = user;


  if (authScreen) {
    authScreen.classList.add(
      "hidden"
    );
  }


  if (chatApp) {
    chatApp.classList.remove(
      "hidden"
    );
  }


  await loadMyProfile();

  await renderPeople("");

}


/* =========================================================
   LOAD MY PROFILE
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
      name?.[0]?.toUpperCase() ||
      "K";

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
   PEOPLE SEARCH
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
  } =
    await query;


  if (error) {

    console.error(
      "People search error:",
      error
    );

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
      [
        "padding:20px",
        "color:var(--muted)",
        "font-size:12px",
        "text-align:center"
      ].join(";");


    empty.textContent =
      "No other Keturio users yet. Create another account to test a real chat.";


    chatList.appendChild(
      empty
    );

    return;

  }


  data.forEach(
    (person) => {

      const el =
        document.createElement(
          "button"
        );


      el.type =
        "button";

      el.className =
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


      const strong =
        document.createElement(
          "strong"
        );


      strong.textContent =
        person.display_name ||
        "Keturio User";


      const span =
        document.createElement(
          "span"
        );


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
        () =>
          openDirectChat(
            person
          )
      );


      chatList.appendChild(
        el
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

  stopTyping(true);

  await cleanupRealtime();


  currentChat =
    person;


  const personName =
    $("#personName");

  if (personName) {

    personName.textContent =
      person.display_name ||
      "Keturio User";

  }


  const personAvatar =
    $("#personAvatar");

  if (personAvatar) {

    personAvatar.textContent =
      (
        person.display_name ||
        "K"
      )[0].toUpperCase();

  }


  const presence =
    $("#presence");

  if (presence) {

    presence.textContent =
      "connecting…";

  }


  if (chatApp) {

    chatApp.classList.add(
      "in-chat"
    );

  }


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

    console.error(
      "Conversation error:",
      error
    );

    notify(
      error.message,
      true
    );


    if (presence) {

      presence.textContent =
        "unable to open chat";

    }

    return;

  }


  currentConversation =
    data;


  await loadMessages();


  /*
    Start both realtime systems
    only after conversation exists.
  */

  await subscribeToMessages();

  await subscribeToTyping();

}


/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadMessages() {

  chatWall.innerHTML = "";


  const day =
    document.createElement(
      "div"
    );


  day.className =
    "day-chip";


  day.textContent =
    "Conversation";


  chatWall.appendChild(
    day
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

    console.error(
      "Load messages error:",
      error
    );

    notify(
      error.message,
      true
    );

    return;

  }


  if (!data?.length) {

    const note =
      document.createElement(
        "div"
      );


    note.className =
      "empty-chat";


    note.innerHTML =
      "<div class='spark'>✦</div><h2>Say hello</h2><p>Your first message will appear here.</p>";


    chatWall.appendChild(
      note
    );


    return;

  }


  data.forEach(
    renderMessage
  );


  scrollChatToBottom();

}


/* =========================================================
   SCROLL CHAT
========================================================= */

function scrollChatToBottom() {

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
   RENDER MESSAGE
========================================================= */

function renderMessage(
  message
) {

  if (!message?.id) {
    return;
  }


  /*
    Never display the same message twice.
  */

  const existing =
    document.querySelector(
      `[data-message-id="${CSS.escape(
        String(message.id)
      )}"]`
    );


  if (existing) {
    return;
  }


  const empty =
    chatWall.querySelector(
      ".empty-chat"
    );


  if (empty) {
    empty.remove();
  }


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
    message.content || "";


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
    document.createElement(
      "div"
    );


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
    typingIndicator();


  if (!indicator) {
    return;
  }


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


  console.log(
    "Keturio: starting message realtime for",
    conversationId
  );


  messageChannel =
    supabase.channel(
      `keturio-messages-${conversationId}`
    );


  /*
    IMPORTANT:
    This channel ONLY handles database
    message inserts.
  */

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

      console.log(
        "Keturio: NEW MESSAGE EVENT",
        payload
      );


      if (
        currentConversation !==
        conversationId
      ) {

        return;

      }


      if (!payload?.new) {
        return;
      }


      renderMessage(
        payload.new
      );


      scrollChatToBottom();

    }
  );


  messageChannel.subscribe(
    (status) => {

      console.log(
        "Keturio MESSAGE REALTIME:",
        status
      );


      if (
        status ===
        "SUBSCRIBED"
      ) {

        const presence =
          $("#presence");


        if (presence) {

          presence.textContent =
            "live";

        }


        notify(
          "Instant messages connected."
        );

      }


      else if (
        status ===
        "CHANNEL_ERROR"
      ) {

        const presence =
          $("#presence");


        if (presence) {

          presence.textContent =
            "reconnecting…";

        }


        console.error(
          "Keturio message channel error."
        );

      }


      else if (
        status ===
        "TIMED_OUT"
      ) {

        const presence =
          $("#presence");


        if (presence) {

          presence.textContent =
            "reconnecting…";

        }


        console.error(
          "Keturio message realtime timed out."
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


  console.log(
    "Keturio: starting typing realtime for",
    conversationId
  );


  /*
    Separate channel from PostgreSQL
    messages.

    This keeps typing extremely lightweight.
  */

  typingChannel =
    supabase.channel(
      `keturio-typing-${conversationId}`,
      {
        config: {

          broadcast: {

            self: false

          }

        }

      }
    );


  typingChannel.on(
    "broadcast",
    {
      event: "typing"
    },

    ({ payload }) => {

      console.log(
        "Keturio TYPING EVENT:",
        payload
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


      /*
        Never react to our own
        typing broadcast.
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


  typingChannel.subscribe(
    (status) => {

      console.log(
        "Keturio TYPING REALTIME:",
        status
      );


      if (
        status ===
        "SUBSCRIBED"
      ) {

        console.log(
          "Keturio typing channel ready."
        );

      }


      else if (
        status ===
        "CHANNEL_ERROR"
      ) {

        console.error(
          "Keturio typing channel error."
        );

      }


      else if (
        status ===
        "TIMED_OUT"
      ) {

        console.error(
          "Keturio typing channel timed out."
        );

      }

    }
  );

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
    Avoid sending the same state
    repeatedly.

    This saves data.
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
      "Keturio: typing sent",
      isTyping
    );

  }

  catch (err) {

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
    ).catch(
      () => {}
    );

  }

}


/* =========================================================
   USER TYPES
========================================================= */

if (input) {

  input.addEventListener(
    "input",
    () => {

      if (
        !currentConversation
      ) {

        return;

      }


      /*
        Send "typing = true"
        immediately.

        The other person should
        receive this without waiting
        for a database write.
      */

      broadcastTyping(
        true
      ).catch(
        () => {}
      );


      if (typingStopTimer) {

        clearTimeout(
          typingStopTimer
        );

      }


      /*
        If the user stops typing for
        1.4 seconds, tell the other
        person that typing stopped.
      */

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

}


/* =========================================================
   SEND MESSAGE
========================================================= */

const composer =
  $("#composer");


if (composer) {

  composer.addEventListener(
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
        input?.value?.trim();


      if (!value) {
        return;
      }


      /*
        Stop typing immediately.
      */

      stopTyping(
        true
      );


      /*
        Disable composer while
        the database request runs.
      */

      const sendButton =
        composer.querySelector(
          "button[type='submit']"
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
                value,

              message_type:
                "text"

            })
            .select(
              "id,sender_id,content,created_at"
            )
            .single();


        if (error) {
          throw error;
        }


        /*
          Show sender's message
          immediately.

          When PostgreSQL Realtime
          also delivers it, the
          duplicate protection in
          renderMessage() ignores it.
        */

        input.value = "";


        renderMessage(
          data
        );


        scrollChatToBottom();

      }

      catch (err) {

        console.error(
          "Send message error:",
          err
        );


        notify(
          err?.message ||
          "Message could not be sent.",
          true
        );

      }

      finally {

        if (sendButton) {
          sendButton.disabled =
            false;
        }


        input?.focus();

      }

    }
  );

}


/* =========================================================
   EMOJI
========================================================= */

const emojiBtn =
  $("#emojiBtn");


if (emojiBtn) {

  emojiBtn.addEventListener(
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
            bubbles: true
          }
        )
      );

    }
  );

}


/* =========================================================
   CLEANUP REALTIME
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

    catch (err) {

      console.debug(
        "Message channel cleanup:",
        err
      );

    }


    messageChannel =
      null;

  }


  if (typingChannel) {

    try {

      await supabase.removeChannel(
        typingChannel
      );

    }

    catch (err) {

      console.debug(
        "Typing channel cleanup:",
        err
      );

    }


    typingChannel =
      null;

  }


  lastTypingState =
    false;

}


/* =========================================================
   BACK BUTTON
========================================================= */

const backBtn =
  $("#backBtn");


if (backBtn) {

  backBtn.addEventListener(
    "click",
    async () => {

      await cleanupRealtime();


      if (chatApp) {

        chatApp.classList.remove(
          "in-chat"
        );

      }


      currentChat =
        null;


      currentConversation =
        null;


      showRemoteTyping(
        false
      );

    }
  );

}


/* =========================================================
   SEARCH
========================================================= */

const searchInput =
  $("#searchInput");


if (searchInput) {

  searchInput.addEventListener(
    "input",
    (e) => {

      renderPeople(
        e.target.value
      );

    }
  );

}


/* =========================================================
   THEME
========================================================= */

const themeBtn =
  $("#themeBtn");


if (themeBtn) {

  themeBtn.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "light"
      );

    }
  );

}


/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn =
  $("#logoutBtn");


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      await cleanupRealtime();


      try {

        await supabase.auth.signOut();

      }

      catch (err) {

        console.error(
          "Logout error:",
          err
        );

      }


      location.reload();

    }
  );

}


/* =========================================================
   NEW CHAT
========================================================= */

const newChatBtn =
  $("#newChatBtn");


if (newChatBtn) {

  newChatBtn.addEventListener(
    "click",
    () => {

      if (searchInput) {

        searchInput.focus();

      }


      notify(
        "Search for a Keturio user to start chatting."
      );

    }
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

    console.log(
      "Keturio Auth:",
      event
    );


    if (
      session?.user &&
      !me
    ) {

      await boot(
        session.user
      );

    }


    if (
      event ===
      "SIGNED_OUT"
    ) {

      me =
        null;

      currentChat =
        null;

      currentConversation =
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


  if (session?.user) {

    await boot(
      session.user
    );

  }

}

catch (err) {

  console.error(
    "Keturio session error:",
    err
  );

}
