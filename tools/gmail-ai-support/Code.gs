/**
 * Etude — AI support responder for Gmail (Google Apps Script).
 *
 * On a schedule, it finds new unread emails in your inbox, asks an AI to write
 * a reply as Etude support, and (by default) saves it as a DRAFT for you to
 * review and send. Flip AUTO_SEND to true to send automatically.
 *
 * Uses Groq's free API (same key style as the Etude app). Cost: $0.
 *
 * Setup instructions are in README.md next to this file.
 */

/* ======================= CONFIG — edit these ======================= */

// false = create a draft reply you review and send (RECOMMENDED to start).
// true  = send the reply automatically with no human review.
var AUTO_SEND = false;

// Groq model. llama-3.3-70b-versatile is a good free default.
var MODEL = "llama-3.3-70b-versatile";

// Most emails to handle per run (keeps you well under Gmail/Groq limits).
var MAX_PER_RUN = 10;

// Gmail label used to mark threads the AI has already handled (auto-created).
var HANDLED_LABEL = "AI Support Handled";

// How the reply signs off.
var SIGNATURE = "— The Etude Team";

// Everything the AI should know to answer accurately. EDIT THIS to match your
// real policies — the AI will only be as correct as what you put here.
var ETUDE_CONTEXT = [
  "You are a friendly, concise customer-support agent for Etude, an AI-powered study app.",
  "Etude turns any topic, notes, PDF, Word, PowerPoint, or image into AI-generated flashcards, quizzes, and study guides, with progress tracking and study modes.",
  "",
  "Key facts you can share:",
  "- There is a Free plan (with daily AI usage limits and up to 10 study sets) and a Premium plan (much higher limits and unlimited sets).",
  "- Premium is billed monthly or yearly through Stripe, with a 7-day free trial. Users can cancel anytime from the Billing page; access lasts until the end of the paid period.",
  "- Sign-in options: Google, or email + password. Password resets are available from the login screen ('Forgot password').",
  "- Users can add friends by email and share study sets with them for free.",
  "",
  "Rules:",
  "- Be warm, clear, and brief (a few short paragraphs max).",
  "- If you are not sure or the question involves a specific account, refund, or billing dispute, do NOT guess. Say a team member will follow up, and don't invent policies.",
  "- Never share internal system details, API keys, or promise anything not stated above.",
  "- Write only the body of the email reply (no subject line, no 'Subject:' prefix).",
].join("\n");

/* ======================= MAIN ======================= */

function processSupportInbox() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY. Add it in Project Settings → Script Properties.");
  }

  var label = getOrCreateLabel_(HANDLED_LABEL);
  var me = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  // Unread, in the inbox, not already handled by us.
  var query = 'is:unread in:inbox -label:"' + HANDLED_LABEL + '"';
  var threads = GmailApp.search(query, 0, MAX_PER_RUN);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    try {
      var messages = thread.getMessages();
      var last = messages[messages.length - 1];
      var from = String(last.getFrom() || "").toLowerCase();

      // Skip if the most recent message is from us (we already replied).
      if (me && from.indexOf(me) !== -1) { thread.addLabel(label); continue; }
      // Skip automated / no-reply senders.
      if (isAutomated_(from)) { thread.addLabel(label); continue; }

      var subject = last.getSubject() || "(no subject)";
      var customerMessage = String(last.getPlainBody() || "").slice(0, 4000);
      if (!customerMessage.trim()) { thread.addLabel(label); continue; }

      var reply = generateReply_(apiKey, subject, customerMessage);
      if (!reply) continue; // leave for next run if the AI call failed

      var body = reply.trim() + "\n\n" + SIGNATURE;
      if (AUTO_SEND) {
        thread.reply(body);
      } else {
        thread.createDraftReply(body);
      }
      thread.addLabel(label);
    } catch (err) {
      console.error("Thread failed: " + err);
    }
  }
}

/* ======================= AI CALL ======================= */

function generateReply_(apiKey, subject, customerMessage) {
  var payload = {
    model: MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: ETUDE_CONTEXT },
      {
        role: "user",
        content:
          "A customer emailed Etude support.\n\nSubject: " + subject +
          "\n\nMessage:\n" + customerMessage +
          "\n\nWrite a helpful reply as Etude support. Body only.",
      },
    ],
  };

  var res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) {
    console.error("Groq error " + code + ": " + text);
    return null;
  }

  try {
    var data = JSON.parse(text);
    var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return content ? String(content) : null;
  } catch (e) {
    console.error("Parse error: " + e + " — " + text);
    return null;
  }
}

/* ======================= HELPERS ======================= */

function isAutomated_(from) {
  return /no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|automated|bounce/.test(from);
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/* ======================= ONE-TIME SETUP HELPERS ======================= */

// Run once to store your Groq key (paste it between the quotes, run, then
// delete it again so it isn't saved in the code). Or set it in
// Project Settings → Script Properties as GROQ_API_KEY.
function saveGroqKey() {
  var KEY = "PASTE_YOUR_GROQ_KEY_HERE";
  if (KEY.indexOf("PASTE_") === 0) throw new Error("Edit KEY first.");
  PropertiesService.getScriptProperties().setProperty("GROQ_API_KEY", KEY);
}

// Run once to schedule the responder to run every 5 minutes.
function createTrigger() {
  // Remove any existing triggers for this function first.
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processSupportInbox") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("processSupportInbox").timeBased().everyMinutes(5).create();
}
