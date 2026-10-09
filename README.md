# 📋 Subscription Tracker

A simple, private, single-page web app for people who juggle **lots of subscriptions**.
Keep track of which **service** each account is on, the **login email**, and a
**password hint** — all in one place.

> 🔒 **Privacy first:** your data is stored only in your own browser
> (`localStorage`). Nothing is ever uploaded to a server. For safety, the app
> stores a **password *hint* only** — never your actual password.

## ✨ Features

- **Dropdown of popular platforms** — Netflix, Amazon Prime, Disney+, Spotify,
  YouTube, GitHub, Google One, Xbox Game Pass and many more, grouped by category.
- **"Other" option** — not in the list? Pick *Other* and type any custom name.
- **Login email** per subscription.
- **Password hint only** (safe — no real passwords stored).
- Optional **monthly cost** and **renewal date**, with a running **monthly total**.
- **Search**, **edit**, **delete**.
- **Export** a JSON backup and **Import** it back — on the same or a new device.
- Works fully offline. No accounts, no tracking, no backend.

## 🔁 How your data is saved & how to check it later

Your list is saved **automatically** in your browser's `localStorage` the moment
you add/edit/delete — there's no "save" button. To look at it again later, just
reopen the app:

- **If hosted on GitHub Pages:** bookmark the URL
  (`https://<your-username>.github.io/subscription-tracker/`) and open it anytime —
  your list is still there.
- **If opened as a local file:** reopen `index.html` in the **same browser on the
  same device**.

Your data stays as long as you use the **same browser on the same device** and
don't clear browsing data. It does **not** sync across devices or browsers.
To move your data (new phone, new laptop, different browser), use **Export backup**
on the old one and **Import backup** on the new one.

## 🚀 Use it

Just open `index.html` in any browser — that's it.

### Host it free on GitHub Pages

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Choose branch **`main`** and folder **`/ (root)`**, then **Save**.
4. Your site will be live at `https://<your-username>.github.io/subscription-tracker/`.

## 🗂️ Project structure

```
subscription-tracker/
├── index.html   # markup + the service dropdown
├── styles.css   # dark, responsive styling
├── app.js       # logic + localStorage persistence
└── README.md
```

## 🔐 A note on security

This tool deliberately stores only **hints**, not real passwords. For managing
actual credentials, use a dedicated password manager (Bitwarden, 1Password, etc.).
Think of this app as an **inventory** of what you're subscribed to and which
email each account uses.

## 📄 License

[MIT](LICENSE)
