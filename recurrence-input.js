// recurrence-input: rule helpers and a <recurrence-input> form field for iCalendar recurrence rules (RRULE), built on rrule.js.
// Rule values are the RRULE property value without the "RRULE:" prefix; an empty string means the item does not repeat.
// The element draws plain page elements with recurrence-input__* class names, so the page's own CSS styles it.
// Rule parts the form does not show are kept as they are, so editing a rule from another client never loses them.

import * as rrule_module from "rrule";

// Node loads rrule as CommonJS, which offers RRule only on the default export; ES module builds offer it by name.
const { RRule } = rrule_module.RRule ? rrule_module : rrule_module.default;

// ===== Constants ===================================================================================================================

const rrule_weekday_codes = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const display_weekday_codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const weekday_labels = {
    long: { SU: "Sunday", MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday" },
    short: { SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat" },
    narrow: { SU: "S", MO: "M", TU: "T", WE: "W", TH: "T", FR: "F", SA: "S" },
};

const frequency_units = [
    ["SECONDLY", "second(s)"],
    ["MINUTELY", "minute(s)"],
    ["HOURLY", "hour(s)"],
    ["DAILY", "day(s)"],
    ["WEEKLY", "week(s)"],
    ["MONTHLY", "month(s)"],
    ["YEARLY", "year(s)"],
];

const month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const month_ordinals = [
    ["1", "first"],
    ["2", "second"],
    ["3", "third"],
    ["4", "fourth"],
    ["5", "fifth"],
    ["-1", "last"],
];

const time_of_day_frequencies = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const day_of_month_frequencies = ["MONTHLY", "YEARLY"];
const all_groups = ["frequency", "interval", "time", "days", "end"];

// ===== Rule helpers ================================================================================================================

// Parses a rule into rrule options, accepting it with or without the "RRULE:" prefix; throws on text that is not a rule.
export function parse_rule(rule_text) {
    const options = RRule.parseString(String(rule_text).trim());
    if (options.freq === undefined) throw new Error("The rule has no FREQ part.");
    delete options.dtstart;
    delete options.tzid;
    return options;
}

// Turns rrule options into a rule value, with FREQ and INTERVAL first and no "RRULE:" prefix.
export function format_rule(options) {
    const { freq, interval, ...other_options } = options;
    const ordered_options = interval && interval !== 1 ? { freq, interval, ...other_options } : { freq, ...other_options };
    const rule_line = RRule.optionsToString(ordered_options)
        .split("\n")
        .find((line) => line.startsWith("RRULE:"));
    return rule_line ? rule_line.slice("RRULE:".length) : "";
}

// Describes a rule in plain English with its end date in local time, or returns "" when it is empty, invalid or has no English form.
export function describe_rule(rule_text, time_mode = "utc") {
    if (!rule_text) return "";
    try {
        const options = parse_rule(rule_text);
        if (options.until && time_mode !== "floating") options.until = to_rule_date(options.until, "floating");
        const rule = new RRule(options);
        if (!rule.isFullyConvertibleToText()) return "";
        const text = rule.toText();
        return text.charAt(0).toUpperCase() + text.slice(1);
    } catch {
        return "";
    }
}

// Converts a real date to the date rrule works with: unchanged for "utc", or its local clock time as UTC fields for "floating".
export function to_rule_date(date, time_mode = "utc") {
    if (time_mode !== "floating") return new Date(date);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
}

// Converts a date from rrule back to a real date, the reverse of to_rule_date.
export function from_rule_date(date, time_mode = "utc") {
    if (time_mode !== "floating") return new Date(date);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

// Returns the occurrence after start_date and the rule to carry forward, with COUNT lowered by one; null when the rule has ended.
export function next_occurrence(rule_text, start_date, time_mode = "utc") {
    const options = parse_rule(rule_text);
    const rule_start = to_rule_date(start_date, time_mode);
    const next_date = new RRule({ ...options, dtstart: rule_start }).after(rule_start, false);
    if (!next_date) return null;
    if (options.count) options.count -= 1;
    return { next_date: from_rule_date(next_date, time_mode), rule: format_rule(options) };
}

// Returns the first occurrence from the current minute onwards for a rule counted from then, or null when it yields none.
export function next_from_now(rule_text, time_mode = "utc") {
    const this_minute = new Date();
    this_minute.setSeconds(0, 0);
    const now = to_rule_date(this_minute, time_mode);
    const next_date = new RRule({ ...parse_rule(rule_text), dtstart: now }).after(now, true);
    return next_date ? from_rule_date(next_date, time_mode) : null;
}

// Returns a date as the "YYYY-MM-DDTHH:MM" text a datetime-local input uses, read from its local or UTC fields.
function to_datetime_input(date, use_utc_fields) {
    const pad = (number) => String(number).padStart(2, "0");
    const fields = use_utc_fields
        ? [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()]
        : [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
    return `${fields[0]}-${pad(fields[1])}-${pad(fields[2])}T${pad(fields[3])}:${pad(fields[4])}`;
}

// ===== Element styles ==============================================================================================================

const default_styles = `
    :where(recurrence-input) { display: block; }
    :where(recurrence-input [hidden]) { display: none !important; }
    :where(.recurrence-input__row) { display: flex; align-items: baseline; gap: 0.5rem; margin: 0.5em 0; }
    :where(.recurrence-input__controls) { display: flex; flex: 1; flex-wrap: wrap; align-items: center; gap: 0.25rem; min-width: 0; }
    :where(.recurrence-input__row-label) { flex: none; width: 3.5em; }
    :where(.recurrence-input__number) { width: 5em; }
    :where(.recurrence-input__weekday-input) { position: absolute; opacity: 0; pointer-events: none; }
    :where(.recurrence-input__weekday-label) {
        display: inline-block; min-width: 2.5em; padding: 0.2em 0.4em; text-align: center; cursor: pointer;
        border: 1px solid currentColor; border-radius: 0.3em; opacity: 0.7; user-select: none;
    }
    :where(.recurrence-input__weekday-input:checked + .recurrence-input__weekday-label) {
        opacity: 1; background: Highlight; color: HighlightText; border-color: Highlight;
    }
    :where(.recurrence-input__weekday-input:focus-visible + .recurrence-input__weekday-label) { outline: 2px solid Highlight; outline-offset: 1px; }
    :where(.recurrence-input__summary) { margin: 0.5em 0 0; font-style: italic; }
    :where(.recurrence-input__summary--invalid) { color: #c22f3c; font-style: normal; }
`;

let default_style_sheet = null;

// Adds the default styles once to the document or shadow root holding an element.
function adopt_default_styles(root) {
    if (!root.adoptedStyleSheets) return;
    if (!default_style_sheet) {
        default_style_sheet = new CSSStyleSheet();
        default_style_sheet.replaceSync(default_styles);
    }
    if (!root.adoptedStyleSheets.includes(default_style_sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, default_style_sheet];
}

// ===== Element markup ==============================================================================================================

let next_element_number = 0;

// Builds an option list from [value, label] pairs.
function options_markup(pairs) {
    return pairs.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

// Builds the element's controls, giving each instance its own ids so labels stay tied to their inputs.
function element_markup(id_prefix, weekday_format) {
    const labels = weekday_labels[weekday_format] ?? weekday_labels.short;
    const weekday_toggles = display_weekday_codes
        .map(
            (code) => `<span class="recurrence-input__weekday">
                <input class="recurrence-input__weekday-input" type="checkbox" id="${id_prefix}-${code}" value="${code}" data-control="weekday" data-group="days" aria-label="${weekday_labels.long[code]}">
                <label class="recurrence-input__weekday-label" for="${id_prefix}-${code}" title="${weekday_labels.long[code]}">${labels[code]}</label>
            </span>`,
        )
        .join("");
    return `
        <label class="recurrence-input__enabled"><input type="checkbox" data-control="enabled"> Repeats</label>

        <div class="recurrence-input__row recurrence-input__repeat" role="group" aria-labelledby="${id_prefix}-repeat" data-section="repeat">
            <span class="recurrence-input__row-label" id="${id_prefix}-repeat">Every</span>
            <span class="recurrence-input__controls">
                <input class="recurrence-input__number" type="number" min="1" step="1" value="1" aria-label="Interval" data-control="interval" data-group="interval" data-kind="input">
                <select data-control="frequency" data-group="frequency" data-kind="select" aria-label="Unit">${options_markup(frequency_units)}</select>
            </span>
        </div>

        <div class="recurrence-input__row recurrence-input__weekdays" role="group" aria-labelledby="${id_prefix}-weekdays" data-section="weekdays">
            <span class="recurrence-input__row-label" id="${id_prefix}-weekdays">On</span>
            <span class="recurrence-input__controls">${weekday_toggles}</span>
        </div>

        <div class="recurrence-input__row recurrence-input__month-days" role="group" aria-labelledby="${id_prefix}-month-days" data-section="month_days">
            <span class="recurrence-input__row-label" id="${id_prefix}-month-days">On</span>
            <span class="recurrence-input__controls">
                <select data-control="month" data-group="days" data-kind="select" aria-label="Month">
                    <option value="">the start's month</option>
                    ${options_markup(month_names.map((name, index) => [String(index + 1), name]))}
                </select>
                <select data-control="day_mode" data-group="days" data-kind="select" aria-label="Day">
                    <option value="start">the start's day</option>
                    <option value="day">day</option>
                    <option value="weekday">the</option>
                </select>
                <input class="recurrence-input__number" type="number" min="-31" max="31" step="1" value="1" aria-label="Day of the month" data-control="month_day" data-group="days" data-kind="input">
                <select data-control="ordinal" data-group="days" data-kind="select" aria-label="Which week">${options_markup(month_ordinals)}</select>
                <select data-control="month_weekday" data-group="days" data-kind="select" aria-label="Weekday">
                    ${options_markup(display_weekday_codes.map((code) => [code, weekday_labels.long[code]]))}
                </select>
            </span>
        </div>

        <div class="recurrence-input__row recurrence-input__time" role="group" aria-labelledby="${id_prefix}-time" data-section="time">
            <label class="recurrence-input__row-label" id="${id_prefix}-time" for="${id_prefix}-time-input">At</label>
            <span class="recurrence-input__controls">
                <input type="time" id="${id_prefix}-time-input" data-control="time" data-group="time" data-kind="input">
            </span>
        </div>

        <div class="recurrence-input__row recurrence-input__end" role="group" aria-labelledby="${id_prefix}-end" data-section="end">
            <span class="recurrence-input__row-label" id="${id_prefix}-end">Ends</span>
            <span class="recurrence-input__controls">
                <select data-control="end_type" data-group="end" data-kind="select" aria-label="How it ends">
                    <option value="never">never</option>
                    <option value="count">after a number of times</option>
                    <option value="until">on a date</option>
                </select>
                <input class="recurrence-input__number" type="number" min="1" step="1" value="1" aria-label="Number of times" data-control="end_count" data-group="end" data-kind="input">
                <input type="datetime-local" aria-label="End date" data-control="end_date" data-group="end" data-kind="input">
            </span>
        </div>

        <p class="recurrence-input__summary" aria-live="polite"></p>
    `;
}

// ===== Element =====================================================================================================================

// Defines the element class; it is only called where the DOM exists, so the rule helpers also load outside a browser.
function create_element_class() {
    return class RecurrenceInput extends HTMLElement {
        static formAssociated = true;
        static observedAttributes = ["value", "input-class", "select-class", "toggle-class", "toggle-input-class"];

        #internals = this.attachInternals();
        #controls = null;
        #disabled = false;
        #value = "";
        #value_is_dirty = false;
        #loaded_options = {};
        #changed_groups = new Set(all_groups);

        // Listens in the capture phase so the page only ever sees the element's own events, never its inner controls'.
        constructor() {
            super();
            this.addEventListener("input", (event) => this.#handle_control_event(event), true);
            this.addEventListener("change", (event) => this.#handle_control_event(event), true);
        }

        // Adds the default styles and draws the controls the first time the element joins a page.
        connectedCallback() {
            adopt_default_styles(this.getRootNode());
            if (!this.#controls) this.#load_value(this.#value_is_dirty ? this.#value : (this.getAttribute("value") ?? ""));
        }

        // Follows the value attribute until the value is set another way, and re-applies host classes when they change.
        attributeChangedCallback(name, old_value, new_value) {
            if (name === "value" && !this.#value_is_dirty) this.#load_value(new_value ?? "");
            else if (name !== "value" && this.#controls) this.#apply_host_classes();
        }

        // ===== Public interface ====================================================================================================

        get value() {
            return this.#value;
        }

        set value(new_value) {
            this.#value_is_dirty = true;
            this.#load_value(String(new_value ?? ""));
        }

        get time_mode() {
            return this.getAttribute("time-mode") === "floating" ? "floating" : "utc";
        }

        get form() {
            return this.#internals.form;
        }

        get name() {
            return this.getAttribute("name");
        }

        get type() {
            return "recurrence";
        }

        get validity() {
            return this.#internals.validity;
        }

        get validationMessage() {
            return this.#internals.validationMessage;
        }

        get willValidate() {
            return this.#internals.willValidate;
        }

        // Reports whether the value is a rule the form could read.
        checkValidity() {
            return this.#internals.checkValidity();
        }

        // Reports whether the value is valid and shows the browser's message when it is not.
        reportValidity() {
            return this.#internals.reportValidity();
        }

        // ===== Form callbacks ======================================================================================================

        // Puts the value back to the value attribute when the form is reset.
        formResetCallback() {
            this.#value_is_dirty = false;
            this.#load_value(this.getAttribute("value") ?? "");
        }

        // Restores the value the browser saved for this field on back navigation or autofill.
        formStateRestoreCallback(state) {
            this.value = state;
        }

        // Enables or disables every control along with the form.
        formDisabledCallback(disabled) {
            this.#disabled = disabled;
            if (this.#controls) this.#apply_disabled();
        }

        // ===== Drawing =============================================================================================================

        // Draws the controls once.
        #render() {
            if (this.#controls) return;
            const id_prefix = `recurrence-input-${++next_element_number}`;
            this.innerHTML = element_markup(id_prefix, this.getAttribute("weekday-format"));
            this.#controls = { weekdays: [], sections: {} };
            for (const element of this.querySelectorAll("[data-control]")) {
                if (element.dataset.control === "weekday") this.#controls.weekdays.push(element);
                else this.#controls[element.dataset.control] = element;
            }
            for (const element of this.querySelectorAll("[data-section]")) this.#controls.sections[element.dataset.section] = element;
            this.#controls.summary = this.querySelector(".recurrence-input__summary");
            this.#apply_host_classes();
            this.#apply_disabled();
        }

        // Adds the classes named by the input-class, select-class, toggle-class and toggle-input-class attributes.
        #apply_host_classes() {
            const class_names = (attribute) => (this.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean);
            const targets = [
                ["input-class", '[data-kind="input"]'],
                ["select-class", '[data-kind="select"]'],
                ["toggle-class", ".recurrence-input__weekday-label"],
                ["toggle-input-class", ".recurrence-input__weekday-input"],
            ];
            for (const [attribute, selector] of targets) {
                for (const element of this.querySelectorAll(selector)) {
                    element.classList.remove(...(element.dataset.hostClasses ?? "").split(" ").filter(Boolean));
                    element.classList.add(...class_names(attribute));
                    element.dataset.hostClasses = class_names(attribute).join(" ");
                }
            }
        }

        // Matches every control's disabled state to the element's.
        #apply_disabled() {
            for (const control of this.querySelectorAll("input, select")) control.disabled = this.#disabled;
        }

        // ===== Reading a value =====================================================================================================

        // Parses a rule into the controls, keeping the parts the form does not show.
        #load_value(rule_text) {
            this.#render();
            this.#reset_controls();
            this.#loaded_options = {};
            this.#changed_groups = new Set(all_groups);
            const trimmed_text = rule_text.trim();
            if (trimmed_text === "") {
                this.#set_value("", "");
                return;
            }
            let options;
            try {
                options = parse_rule(trimmed_text);
            } catch (error) {
                this.#controls.enabled.checked = true;
                this.#set_value(trimmed_text, `This is not a recurrence rule the form can read: ${error.message}`);
                return;
            }
            this.#loaded_options = options;
            this.#changed_groups.clear();
            this.#show_options(options);
            this.#set_value(format_rule(options), "");
        }

        // Shows a parsed rule's options in the controls.
        #show_options(options) {
            const controls = this.#controls;
            const frequency = RRule.FREQUENCIES[options.freq];
            const first_of = (value) => [value ?? []].flat()[0];
            controls.enabled.checked = true;
            controls.frequency.value = frequency;
            controls.interval.value = options.interval ?? 1;
            const weekdays = [options.byweekday ?? []].flat().map((weekday) => (typeof weekday === "number" ? { weekday } : weekday));
            if (frequency === "WEEKLY") {
                const checked_codes = new Set(weekdays.map((weekday) => rrule_weekday_codes[weekday.weekday]));
                for (const checkbox of controls.weekdays) checkbox.checked = checked_codes.has(checkbox.value);
            }
            if (day_of_month_frequencies.includes(frequency)) {
                const month_weekday = weekdays.find((weekday) => weekday.n);
                const month_day = first_of(options.bymonthday);
                if (month_weekday) {
                    controls.day_mode.value = "weekday";
                    controls.ordinal.value = String(month_weekday.n);
                    controls.month_weekday.value = rrule_weekday_codes[month_weekday.weekday];
                } else if (month_day !== undefined) {
                    controls.day_mode.value = "day";
                    controls.month_day.value = month_day;
                }
                const month = first_of(options.bymonth);
                if (frequency === "YEARLY" && month !== undefined) controls.month.value = String(month);
            }
            const hour = first_of(options.byhour);
            const minute = first_of(options.byminute) ?? 0;
            if (hour !== undefined) controls.time.value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
            if (options.until) {
                controls.end_type.value = "until";
                controls.end_date.value = to_datetime_input(options.until, this.time_mode === "floating");
            } else if (options.count) {
                controls.end_type.value = "count";
                controls.end_count.value = options.count;
            }
        }

        // Puts every control back to its starting state.
        #reset_controls() {
            const controls = this.#controls;
            controls.enabled.checked = false;
            controls.interval.value = 1;
            controls.frequency.value = "DAILY";
            for (const checkbox of controls.weekdays) checkbox.checked = false;
            controls.month.value = "";
            controls.day_mode.value = "start";
            controls.month_day.value = 1;
            controls.ordinal.value = "1";
            controls.month_weekday.value = "MO";
            controls.time.value = "";
            controls.end_type.value = "never";
            controls.end_count.value = 1;
            controls.end_date.value = "";
        }

        // ===== Writing a value =====================================================================================================

        // Rebuilds the value after an inner control changes and fires the same event from the element itself.
        #handle_control_event(event) {
            if (event.target === this || !this.#controls) return;
            event.stopPropagation();
            const controls = this.#controls;
            const group = event.target.dataset.group;
            if (group) this.#changed_groups.add(group);
            if (group === "frequency") {
                this.#changed_groups.add("days");
                this.#changed_groups.add("time");
            }
            if (event.target === controls.end_type && controls.end_type.value === "until" && !controls.end_date.value) {
                const end_of_today = new Date();
                end_of_today.setHours(23, 59, 0, 0);
                controls.end_date.value = to_datetime_input(end_of_today, false);
            }
            this.#value_is_dirty = true;
            this.#set_value(controls.enabled.checked ? format_rule(this.#build_options()) : "", "");
            this.dispatchEvent(new Event(event.type, { bubbles: true, composed: true }));
        }

        // Returns the rule's options with each changed group taken from the controls.
        #build_options() {
            const controls = this.#controls;
            const options = { ...this.#loaded_options };
            const frequency = controls.frequency.value;
            const read_number = (input, fallback) => (Number.isFinite(parseInt(input.value, 10)) ? parseInt(input.value, 10) : fallback);
            if (this.#changed_groups.has("frequency")) options.freq = RRule[frequency];
            if (this.#changed_groups.has("interval")) options.interval = Math.max(1, read_number(controls.interval, 1));
            if (this.#changed_groups.has("days")) {
                delete options.byweekday;
                delete options.bymonthday;
                delete options.bymonth;
                if (frequency === "WEEKLY") {
                    const checked = controls.weekdays.filter((checkbox) => checkbox.checked).map((checkbox) => RRule[checkbox.value]);
                    if (checked.length > 0) options.byweekday = checked;
                }
                if (day_of_month_frequencies.includes(frequency)) {
                    if (controls.day_mode.value === "day") options.bymonthday = read_number(controls.month_day, 1) || 1;
                    if (controls.day_mode.value === "weekday") {
                        options.byweekday = [RRule[controls.month_weekday.value].nth(parseInt(controls.ordinal.value, 10))];
                    }
                }
                if (frequency === "YEARLY" && controls.month.value) options.bymonth = parseInt(controls.month.value, 10);
            }
            if (this.#changed_groups.has("time")) {
                delete options.byhour;
                delete options.byminute;
                if (time_of_day_frequencies.includes(frequency) && controls.time.value) {
                    const [hour, minute] = controls.time.value.split(":").map(Number);
                    options.byhour = hour;
                    options.byminute = minute;
                }
            }
            if (this.#changed_groups.has("end")) {
                delete options.count;
                delete options.until;
                if (controls.end_type.value === "count") options.count = Math.max(1, read_number(controls.end_count, 1));
                if (controls.end_type.value === "until" && controls.end_date.value) {
                    options.until = to_rule_date(new Date(controls.end_date.value), this.time_mode);
                }
            }
            return options;
        }

        // Stores the value, reports it to the form and refreshes what the controls show.
        #set_value(value, error_message) {
            this.#value = value;
            this.#internals.setFormValue(value, value);
            if (error_message) this.#internals.setValidity({ customError: true }, error_message, this.#controls.enabled);
            else this.#internals.setValidity({});
            this.#update_visibility();
            const summary = this.#controls.summary;
            summary.textContent = error_message || describe_rule(value, this.time_mode);
            summary.classList.toggle("recurrence-input__summary--invalid", Boolean(error_message));
            summary.hidden = summary.textContent === "";
        }

        // ===== Display =============================================================================================================

        // Shows only the rows and controls that apply to the chosen frequency and end type.
        #update_visibility() {
            const controls = this.#controls;
            const sections = controls.sections;
            const enabled = controls.enabled.checked;
            const frequency = controls.frequency.value;
            sections.repeat.hidden = !enabled;
            sections.end.hidden = !enabled;
            sections.weekdays.hidden = !enabled || frequency !== "WEEKLY";
            sections.month_days.hidden = !enabled || !day_of_month_frequencies.includes(frequency);
            sections.time.hidden = !enabled || !time_of_day_frequencies.includes(frequency);
            controls.month.hidden = frequency !== "YEARLY";
            controls.month_day.hidden = controls.day_mode.value !== "day";
            controls.ordinal.hidden = controls.day_mode.value !== "weekday";
            controls.month_weekday.hidden = controls.day_mode.value !== "weekday";
            controls.end_count.hidden = controls.end_type.value !== "count";
            controls.end_date.hidden = controls.end_type.value !== "until";
        }
    };
}

// Only the first copy of this module to load registers the element, so loading it again never throws.
export const RecurrenceInput = typeof HTMLElement === "undefined" ? undefined : (customElements.get("recurrence-input") ?? create_element_class());
if (RecurrenceInput && !customElements.get("recurrence-input")) customElements.define("recurrence-input", RecurrenceInput);
