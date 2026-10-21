# Recurrence Input

`<recurrence-input>` is a form field for editing iCalendar recurrence (RFC 5545, the `RRULE`, `EXDATE` and `RDATE`
properties used by CalDAV), built as a framework-free web component on top of [rrule.js](https://github.com/jkbrzt/rrule).

[Live demo](https://beatlink.github.io/Recurrence-Widget/) · [npm](https://www.npmjs.com/package/recurrence-input)

It submits with its form like any other input. Its value is the rule without the `RRULE:` prefix, such as
`FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10`, or an empty string when the item does not repeat. With `value-format="ical"` the
value is the `RRULE`, `EXDATE` and `RDATE` lines together.

## Features

- Every RFC 5545 rule part. The form covers the common ones directly:
  - every N seconds, minutes, hours, days, weeks, months or years;
  - several times of day, or minutes past the hour for hourly rules and seconds for minutely ones;
  - weekdays for weekly rules, and "only on" weekdays for daily and shorter rules;
  - for monthly and yearly rules, several days of the month (`15`, `-1` for the last), several weekday entries ("every
    Monday", "the last Friday"), or both (Friday the 13th), and "only the last of those" (`BYSETPOS`);
  - for yearly rules, the months, defaulting to the start's month so a day pattern never silently means every month;
  - ending never, after a number of times, or on a date.
- The `features` attribute shows as little or as much of this as a page needs, from `simple` to `full`.
- **More options** (in `full`) edits every `BY` part directly (`BYMONTH`, `BYWEEKNO`, `BYYEARDAY`, `BYMONTHDAY`, `BYDAY`, `BYHOUR`,
  `BYMINUTE`, `BYSECOND`, `BYSETPOS`) and `WKST`, checking each against the ranges and frequencies the RFC allows.
- Dates to skip (`EXDATE`) and add (`RDATE`) with `value-format="ical"`.
- `UNTIL` and the extra dates match the event's start: plain dates for `all-day`, no `Z` for `time-mode="floating"`,
  and UTC otherwise, as the RFC requires.
- Keeps everything it cannot edit exactly as written: rule parts it does not show, `X-` parts, `TZID` date lines, and
  whole rules in an `RSCALE` calendar (RFC 7529), which rrule.js cannot calculate, so those are shown read-only.
- Describes the rule in plain English below the form, including times and `BYSETPOS`.
- Takes part in form submit, reset, disabled fieldsets and validation; a value or field it cannot read makes the form
  invalid.
- Draws ordinary page elements, so the page's own CSS styles it (see [Styling](#styling)).
- Also exports the helpers it uses, such as `describe_rule` and `next_occurrence`, for code without a form.

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
| `features` | How much of the form to show: `simple`, `standard` (default) or `full`, then feature names to add, or remove with a leading `-`, such as `standard -sub-daily` or `simple times`. See [Features to show](#features-to-show). |
| `value-format` | `rrule` (default): the value is one rule. `ical`: the value is `RRULE`, `EXDATE` and `RDATE` lines, and the form shows dates to skip and add. |
| `time-mode` | `utc` (default): dates are real moments, written in UTC with a `Z`. `floating`: dates are local clock times written without a `Z`, for an event whose start has no time zone; they stay fixed across daylight-saving changes. |
| `all-day` | The event's start is a date without a time: dates are written as plain dates, and times of day are hidden. |
| `start` | The event's start (`YYYY-MM-DD`, optionally with a time), used to pick sensible defaults, such as the month for a yearly rule. |
| `weekday-format` | `short` (default, "Mon"), `narrow` ("M") or `long` ("Monday") for the weekday toggles. |
| `input-class`, `select-class`, `button-class` | Extra classes for the inputs, the drop-downs and the add and remove buttons, such as Bootstrap's `form-control`, `form-select` and `btn`. |
| `toggle-class`, `toggle-input-class` | Extra classes for the weekday and month toggle labels and their checkboxes, such as Bootstrap's `btn btn-primary` and `btn-check`. |

### Features to show

| Feature | Adds |
| --- | --- |
| `times` | Several times of day; without it there is one time input. |
| `month-days` | Several days of the month; without it there is one. |
| `weekday-entries` | Several weekday entries ("every Monday", "the last Friday") and "days that fall on certain weekdays"; without it there is one entry. |
| `months` | Several months for yearly rules; without it picking a month replaces the last one. |
| `set-position` | "Only the last of those" (`BYSETPOS`). |
| `filters` | "Only on" weekdays for daily and shorter rules. |
| `sub-daily` | Hourly, minutely and secondly rules, with minutes or seconds past. |
| `exdates` | Dates to skip and add, with `value-format="ical"`. |
| `more-options` | The More options section, editing every `BY` part and `WKST` directly. |

`simple` has none of these, `standard` has all but `more-options`, and `full` has all of them. Hiding a feature never
changes a rule: parts it would edit are kept, and the description still includes them. Where a hidden feature leaves a
single control, such as one time, that control shows the first value, and editing it replaces the whole part.

## Styling

The element has no shadow DOM. Its built-in styles are wrapped in `:where()`, so any rule on the page overrides them.
Every part has a class to target:

| Class | Part |
| --- | --- |
| `recurrence-input__enabled` | The "Repeats" checkbox and its label. |
| `recurrence-input__row` | Each row: `__repeat`, `__weekdays`, `__months`, `__month-days`, `__set-position`, `__times`, `__hour-minutes`, `__minute-seconds`, `__end`, `__exdates` and `__rdates`. |
| `recurrence-input__row-label`, `recurrence-input__controls` | A row's label, and the controls beside it. |
| `recurrence-input__list`, `recurrence-input__item` | A list of repeated controls (weekday entries, times, dates), and one entry in it. |
| `recurrence-input__number` | The number inputs. |
| `recurrence-input__toggle`, `recurrence-input__toggle-input`, `recurrence-input__toggle-label` | A weekday or month toggle, its hidden checkbox, and the label drawn as its button. |
| `recurrence-input__more`, `recurrence-input__part`, `recurrence-input__part-name` | The More options section, one rule part in it, and that part's name. |
| `recurrence-input__summary` | The plain-English description; it also has `--invalid` when showing an error. |

## Helpers

`format` is `"utc"` (default), `"floating"`, or `{ time_mode, all_day }`, as for the attributes. Values are rules
without the `RRULE:` prefix, or `RRULE`/`EXDATE`/`RDATE` lines; functions that return a value return the same kind.

| Function | Returns |
| --- | --- |
| `parse_rule(rule)` | rrule options for one rule, with every `BY` part as a list and unknown parts in `extra_parts`; throws if it is not a rule. |
| `format_rule(options, format)` | The rule value for those options. |
| `parse_recurrence(text)` | `{ rule, exdates, rdates, extra_lines }` from `RRULE`, `EXDATE` and `RDATE` lines. |
| `format_recurrence(recurrence, format)` | Those lines again. |
| `describe_rule(value, format)` | The value in plain English, or `""`. |
| `next_occurrence(value, start_date, format)` | `{ next_date, rule }`: the occurrence after `start_date`, and the value to keep, with `COUNT` lowered by one; `null` once it has ended. |
| `next_from_now(value, format)` | The first occurrence from the current minute, counting the rule from then, or `null`. |
| `rule_calendar(options)` | A rule's non-Gregorian `RSCALE` part, or `""`. |
| `to_rule_date(date, format)`, `from_rule_date(date, format)` | A date converted to and from the form rrule works with. |

They need no DOM, so they also work in Node. The calculating helpers throw for `RSCALE` calendars.

## Demo

Try it at https://beatlink.github.io/Recurrence-Widget/. `index.html` shows several example rules, the value each would
submit and the next dates it produces. Serve the folder and open it, for example with `python3 -m http.server`.

## License

GPL-3.0-only. See [LICENSE](LICENSE).
