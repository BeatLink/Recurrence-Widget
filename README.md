# Recurrence Input

`<recurrence-input>` is a form field for editing an iCalendar recurrence rule (the `RRULE` property used by CalDAV),
built as a framework-free web component on top of [rrule.js](https://github.com/jkbrzt/rrule).

[Live demo](https://beatlink.github.io/Recurrence-Widget/) · [npm](https://www.npmjs.com/package/recurrence-input)

It submits with its form like any other input. Its value is the rule without the `RRULE:` prefix, such as
`FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10`, or an empty string when the item does not repeat.

## Features

- Repeats every N seconds, minutes, hours, days, weeks, months or years, optionally at a time of day.
- Weekly rules pick weekdays; monthly and yearly rules pick a day of the month (such as the 15th, or -1 for the last
  day) or a weekday of the month (such as the last Friday); yearly rules can also pick the month.
- Ends never, after a number of times, or on a date and time.
- Describes the rule in plain English below the form.
- Keeps rule parts the form does not show (such as `BYSETPOS`), so editing a rule written by another client never
  loses them.
- Takes part in form submit, reset, disabled fieldsets and validation; a value it cannot read makes the form invalid.
- Draws ordinary page elements, so the page's own CSS styles it (see [Styling](#styling)).
- Also exports the rule helpers it uses, such as `describe_rule` and `next_occurrence`, for code without a form.

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

### Attributes

| Attribute | Meaning |
| --- | --- |
| `name`, `value` | As on any form field. |
| `time-mode` | `utc` (default): the end date is a real moment, written in UTC. `floating`: times are local clock times stored in rrule's UTC fields, so they stay fixed across daylight-saving changes. |
| `weekday-format` | `short` (default, "Mon"), `narrow` ("M") or `long` ("Monday") for the weekday toggles. |
| `input-class`, `select-class` | Extra classes for the text, number, time and date inputs, and for the drop-downs, such as Bootstrap's `form-control` and `form-select`. |
| `toggle-class`, `toggle-input-class` | Extra classes for the weekday toggle labels and their checkboxes, such as Bootstrap's `btn btn-primary` and `btn-check`. |

## Styling

The element has no shadow DOM. Its built-in styles are wrapped in `:where()`, so any rule on the page overrides them.
Every part has a class to target:

| Class | Part |
| --- | --- |
| `recurrence-input__enabled` | The "Repeats" checkbox and its label. |
| `recurrence-input__row` | Each row: `__repeat`, `__weekdays`, `__month-days`, `__time` and `__end`. |
| `recurrence-input__row-label`, `recurrence-input__controls` | A row's label, and the controls beside it. |
| `recurrence-input__number` | The number inputs. |
| `recurrence-input__weekday-input`, `recurrence-input__weekday-label` | A weekday toggle's hidden checkbox, and the label drawn as its button. |
| `recurrence-input__summary` | The plain-English description; it also has `--invalid` when showing an error. |

## Rule helpers

All take and return rule values without the `RRULE:` prefix, and `time_mode` is `"utc"` (default) or `"floating"`, as
for the attribute.

| Function | Returns |
| --- | --- |
| `parse_rule(rule)` | rrule options for the rule; throws if it is not a rule. |
| `format_rule(options)` | The rule value for rrule options. |
| `describe_rule(rule, time_mode)` | The rule in plain English, or `""`. |
| `next_occurrence(rule, start_date, time_mode)` | `{ next_date, rule }`: the occurrence after `start_date`, and the rule to keep, with `COUNT` lowered by one; `null` once it has ended. |
| `next_from_now(rule, time_mode)` | The first occurrence from the current minute, counting the rule from then, or `null`. |
| `to_rule_date(date, time_mode)`, `from_rule_date(date, time_mode)` | A date converted to and from the form rrule works with. |

They need no DOM, so they also work in Node.

## Demo

Try it at https://beatlink.github.io/Recurrence-Widget/. `index.html` shows several example rules, the value each would
submit and the next dates it produces. Serve the folder and open it, for example with `python3 -m http.server`.

## License

GPL-3.0-only. See [LICENSE](LICENSE).
