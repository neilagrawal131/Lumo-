/**
 * Etude — AI support responder for Gmail (Google Apps Script).
 *
 * Finds new unread emails in your inbox, asks an AI to write a reply as Etude
 * support, and (by default) saves it as a DRAFT for you to review and send.
 *
 * SETUP: only TWO things to edit below — GROQ_API_KEY and (optionally) the
 * ETUDE_CONTEXT text. Then run `processSupportInbox` once to authorize, and
 * `createTrigger` once to schedule it. That's it.
 */

/* =====================================================================
   1) PASTE YOUR GROQ KEY HERE (the one that starts with gsk_)
   ===================================================================== */
var GROQ_API_KEY = "PASTE_YOUR_GROQ_KEY_HERE";

/* =====================================================================
   2) TELL THE AI ABOUT ETUDE (edit to match your real policies)
   ===================================================================== */
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
  "- If you are unsure, or the question involves a specific account, refund, or billing dispute, do NOT guess. Say a team member will follow up.",
  "- Never share internal system details or API keys, and don't invent policies.",
  "- Write only the body of the email reply (no subject line).",
].join("\n");

/* =====================================================================
   3) OPTIONS (you can leave these as-is)
   ===================================================================== */
var AUTO_SEND = false;          // false = save drafts you approve; true = send automatically
var MODEL = "llama-3.3-70b-versatile";
var MAX_PER_RUN = 10;
var HANDLED_LABEL = "AI Support Handled";
var SIGNATURE = "— The Etude Team";

/* =====================================================================
   Nothing below here needs editing.
   ===================================================================== */

function processSupportInbox() {
  if (GROQ_API_KEY.indexOf("PASTE_") === 0) {
    throw new Error("Paste your Groq key into GROQ_API_KEY at the top of the file first.");
  }

  var label = getOrCreateLabel_(HANDLED_LABEL);
  var me = String(Session.getActiveUser().getEmail() || "").toLowerCase();
  var query = 'is:unread in:inbox -label:"' + HANDLED_LABEL + '"';
  var threads = GmailApp.search(query, 0, MAX_PER_RUN);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    try {
      var messages = thread.getMessages();
      var last = messages[messages.length - 1];
      var from = String(last.getFrom() || "").toLowerCase();

      if (me && from.indexOf(me) !== -1) { thread.addLabel(label); continue; }
      if (isAutomated_(from)) { thread.addLabel(label); continue; }

      var subject = last.getSubject() || "(no subject)";
      var customerMessage = String(last.getPlainBody() || "").slice(0, 4000);
      if (!customerMessage.trim()) { thread.addLabel(label); continue; }

      var reply = generateReply_(subject, customerMessage);
      if (!reply) continue;

      var body = reply.trim() + "\n\n" + SIGNATURE;
      if (AUTO_SEND) { thread.reply(body); } else { thread.createDraftReply(body); }
      thread.addLabel(label);

      // Space out requests to stay under the AI provider's per-minute limit.
      Utilities.sleep(1500);
    } catch (err) {
      console.error("Thread failed: " + err);
    }
  }
}

function generateReply_(subject, customerMessage) {
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

  // Retry on rate-limit (HTTP 429): wait the suggested time and try again.
  for (var attempt = 0; attempt < 4; attempt++) {
    var res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + GROQ_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var code = res.getResponseCode();
    var text = res.getContentText();

    if (code === 429) {
      var waitSec = parseRetryAfter_(text);
      console.log("Rate limited — waiting " + waitSec + "s then retrying.");
      Utilities.sleep(Math.min(waitSec * 1000 + 500, 25000));
      continue;
    }
    if (code < 200 || code >= 300) {
      console.error("Groq error " + code + ": " + text);
      return null;
    }
    try {
      var data = JSON.parse(text);
      var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      return content ? String(content) : null;
    } catch (e) {
      console.error("Parse error: " + e);
      return null;
    }
  }

  console.error("Groq: still rate limited after retries — will try this email next run.");
  return null;
}

// Pull the "try again in X.Xs" hint out of a Groq 429 body; default to 8s.
function parseRetryAfter_(body) {
  var m = /try again in ([\d.]+)s/.exec(body || "");
  return m ? Math.ceil(parseFloat(m[1])) : 8;
}

function isAutomated_(from) {
  return /no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|automated|bounce/.test(from);
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

// Run once to schedule the responder to run every 5 minutes.
function createTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processSupportInbox") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("processSupportInbox").timeBased().everyMinutes(5).create();
}
