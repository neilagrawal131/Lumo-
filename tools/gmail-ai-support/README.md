# Etude — AI support responder for Gmail

A tiny Google Apps Script that watches your support inbox and writes AI replies
to customer emails. By default it saves them as **drafts** for you to review and
send. Free to run (Apps Script + Groq's free tier).

## What you need
- The Gmail account you want to answer from (e.g. your support inbox).
- A free Groq API key from https://console.groq.com (Keys → Create API Key).

## Setup (about 10 minutes)

1. Go to **https://script.google.com** and click **New project**.
   - Make sure you're signed in as the Gmail account that should send the replies.
2. Delete the default `myFunction` code, then paste in the contents of **Code.gs**.
3. Click **Save** (disk icon). Name the project something like "Etude Support AI".
4. **Add your Groq key** (pick one):
   - **Easy:** Project Settings (gear icon) → **Script Properties** → **Add script property** →
     name `GROQ_API_KEY`, value = your `gsk_...` key → Save.
   - Or: paste the key into the `saveGroqKey` function, select `saveGroqKey` in the
     function dropdown, click **Run** once, then remove the key from the code.
5. **Edit the `ETUDE_CONTEXT` text** near the top of Code.gs so it matches your real
   plans, pricing, and policies. The AI only knows what you put here.
6. **Authorize it:** in the function dropdown pick `processSupportInbox`, click **Run**.
   Google will ask you to allow the script to access Gmail — approve it. (You may see a
   "Google hasn't verified this app" screen — click Advanced → Go to project → Allow.
   It's your own script.)
7. **Schedule it:** pick `createTrigger` in the dropdown and click **Run** once. It will
   now check for new emails every 5 minutes.

## How it works day to day
- New unread emails in your inbox get an AI-written **draft reply**. Open Gmail, review
  the draft, edit if needed, and hit send.
- Handled threads get an **"AI Support Handled"** label so they aren't processed twice.
- Emails from `no-reply`/automated senders are skipped.

## Switching to full auto-send (later)
Once you trust the replies, set `AUTO_SEND = true` at the top of Code.gs and save.
It will then send replies automatically instead of drafting them. Start with drafts.

## Tuning
- `MODEL` — the Groq model to use.
- `MAX_PER_RUN` — how many emails to handle each run.
- `SIGNATURE` — the sign-off line.
- `ETUDE_CONTEXT` — the knowledge/policies the AI answers from (the important one).
