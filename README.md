# Am I Cooked?

Type what's going on and the Cook-O-Tron 3000 tells you how cooked you are.

Live at https://imkoot.github.io/am-i-cooked-/

## How to use it

1. Write your problem. One sentence is fine.
2. Pick how much time you have and how much is done (or leave them on "not sure").
3. Hit the button and wait for the loading bar.

You get a score from 1 to 100, a face, the reasons behind the score, and one thing to do next.

| Score | Verdict |
| --- | --- |
| 1 to 19 | Not cooked |
| 20 to 39 | Lightly toasted |
| 40 to 59 | Medium |
| 60 to 74 | Well done |
| 75 to 89 | Cooked |
| 90 to 100 | Burnt to a crisp |

## How it works

There's no AI and no server. The page looks for words in what you wrote ("tomorrow", "haven't started", "extension" and so on) and adds or takes away points. If "no" or "not" comes right before a helpful word, it doesn't count, so "no extension" is not an extension. The same text always gives the same score.

The loading bar is fake. It's just there because it's funny.

Nothing you type is sent anywhere. The visitor counter only counts visits from your own browser.

If someone writes about hurting themselves or a medical emergency, the site skips the joke and shows a short message about getting real help.

## Changing stuff

Everything is in `index.html`. Open it in any text editor.

To add a rule, find the list called `RULES` and add a line:

```js
{ re: /\bprinter\b/, w: 6, why: "The printer is involved" },
```

`re` is the word to look for (lowercase), `w` is the points (use a minus number for stuff that helps), and `why` is what shows up on the page.

The verdict names, messages and advice are in the list called `LEVELS`.

## License

MIT
