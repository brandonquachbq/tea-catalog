# 茶 · Gongfu Tea Catalog

A tiny, fully-local website to catalog your teas and how to brew them gong fu cha style — water temperature, leaf amount, per-steep timing, tasting notes, inventory, and food pairings. No server, no install, no account. Your data lives in your own browser.

## Run it

Either:

- **Just open it** — double-click `index.html` (opens in your browser), or
- **Serve it** (recommended, enables clipboard + all features):
  ```
  python3 serve.py
  ```
  then visit http://127.0.0.1:8123

## Add teas

- **By hand** — click **+ Add Tea** and fill in the form.
- **With AI (fast)** — click **✨ AI Prompt**, copy the prompt, paste it into a chat with Claude, and list your teas. It replies with a `.json` file. Save it, then **drag the file anywhere onto the page** (or use **Import**) to add them all at once.

Your catalog is saved automatically in this browser. Use **Export** to back it up to a `.json` file.

## Share it with friends

This whole folder is the app — nothing is tied to your machine.

1. Zip the folder and send it (or share the files however you like):
   ```
   cd ..
   zip -r tea-catalog.zip "Tea" -x "*/.git/*"
   ```
2. Your friend unzips it and opens `index.html` (or runs `python3 serve.py`).
3. They start empty (your teas stay in *your* browser, not in the files). To build their own catalog, they click **✨ AI Prompt**, paste it to Claude, list *their* teas, and drag the result in.

So everyone gets the same app and the same AI workflow, but each person's catalog is their own.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The page |
| `styles.css` | Styling |
| `app.js` | All logic + the built-in AI prompt |
| `serve.py` | Optional zero-config local server |
| `README.md` | This file |

## Data format

Import/Export use a JSON **array** of tea objects. See the schema inside **✨ AI Prompt** (it's the same shape Export produces, so files round-trip cleanly).
