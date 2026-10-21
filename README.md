# Recurrence Input

`<recurrence-input>` is a form field for editing an iCalendar recurrence rule (the `RRULE` property used by CalDAV),
built as a framework-free web component on top of [rrule.js](https://github.com/jkbrzt/rrule).

[Live demo](https://beatlink.github.io/Recurrence-Widget/) · [npm](https://www.npmjs.com/package/recurrence-input)

It submits with its form like any other input. Its value is the rule without the `RRULE:` prefix, such as
`FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10`, or an empty string when the item does not repeat.

## Features

- Repeats every N seconds, minutes, hours, days, weeks, months or years.
- Picks weekdays for weekly rules, and a weekday of the month (such as the last Friday) for monthly rules.
- Ends never, after a number of repeats, or on a date.
- Describes the rule in plain English below the form.
- Keeps rule parts the form does not show (such as `BYMONTHDAY` or `BYSETPOS`), so editing a rule written by another
  client never loses them.
- Takes part in form submit, reset, disabled fieldsets and validation; a value it cannot read makes the form invalid.

## Install

```sh
npm install recurrence-input
```

## Usage

With a bundler, `import "recurrence-input";` defines the element. Without one, the page needs an import map that
resolves `rrule`:

```html
<script type="importmap">
    { "imports": { "rrule": "https://cdn.jsdelivr.net/npm/rrule@2.8.1/+esm" } }
</script>
<script type="module" src="recurrence-input.js"></script>

<form method="post">
    <recurrence-input name="rrule" value="FREQ=MONTHLY;BYDAY=-1FR"></recurrence-input>
    <button>Save</button>
</form>
```

The `value` attribute is the starting value and the form's reset value; the `value` property reads and sets the current
one. The element fires `input` and `change` events as the rule is edited.

Its parts can be styled from the page with `::part(container)`, `::part(section)`, `::part(input)`,
`::part(enabled)` and `::part(summary)`.

## Demo

Try it at https://beatlink.github.io/Recurrence-Widget/. `index.html` shows several example rules, the value each would submit and the next dates it produces. Serve the folder
and open it, for example with `python3 -m http.server`.

## License

GPL-3.0-only. See [LICENSE](LICENSE).
