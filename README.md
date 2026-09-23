# am-i-cooked 💀

Describe your situation. A doneness thermometer tells you how cooked you are.

No backend, no API keys, no build step. It's plain HTML, CSS and JavaScript, and everything runs in the browser. Nothing you type is sent anywhere.

## Try it

Open `index.html` in a browser. That's it.

If you prefer a local server (recommended for development):

```bash
npx serve .
```

## How the verdict works

The scoring lives in [`js/engine.js`](js/engine.js) and is a transparent rule system, not a language model.

1. Every situation starts at a neutral base score.
2. Each rule (a regular expression plus a weight) that matches adds or removes points. "Haven't started" adds points, "I have an extension" removes them.
3. The two optional dropdowns (how long you have, how much is done) add points too and override matching words in the text.
4. A small deterministic jitter, derived from a hash of the text, keeps different inputs from landing on identical numbers. Same text, same result, every time.
5. Scores above 75 are compressed, so "Charred" takes real effort.

The result page shows the top factors that moved the score, so you can see why you're cooked.

| Score | Verdict |
| --- | --- |
| 0 to 19 | Not cooked |
| 20 to 39 | Lightly toasted |
| 40 to 59 | Medium |
| 60 to 74 | Well done |
| 75 to 89 | Cooked |
| 90 to 100 | Charred |

Messages that mention self-harm or medical emergencies don't get a verdict. They get a short message pointing to real help instead.

## Add your own rule

Open `js/engine.js` and add an entry to the `RULES` array:

```js
{ re: /\b(printer|copier) (jammed|broke)\b/, w: 6, why: "The printer is involved" },
```

- `re` is matched against lowercased text.
- `w` is the points. Use a negative number for something that makes you less cooked.
- `why` is the label shown to the user.
- Optional flags: `time: true` (skipped when the deadline dropdown is used) and `progress: true` (skipped when the progress dropdown is used).

Negative rules are ignored when negated ("no extension", "not ready"), so you don't have to handle that yourself.

Then run the tests:

```bash
npm test
```

Tests use Node's built-in test runner (Node 18 or newer). There are no dependencies to install.

## Project structure

```
am-i-cooked/
├── index.html                  Page markup
├── css/style.css               Styles (light and dark mode)
├── js/engine.js                Scoring engine (pure logic, no DOM)
├── js/app.js                   UI wiring
├── test/engine.test.js         Unit tests
└── .github/workflows/pages.yml Test and deploy to GitHub Pages on push to main
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow from the **Actions** tab).

The site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Contributing

New rules, new verdict lines and bug fixes are welcome. Please keep the tone kind: the joke is on the situation, never on the person.

## License

MIT. See [LICENSE](LICENSE).
