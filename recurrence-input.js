// <recurrence-input>: a form field for editing an iCalendar recurrence rule (RRULE), built on rrule.js.
// Its value is the RRULE property value without the "RRULE:" prefix, or empty when the item does not repeat.
// Rule parts the form does not show are kept as they are, so editing a rule from another client never loses them.

import { RRule } from "rrule";

// ===== Constants ===================================================================================================================

const display_weekday_codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const rrule_weekday_codes = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const weekday_names = { SU: "Sunday", MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday" };

const frequency_units = [
    ["SECONDLY", "second(s)"],
    ["MINUTELY", "minute(s)"],
    ["HOURLY", "hour(s)"],
    ["DAILY", "day(s)"],
    ["WEEKLY", "week(s)"],
    ["MONTHLY", "month(s)"],
    ["YEARLY", "year(s)"],
];

const month_ordinals = [
    ["1", "First"],
    ["2", "Second"],
    ["3", "Third"],
    ["4", "Fourth"],
    ["5", "Fifth"],
    ["-1", "Last"],
];

const all_groups = ["frequency", "interval", "weekdays", "end"];

// ===== Template ====================================================================================================================

const template = document.createElement("template");
template.innerHTML = `
    <style>
        :host { display: block; }
        [hidden] { display: none !important; }
        fieldset.container { border: none; margin: 0; padding: 0; }
        fieldset.section { margin: 0.5em 0; }
        input[type="number"] { width: 5em; }
        .weekdays { display: flex; flex-wrap: wrap; gap: 0.25em 1em; }
        .summary { margin: 0.5em 0 0; font-style: italic; }
    </style>
    <fieldset class="container" name="container" part="container">
        <label part="enabled"><input name="enabled" type="checkbox"> Repeats</label>

        <fieldset class="section" name="repeat_section" part="section">
            <legend>Every</legend>
            <input name="interval" type="number" min="1" step="1" value="1" part="input" data-group="interval">
            <select name="frequency" part="input" data-group="frequency">
                ${frequency_units.map(([code, unit]) => `<option value="${code}">${unit}</option>`).join("")}
            </select>
        </fieldset>

        <fieldset class="section" name="weekly_section" part="section">
            <legend>On</legend>
            <div class="weekdays">
                ${display_weekday_codes
                    .map((code) => `<label><input name="weekday" type="checkbox" value="${code}" data-group="weekdays"> ${weekday_names[code]}</label>`)
                    .join("")}
            </div>
        </fieldset>

        <fieldset class="section" name="monthly_section" part="section">
            <legend>On the</legend>
            <select name="month_ordinal" part="input" data-group="weekdays">
                ${month_ordinals.map(([value, name]) => `<option value="${value}">${name}</option>`).join("")}
            </select>
            <select name="month_weekday" part="input" data-group="weekdays">
                <option value="">Same day as the start</option>
                ${display_weekday_codes.map((code) => `<option value="${code}">${weekday_names[code]}</option>`).join("")}
            </select>
        </fieldset>

        <fieldset class="section" name="end_section" part="section">
            <legend>Ends</legend>
            <select name="end_type" part="input" data-group="end">
                <option value="never">Never</option>
                <option value="count">After a number of repeats</option>
                <option value="until">On a date</option>
            </select>
            <input name="end_count" type="number" min="1" step="1" value="1" part="input" data-group="end">
            <input name="end_date" type="date" part="input" data-group="end">
        </fieldset>

        <p class="summary" part="summary"></p>
    </fieldset>
`;

// ===== Element =====================================================================================================================

class RecurrenceInput extends HTMLElement {
    static formAssociated = true;
    static observedAttributes = ["value"];

    #internals = this.attachInternals();
    #value = "";
    #value_is_dirty = false;
    #loaded_options = {};
    #changed_groups = new Set(all_groups);
    #controls = {};

    // Builds the shadow form and wires its controls to the value.
    constructor() {
        super();
        const shadow_root = this.attachShadow({ mode: "open" });
        shadow_root.append(template.content.cloneNode(true));
        for (const element of shadow_root.querySelectorAll("[name]")) {
            if (element.name === "weekday") continue;
            this.#controls[element.name] = element;
        }
        this.#controls.weekdays = [...shadow_root.querySelectorAll('input[name="weekday"]')];
        this.#controls.summary = shadow_root.querySelector(".summary");
        this.#controls.frequency.value = "DAILY";
        shadow_root.addEventListener("input", (event) => this.#handle_control_event(event));
        shadow_root.addEventListener("change", (event) => this.#handle_control_event(event));
    }

    // Loads the value attribute once the element is on the page.
    connectedCallback() {
        if (!this.#value_is_dirty) this.#load_value(this.getAttribute("value") ?? "");
    }

    // Follows the value attribute until the value is set another way.
    attributeChangedCallback(name, old_value, new_value) {
        if (name === "value" && !this.#value_is_dirty) this.#load_value(new_value ?? "");
    }

    // ===== Public interface ========================================================================================================

    get value() {
        return this.#value;
    }

    set value(new_value) {
        this.#value_is_dirty = true;
        this.#load_value(String(new_value ?? ""));
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

    // ===== Form callbacks ==========================================================================================================

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
        this.#controls.container.disabled = disabled;
    }

    // ===== Reading a value =========================================================================================================

    // Parses a rule into the controls, keeping the parts the form does not show.
    #load_value(rule_text) {
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
            options = RRule.parseString(trimmed_text);
            if (options.freq === undefined) throw new Error("The rule has no FREQ part.");
        } catch (error) {
            this.#controls.enabled.checked = true;
            this.#set_value(trimmed_text, `This is not a recurrence rule the form can read: ${error.message}`);
            return;
        }
        delete options.dtstart;
        delete options.tzid;
        this.#loaded_options = options;
        this.#changed_groups.clear();
        this.#show_options(options);
        this.#set_value(this.#build_value(), "");
    }

    // Shows a parsed rule's options in the controls.
    #show_options(options) {
        const controls = this.#controls;
        controls.enabled.checked = true;
        controls.frequency.value = RRule.FREQUENCIES[options.freq];
        controls.interval.value = options.interval ?? 1;
        const weekdays = [options.byweekday ?? []].flat().map((weekday) => (typeof weekday === "number" ? { weekday } : weekday));
        if (options.freq === RRule.WEEKLY) {
            const checked_codes = new Set(weekdays.map((weekday) => rrule_weekday_codes[weekday.weekday]));
            for (const checkbox of controls.weekdays) checkbox.checked = checked_codes.has(checkbox.value);
        }
        if (options.freq === RRule.MONTHLY) {
            const month_weekday = weekdays.find((weekday) => weekday.n);
            if (month_weekday) {
                controls.month_ordinal.value = String(month_weekday.n);
                controls.month_weekday.value = rrule_weekday_codes[month_weekday.weekday];
            }
        }
        if (options.until) {
            controls.end_type.value = "until";
            controls.end_date.value = options.until.toISOString().slice(0, 10);
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
        controls.month_ordinal.value = "1";
        controls.month_weekday.value = "";
        controls.end_type.value = "never";
        controls.end_count.value = 1;
        controls.end_date.value = "";
    }

    // ===== Writing a value =========================================================================================================

    // Rebuilds the value after a control changes and passes the event on from the element itself.
    #handle_control_event(event) {
        event.stopPropagation();
        const group = event.target.dataset.group;
        if (group) this.#changed_groups.add(group);
        if (group === "frequency") this.#changed_groups.add("weekdays");
        this.#value_is_dirty = true;
        this.#set_value(this.#build_value(), "");
        this.dispatchEvent(new Event(event.type, { bubbles: true, composed: true }));
    }

    // Combines the loaded rule with the control groups the user has changed.
    #build_value() {
        if (!this.#controls.enabled.checked) return "";
        const options = this.#build_options();
        const rule_line = RRule.optionsToString(options)
            .split("\n")
            .find((line) => line.startsWith("RRULE:"));
        return rule_line ? rule_line.slice("RRULE:".length) : "";
    }

    // Returns the rule's options with each changed group taken from the controls.
    #build_options() {
        const controls = this.#controls;
        const options = { ...this.#loaded_options };
        const frequency = RRule[controls.frequency.value];
        if (this.#changed_groups.has("frequency")) options.freq = frequency;
        if (this.#changed_groups.has("interval")) {
            const interval = Math.max(1, parseInt(controls.interval.value, 10) || 1);
            if (interval === 1) delete options.interval;
            else options.interval = interval;
        }
        if (this.#changed_groups.has("weekdays")) {
            delete options.byweekday;
            if (frequency === RRule.WEEKLY) {
                const checked = controls.weekdays.filter((checkbox) => checkbox.checked).map((checkbox) => RRule[checkbox.value]);
                if (checked.length > 0) options.byweekday = checked;
            }
            if (frequency === RRule.MONTHLY && controls.month_weekday.value) {
                options.byweekday = [RRule[controls.month_weekday.value].nth(parseInt(controls.month_ordinal.value, 10))];
            }
        }
        if (this.#changed_groups.has("end")) {
            delete options.count;
            delete options.until;
            if (controls.end_type.value === "count") options.count = Math.max(1, parseInt(controls.end_count.value, 10) || 1);
            if (controls.end_type.value === "until" && controls.end_date.value) {
                options.until = new Date(`${controls.end_date.value}T23:59:59Z`);
            }
        }
        const { freq, interval, ...other_options } = options;
        return interval ? { freq, interval, ...other_options } : { freq, ...other_options };
    }

    // Stores the value, reports it to the form and refreshes what the controls show.
    #set_value(value, error_message) {
        this.#value = value;
        this.#internals.setFormValue(value, value);
        if (error_message) this.#internals.setValidity({ customError: true }, error_message, this.#controls.enabled);
        else this.#internals.setValidity({});
        this.#update_visibility();
        this.#update_summary(error_message);
    }

    // ===== Display =================================================================================================================

    // Shows only the sections that apply to the chosen frequency and end type.
    #update_visibility() {
        const controls = this.#controls;
        const enabled = controls.enabled.checked;
        const frequency = controls.frequency.value;
        controls.repeat_section.hidden = !enabled;
        controls.end_section.hidden = !enabled;
        controls.weekly_section.hidden = !enabled || frequency !== "WEEKLY";
        controls.monthly_section.hidden = !enabled || frequency !== "MONTHLY";
        controls.month_ordinal.hidden = !controls.month_weekday.value;
        controls.end_count.hidden = controls.end_type.value !== "count";
        controls.end_date.hidden = controls.end_type.value !== "until";
    }

    // Describes the rule in plain English, or shows why it could not be read.
    #update_summary(error_message) {
        const summary = this.#controls.summary;
        summary.textContent = error_message || this.#describe_rule();
        summary.hidden = summary.textContent === "";
    }

    // Returns rrule's English description of the current rule, or nothing when it has none.
    #describe_rule() {
        if (this.#value === "") return "";
        const rule = new RRule(this.#build_options());
        if (!rule.isFullyConvertibleToText()) return "";
        const text = rule.toText();
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}

customElements.define("recurrence-input", RecurrenceInput);

export { RecurrenceInput };
