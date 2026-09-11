# Deploying Fairweather

Static files, no build step. From an empty machine this takes about ten minutes,
most of which is waiting.

You have no `gh` or `vercel` CLI installed, so the repo and the deploy below are
done through the browser. That is the shorter path. Step 3 covers the CLI if
you want it.

---

## 1. Create the repo on GitHub

1. Go to <https://github.com/new>.
2. **Repository name:** `fairweather`
3. **Visibility:** Public.
4. Leave *Add a README*, *.gitignore* and *licence* **unticked**. This project
   already has all three, and ticking them creates a conflicting first commit.
5. Click **Create repository**.

GitHub then shows you a page with a URL like
`https://github.com/debugagu/fairweather.git`. Keep it open.

## 2. Push

The commit is already made. Point it at GitHub and push, replacing
`debugagu`:

```bash
cd ~/Developer/fairweather && git remote add origin https://github.com/debugagu/fairweather.git && git push -u origin main
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

## 3. Optional: the Vercel CLI

You do not need this. The dashboard route in step 4 does the same job. But the
CLI gets you a live URL without touching GitHub at all, which is the fastest
path if you are short on time.

The CLI is a Node package, so Node has to exist first. This machine started with
neither Node nor Homebrew.

### Option A: Node installer, no Homebrew (fewest steps)

1. Download the macOS **ARM64** `.pkg` from <https://nodejs.org/en/download>.
   Pick the LTS line, currently **v24.x (Krypton)**. Apple Silicon is arm64, so
   take the ARM64 build rather than x64; the x64 one runs under Rosetta and is
   slower for no reason.

   Direct link for the current LTS:
   <https://nodejs.org/dist/v24.21.0/node-v24.21.0.pkg>

2. Open the `.pkg` and click through it. It asks for your password, because it
   writes to `/usr/local`.

3. Confirm it landed:

```bash
node -v && npm -v
```

4. Do **not** run `npm install -g vercel` yet. The Node installer leaves npm's
   global prefix at `/usr/local`, which is owned by `root`, so a global install
   as your own user fails with `EACCES: permission denied`. Point npm at your
   home directory first:

```bash
npm config set prefix "$HOME/.npm-global" && echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

5. Now the install works with no `sudo`:

```bash
npm install -g vercel
```

Vercel CLI needs Node 18 or newer, so any current LTS is fine.

> **Why not just `sudo npm install -g`?** It works, but every global package you
> install afterwards runs its install scripts as root, and the files it leaves
> behind are root-owned, so the next non-sudo install fails the same way. Moving
> the prefix once fixes the cause instead of the symptom.

> **Skipping the install entirely.** `npx vercel --prod` downloads and runs the
> CLI on demand without installing anything, and needs no permission fix at all.
> Good if you only intend to deploy once.

### Option B: via Homebrew

Worth it only if you expect to install other developer tools later.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Homebrew on Apple Silicon installs to `/opt/homebrew`, and the installer prints
two `echo` lines to add it to your `PATH`. Run those before continuing, or the
`brew` command will not be found in a new shell. Then:

```bash
brew install node && npm install -g vercel
```

Homebrew installs into `/opt/homebrew`, which you own, so the `EACCES` problem
above does not arise on this route.

### Deploying with it

From the project folder, log in once, then ship:

```bash
cd ~/Developer/fairweather && vercel login
```

```bash
cd ~/Developer/fairweather && vercel --prod
```

The first run asks a handful of questions. Accept the defaults: scope is your
own account, "link to existing project" is **no**, project name `fairweather`,
directory `./`, and **do not** override the build settings. It detects a static
site, uploads the files, and prints the production URL.

Redeploy any time with `vercel --prod` from the same folder.

## 4. Deploy on Vercel

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

## 5. Check it before you submit

The brief rejects links that do not open, so actually do this:

- [ ] Open the URL in a **private/incognito window** on your laptop. A logged-out
      browser is what the reviewer will use.
- [ ] Open it on your **phone**, on mobile data rather than wi-fi.
- [ ] Search a two-word city, **New Delhi**. It must not break.
- [ ] Search **Springfield**. You should get the five-way choice screen.
- [ ] Search something that does not exist. You should get an error, not a blank page.
- [ ] Set the end date before the start date. You should get a sentence explaining it.
- [ ] Visit `/note` and confirm it loads.

## 6. Put the URL in the README

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
