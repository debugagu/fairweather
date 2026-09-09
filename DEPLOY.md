# Deploying Fairweather

Static files, no build step. From an empty machine this takes about ten minutes,
most of which is waiting.

You have no `gh` or `vercel` CLI installed, so both the repo and the deploy are
done through the browser. That is the shorter path anyway.

---

## 1. Create the repo on GitHub

1. Go to <https://github.com/new>.
2. **Repository name:** `fairweather`
3. **Visibility:** Public.
4. Leave *Add a README*, *.gitignore* and *licence* **unticked**. This project
   already has all three, and ticking them creates a conflicting first commit.
5. Click **Create repository**.

GitHub then shows you a page with a URL like
`https://github.com/YOUR-USERNAME/fairweather.git`. Keep it open.

## 2. Push

The commit is already made. Point it at GitHub and push, replacing
`YOUR-USERNAME`:

```bash
cd ~/Developer/fairweather && git remote add origin https://github.com/YOUR-USERNAME/fairweather.git && git push -u origin main
```

Git will ask for a username and password. **The password is not your GitHub
password**, because GitHub stopped accepting those. It wants a Personal Access Token:

1. Go to <https://github.com/settings/tokens?type=beta>.
2. **Generate new token** → name it `fairweather`, expiry 30 days.
3. **Repository access:** Only select repositories → `fairweather`.
4. **Permissions:** Repository permissions → Contents → **Read and write**.
5. Generate, copy the token, paste it as the password.

macOS stores it in the keychain, so you are only asked once.

> If you would rather not deal with tokens, install
> [GitHub Desktop](https://desktop.github.com), open this folder, and press
> Publish. Same result.

## 3. Deploy on Vercel

1. Go to <https://vercel.com/new> and sign in **with GitHub**. Signing in this
   way is what makes your repos appear in the next step.
2. Find `fairweather` in the list and click **Import**.
3. On the configure screen, change nothing:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: empty
   - Output Directory: empty
   - Install Command: empty

   Vercel detects a static site and serves the folder as-is. There is no build
   to configure and no environment variable to set, because the app has no key
   and no server.
4. Click **Deploy**. It takes under a minute.

You get a URL like `https://fairweather-xyz123.vercel.app`. Under
**Settings → Domains** you can rename it to something like
`fairweather-agasthya.vercel.app`, which reads better on a submission form.

Every later `git push` to `main` redeploys automatically.

## 4. Check it before you submit

The brief rejects links that do not open, so actually do this:

- [ ] Open the URL in a **private/incognito window** on your laptop. A logged-out
      browser is what the reviewer will use.
- [ ] Open it on your **phone**, on mobile data rather than wi-fi.
- [ ] Search a two-word city, **New Delhi**. It must not break.
- [ ] Search **Springfield**. You should get the five-way choice screen.
- [ ] Search something that does not exist. You should get an error, not a blank page.
- [ ] Set the end date before the start date. You should get a sentence explaining it.
- [ ] Visit `/note` and confirm it loads.

## 5. Put the URL in the README

```bash
cd ~/Developer/fairweather && git add README.md && git commit -m "Add live URL" && git push
```

---

## If something goes wrong

**Page loads but stays blank.** Open the browser console. A module failing to
load means a filename case mismatch. Vercel's filesystem is case-sensitive and
macOS is not, so `JS/main.js` works locally and 404s in production.

**"Failed to fetch" in the console.** Open-Meteo is down or rate-limiting. The
app shows its own error state for this; the free tier allows roughly 10,000
calls a day, which a demo will not touch.

**Vercel builds but shows a 404.** The Root Directory is wrong. Settings →
General → Root Directory should be `./`.

**`git push` rejected as non-fast-forward.** You ticked one of the *Add a
README* boxes when creating the repo. Fix with:

```bash
cd ~/Developer/fairweather && git pull --rebase origin main && git push -u origin main
```
