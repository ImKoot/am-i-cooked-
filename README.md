# Am I cooked? 🍞

Tell the site what's going on, and a little slice of toast tells you how cooked you are.

**Try it:** https://imkoot.github.io/am-i-cooked-/

## How to use it

1. Write what's going on (one sentence is enough).
2. If you want, pick how much time you have and how much is done.
3. Press **Check if I'm cooked**.

You get a score from 1 to 100, a toast face that matches it, the reasons behind the score, and one thing you can do next.

| Score | Toast |
| --- | --- |
| 1 to 19 | Not cooked |
| 20 to 39 | A little toasty |
| 40 to 59 | Medium |
| 60 to 74 | Well done |
| 75 to 89 | Cooked |
| 90 to 100 | Burnt |

## How it works

There is no AI and no server. The page looks for certain words in what you wrote, like "tomorrow", "haven't started" or "extension", and adds or takes away points. Words like "no" or "not" are checked too, so "no extension" doesn't count as having one. The same text always gives the same score.

Nothing you write is sent anywhere. It all stays in your browser.

If someone writes about hurting themselves or a medical emergency, the site doesn't give a score. It shows a short message about getting real help instead.

## Change it

The whole site is one file: `index.html`. Open it in any text editor.

To add your own rule, find the list called `RULES` and add a line like this:

```js
{ re: /\bprinter\b/, w: 6, why: "The printer is involved" },
```

- `re` is the word to look for (in lowercase).
- `w` is the points. Use a minus number for things that help, like `-10`.
- `why` is the text shown on the page.

To change the toast messages or advice, edit the list called `LEVELS`.

## License

MIT. You can use and change it however you like.
