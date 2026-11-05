import { SITE } from "../config/site";
import { LEAF } from "../data/leaf";
import { PROJECTS } from "../data/projects";
import { SOGGY, SOGGY_COLORS, SOGGY_PALETTE } from "../data/soggy";
import { SOCIALS } from "../data/socials";
import { withBase } from "../lib/url";

const dialog = document.querySelector<HTMLDialogElement>("#terminal")!;
const output = document.querySelector<HTMLElement>("#terminal-output")!;
const form = document.querySelector<HTMLFormElement>("#terminal-form")!;
const input = document.querySelector<HTMLInputElement>("#terminal-input")!;
const overlay = document.querySelector<HTMLElement>("#terminal-overlay")!;
const promptLabel = document.querySelector<HTMLElement>("#terminal-prompt")!;
const pager = document.querySelector<HTMLUListElement>("#terminal-pager")!;
const openButton = document.querySelector<HTMLButtonElement>("#terminal-open")!;
const closeButton = document.querySelector<HTMLButtonElement>("#terminal-close")!;
const tabButton = document.querySelector<HTMLButtonElement>("#terminal-tab")!;

const POSTS: { title: string; date: string; url: string }[] = JSON.parse(dialog.dataset.posts ?? "[]");
const GENERATOR = dialog.dataset.generator ?? "Astro";
const HOST = new URL(SITE.url).host;
const USER = `visitor@${SITE.shortName}`;


type Tone = "accent" | "success" | "error" | "muted";
type Part = string | { text: string; tone?: Tone; href?: string };

function toElement(part: Part) {
    if (typeof part === "string") return document.createTextNode(part);
    const element = document.createElement(part.href ? "a" : "span");
    element.textContent = part.text;
    if (part.tone) element.className = `tone-${part.tone}`;
    if (part.href && element instanceof HTMLAnchorElement) {
        element.href = part.href;
        if (!part.href.startsWith("/")) {
            element.target = "_blank";
            element.rel = "noopener";
        }
    }
    return element;
}

function makeLine(...parts: Part[]) {
    const line = document.createElement("p");
    line.append(...parts.map(toElement));
    return line;
}

function print(...parts: Part[]) {
    output.append(makeLine(...parts));
}

function promptParts(): Part[] {
    const status = lastStatus ? [{ text: ` [${lastStatus}]`, tone: "error" as const }] : [];
    return [{ text: USER, tone: "success" }, " ", { text: "~", tone: "accent" }, ...status, "> "];
}

function renderPrompt() {
    promptLabel.replaceChildren(...promptParts().map(toElement));
}


interface Completion {
    name: string;
    description: string;
}

interface Command {
    summary: string;
    run: (args: string[]) => number | void;
    hidden?: boolean;
    args?: () => Completion[];
}

const OPEN_TARGETS = [
    ...SOCIALS.map(({ label, url }) => ({ name: label.toLowerCase(), url })),
    { name: "blog", url: withBase("/blog/") },
    { name: "home", url: withBase("/") },
];

const FOLDERS = [
    {
        name: "blog",
        description: "blog posts",
        entries: () => POSTS.map(({ title, url }) => ({ text: title, href: url })),
    },
    {
        name: "projects",
        description: "projects",
        entries: () => PROJECTS.map(({ name, url }) => ({ text: name, href: url })),
    },
    {
        name: "socials",
        description: "social links",
        entries: () => SOCIALS.map(({ label, url }) => ({ text: label, href: url })),
    },
];

function formatUptime() {
    const total = Math.floor(performance.now() / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return minutes ? `${minutes} min, ${seconds} sec` : `${seconds} sec`;
}

function fastfetch() {
    const dark = (document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
    const rows: [string, string][] = [
        ["Host", HOST],
        ["Kernel", GENERATOR],
        ["Uptime", formatUptime()],
        ["Packages", `${PROJECTS.length} (projects), ${POSTS.length} (posts)`],
        ["Shell", "fish, sort of"],
        ["Resolution", `${innerWidth}x${innerHeight}`],
        ["Theme", dark ? "Dark" : "Light"],
        ["Font", getComputedStyle(document.body).fontFamily.split(",")[0]!.replaceAll('"', "")],
        ["Terminal", "<dialog>"]
    ];

    const logo = document.createElement("pre");
    logo.className = "fetch-logo tone-success";
    logo.setAttribute("aria-hidden", "true");
    logo.textContent = LEAF;

    const palette = document.createElement("p");
    palette.className = "fetch-palette";
    palette.setAttribute("aria-hidden", "true");
    for (const token of ["accent", "success", "dot-blue", "dot-amber", "dot-rose", "dot-violet", "text-muted", "text-primary"]) {
        const swatch = document.createElement("span");
        swatch.style.background = `var(--${token})`;
        palette.append(swatch);
    }

    const info = document.createElement("div");
    info.className = "fetch-info";
    info.append(
        makeLine({ text: USER, tone: "success" }),
        makeLine("-".repeat(USER.length)),
        ...rows.map(([key, value]) => makeLine({ text: `${key}: `, tone: "accent" }, value)),
        palette,
    );

    const block = document.createElement("div");
    block.className = "fetch";
    block.append(logo, info);
    output.append(block);
}

function soggy() {
    const levels = " .:-=+*#%@";

    const art = document.createElement("pre");
    art.className = "soggy";
    art.setAttribute("aria-hidden", "true");
    const lines = SOGGY.split("\n");
    art.style.setProperty("--columns", String(Math.max(...lines.map((line) => line.length))));
    art.style.setProperty("--rows", String(lines.length));

    const colorLines = SOGGY_COLORS.split("\n");
    lines.forEach((line, row) => {
        const colors = colorLines[row]!;
        for (let start = 0, end = 1; start < line.length; start = end, end = start + 1) {
            while (colors[end] === colors[start] && end < line.length) end++;
            const text = line.slice(start, end).replace(/\d/g, (level) => levels[Number(level)]!);
            const color = SOGGY_PALETTE[parseInt(colors[start]!, 36)];
            if (!color) {
                art.append(text);
                continue;
            }
            const run = document.createElement("span");
            run.style.color = color;
            run.textContent = text;
            art.append(run);
        }
        art.append("\n");
    });
    output.append(art);
    print({ text: "soggy.", tone: "muted" });
}

const COMMANDS = new Map<string, Command>([
    [
        "help",
        {
            summary: "list the commands",
            args: () => visibleCommands(),
            run: ([topic]) => {
                if (topic) {
                    const command = COMMANDS.get(topic.toLowerCase());
                    if (!command || command.hidden) {
                        print({ text: `help: no such command: ${topic}`, tone: "error" });
                        return 1;
                    }
                    print({ text: topic.toLowerCase(), tone: "accent" }, `: ${command.summary}`);
                    return;
                }
                const width = Math.max(...visibleCommands().map(({ name }) => name.length)) + 2;
                for (const { name, description } of visibleCommands()) {
                    print({ text: name.padEnd(width), tone: "accent" }, description);
                }
                print({ text: "Tab completes, → accepts a suggestion, ↑ searches history.", tone: "muted" });
            },
        },
    ],
    ["whoami", { summary: "show who runs this site", run: () => print(SITE.name) }],
    [
        "bio",
        {
            summary: "show the bio",
            run: () => {
                print({ text: "From: ", tone: "accent" }, SITE.bio.from);
                print({ text: "What I do: ", tone: "accent" }, SITE.bio.work);
                print({ text: "Tools: ", tone: "accent" }, SITE.bio.tools.join(", "));
                print({ text: "Contributes to:", tone: "accent" });
                for (const { name, url, note } of SITE.bio.contributions) {
                    print("  ", { text: name, href: url }, `: ${note}`);
                }
                print("  ", { text: "All merged pull requests", href: SITE.bio.allContributions });
                print({ text: "Issues: ", tone: "accent" }, SITE.bio.issues);
            },
        },
    ],
    [
        "projects",
        {
            summary: "list the projects",
            run: () => {
                for (const { name, description, language, license, url } of PROJECTS) {
                    const meta = license ? `${language}, ${license}` : language;
                    print({ text: name, href: url }, { text: ` (${meta})`, tone: "muted" }, `: ${description}`);
                }
            },
        },
    ],
    [
        "blog",
        {
            summary: "list the blog posts",
            run: () => {
                if (!POSTS.length) print("No posts yet.");
                for (const { title, date, url } of POSTS) {
                    print({ text: `${date}  `, tone: "muted" }, { text: title, href: url });
                }
            },
        },
    ],
    [
        "socials",
        {
            summary: "list the social links",
            run: () => {
                for (const { label, url } of SOCIALS) {
                    print({ text: `${label}: `, tone: "accent" }, { text: url, href: url });
                }
            },
        },
    ],
    [
        "ls",
        {
            summary: "list what's on this site",
            args: () => FOLDERS.map(({ name, description }) => ({ name, description })),
            run: (args) => {
                const [path] = args.filter((arg) => !arg.startsWith("-"));
                if (!path || path === "." || path === "~") {
                    const folders = FOLDERS.flatMap(({ name }): Part[] => [{ text: `${name}/`, tone: "accent" }, "  "]);
                    print("bio  ", ...folders);
                    return;
                }
                const folder = FOLDERS.find(({ name }) => name === path.toLowerCase().replace(/\/$/, ""));
                if (!folder) {
                    print({ text: `ls: cannot access '${path}': No such file or directory`, tone: "error" });
                    return 2;
                }
                for (const { text, href } of folder.entries()) print({ text, href });
            },
        },
    ],
    ["fastfetch", { summary: "show system information", run: fastfetch }],
    ["soggy", { summary: "print a soggy cat", run: soggy }],
    [
        "open",
        {
            summary: "open a link by name",
            args: () => OPEN_TARGETS.map(({ name, url }) => ({ name, description: url })),
            run: ([name]) => {
                const target = OPEN_TARGETS.find((item) => item.name === name?.toLowerCase());
                if (!target) {
                    print({ text: `open: unknown name. Try: ${OPEN_TARGETS.map((item) => item.name).join(", ")}`, tone: "error" });
                    return 1;
                }
                if (target.url.startsWith("/")) location.href = target.url;
                else window.open(target.url, "_blank", "noopener");
                print("Opening ", { text: target.url, href: target.url });
            },
        },
    ],
    [
        "history",
        {
            summary: "list earlier commands",
            run: () => {
                [...history].reverse().forEach((command, index) => {
                    print({ text: `${String(index + 1).padStart(3)}  `, tone: "muted" }, command);
                });
            },
        },
    ],
    ["echo", { summary: "print some text", run: (args) => print(args.join(" ")) }],
    ["date", { summary: "show the date and time", run: () => print(new Date().toString()) }],
    ["clear", { summary: "clear the screen", run: () => output.replaceChildren() }],
    ["exit", { summary: "close the terminal", run: () => dialog.close() }],
]);

const JOKES: [string, string][] = [
    ["sudo", "Nice try."],
    ["rm", "Let's not."],
    ["vim", "You'd never get out. Try exit."],
    ["emacs", "This terminal isn't big enough for that."],
    ["make", "Make what? A sandwich? Try sudo."],
    ["neofetch", "It's 2026. Try fastfetch."],
    ["cd", "You can look, but you can't leave ~. Try ls."],
    ["bash", "You're happy here. Stay a while."],
];

for (const [name, reply] of JOKES) {
    COMMANDS.set(name, { summary: "", hidden: true, run: () => print(reply) });
}

function visibleCommands(): Completion[] {
    return [...COMMANDS]
        .filter(([, command]) => !command.hidden)
        .map(([name, command]) => ({ name, description: command.summary }));
}

function run(line: string) {
    output.append(makeLine(...promptParts(), ...highlight(line)));
    const [name = "", ...args] = line.split(/\s+/);
    const command = COMMANDS.get(name.toLowerCase());
    if (command) {
        lastStatus = command.run(args) ?? 0;
    } else {
        print({ text: `command not found: ${name}. Try "help".`, tone: "error" });
        lastStatus = 127;
    }
    renderPrompt();
    output.scrollTop = output.scrollHeight;
}

let lastStatus = 0;


const HISTORY_KEY = "terminal-history";
const HISTORY_LIMIT = 200;

function loadHistory(): string[] {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
        return Array.isArray(saved) ? saved.filter((item) => typeof item === "string") : [];
    } catch {
        return [];
    }
}

const history = loadHistory();

function remember(line: string) {
    const previous = history.indexOf(line);
    if (previous !== -1) history.splice(previous, 1);
    history.unshift(line);
    history.length = Math.min(history.length, HISTORY_LIMIT);
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
    }
}

let historySearch: { query: string; matches: string[]; index: number } | null = null;

function stepHistory(step: 1 | -1) {
    historySearch ??= {
        query: input.value,
        matches: history.filter((item) => item.includes(input.value) && item !== input.value),
        index: -1,
    };
    const index = Math.min(Math.max(historySearch.index + step, -1), historySearch.matches.length - 1);
    historySearch.index = index;
    setInput(historySearch.matches[index] ?? historySearch.query);
}


interface Candidate extends Completion {
    value: string;
}

function completions(line: string): Candidate[] {
    const match = line.trimStart().match(/^(\S*)(?:(\s+)(\S*))?$/);
    if (!match) return [];
    const [, first = "", gap, partial = ""] = match;
    if (gap === undefined) {
        return visibleCommands()
            .filter(({ name }) => name.startsWith(first.toLowerCase()))
            .map((item) => ({ ...item, value: item.name }));
    }
    const name = first.toLowerCase();
    return (COMMANDS.get(name)?.args?.() ?? [])
        .filter((item) => item.name.startsWith(partial.toLowerCase()))
        .map((item) => ({ ...item, value: `${name} ${item.name}` }));
}

function suggestion(line: string) {
    if (!line.trim()) return "";
    const fromHistory = history.find((item) => item.startsWith(line) && item !== line);
    if (fromHistory) return fromHistory;
    const fromCommands = completions(line).find(({ value }) => value.startsWith(line) && value !== line);
    return fromCommands?.value ?? "";
}

function commonPrefix(values: string[]) {
    let prefix = values[0] ?? "";
    for (const value of values) {
        while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    return prefix;
}

function highlight(line: string): Part[] {
    const match = line.match(/^(\s*)(\S+)(.*)$/s);
    if (!match) return [line];
    const [, space = "", name = "", rest = ""] = match;
    const tone: Tone = COMMANDS.has(name.toLowerCase()) ? "accent" : "error";
    return [space, { text: name, tone }, rest];
}

function caretAtEnd() {
    return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
}

function currentSuggestion() {
    return caretAtEnd() ? suggestion(input.value) : "";
}

function render() {
    const ghost = currentSuggestion().slice(input.value.length);
    overlay.replaceChildren(
        ...highlight(input.value).map(toElement),
        toElement({ text: ghost, tone: "muted" }),
    );
    overlay.scrollLeft = input.scrollLeft;
}

function setInput(value: string) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
    input.scrollLeft = input.scrollWidth;
    render();
}


let menu: { items: Candidate[]; index: number; original: string } | null = null;

function closeMenu() {
    menu = null;
    pager.replaceChildren();
    pager.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
}

function renderMenu() {
    if (!menu) return;
    const { items, index } = menu;
    pager.replaceChildren(
        ...items.map((item, position) => {
            const option = document.createElement("li");
            option.id = `terminal-option-${position}`;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", String(position === index));
            option.append(toElement({ text: item.name, tone: "accent" }), " ", toElement({ text: `(${item.description})`, tone: "muted" }));
            option.addEventListener("click", () => {
                closeMenu();
                setInput(item.value);
                input.focus();
            });
            return option;
        }),
    );
    pager.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (index >= 0) {
        input.setAttribute("aria-activedescendant", `terminal-option-${index}`);
        pager.children[index]?.scrollIntoView({ block: "nearest" });
    } else {
        input.removeAttribute("aria-activedescendant");
    }
}

function stepMenu(step: 1 | -1) {
    if (!menu) return;
    const count = menu.items.length;
    menu.index = menu.index === -1 && step === -1 ? count - 1 : (menu.index + step + count) % count;
    setInput(menu.items[menu.index]!.value);
    renderMenu();
}

function complete() {
    if (menu) {
        stepMenu(1);
        return;
    }
    const items = completions(input.value);
    if (items.length === 0) return;
    if (items.length === 1) {
        const [only] = items;
        const takesArgs = !only!.value.includes(" ") && COMMANDS.get(only!.value)?.args;
        setInput(only!.value + (takesArgs ? " " : ""));
        return;
    }
    const prefix = commonPrefix(items.map(({ value }) => value));
    if (prefix.length > input.value.length) setInput(prefix);
    menu = { items, index: -1, original: input.value };
    renderMenu();
}


function acceptSuggestion(wordOnly: boolean) {
    const full = currentSuggestion();
    if (!full) return false;
    if (!wordOnly) {
        setInput(full);
        return true;
    }
    const next = full.slice(input.value.length).match(/^\s*\S+/)?.[0] ?? "";
    setInput(input.value + next);
    return true;
}

input.addEventListener("keydown", (event) => {
    const { key, ctrlKey, altKey, shiftKey } = event;

    if (key === "Tab" && (!shiftKey || menu)) {
        event.preventDefault();
        if (shiftKey) stepMenu(-1);
        else complete();
    } else if (menu && (key === "ArrowDown" || key === "ArrowUp")) {
        event.preventDefault();
        stepMenu(key === "ArrowDown" ? 1 : -1);
    } else if (menu && key === "Escape") {
        event.preventDefault();
        const { original } = menu;
        closeMenu();
        setInput(original);
    } else if (menu && key === "Enter") {
        event.preventDefault();
        closeMenu();
        render();
    } else if (key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        stepHistory(key === "ArrowUp" ? 1 : -1);
    } else if ((key === "ArrowRight" || key === "End" || (ctrlKey && key === "f") || (ctrlKey && key === "e")) && !shiftKey) {
        if (caretAtEnd() && acceptSuggestion(altKey)) event.preventDefault();
    } else if (ctrlKey && key === "c" && input.selectionStart === input.selectionEnd && !getSelection()?.toString()) {
        event.preventDefault();
        output.append(makeLine(...promptParts(), input.value, { text: "^C", tone: "muted" }));
        output.scrollTop = output.scrollHeight;
        setInput("");
    } else if (ctrlKey && key === "l") {
        event.preventDefault();
        output.replaceChildren();
    } else if (ctrlKey && key === "u") {
        event.preventDefault();
        setInput(input.value.slice(input.selectionStart ?? 0));
        input.setSelectionRange(0, 0);
        render();
    } else if (ctrlKey && key === "d" && !input.value) {
        event.preventDefault();
        dialog.close();
    }
});

input.addEventListener("input", () => {
    historySearch = null;
    closeMenu();
    render();
});

for (const type of ["keyup", "click", "scroll", "select"]) {
    input.addEventListener(type, render);
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const line = input.value.trim();
    historySearch = null;
    closeMenu();
    setInput("");
    if (!line) return;
    remember(line);
    run(line);
    render();
});

tabButton.addEventListener("click", () => {
    if (!menu && acceptSuggestion(false)) {
        input.focus();
        return;
    }
    complete();
    input.focus();
});

output.addEventListener("click", (event) => {
    if (getSelection()?.toString()) return;
    if (event.target instanceof Element && event.target.closest("a")) return;
    input.focus();
});


let greeted = false;

function open() {
    if (dialog.open) return;
    dialog.showModal();
    if (!greeted) {
        greeted = true;
        print({ text: "Welcome! ", tone: "success" }, "Try ", { text: "fastfetch", tone: "accent" }, " or ", { text: "help", tone: "accent" }, ". Esc closes.");
    }
    renderPrompt();
    render();
    input.focus();
}

function isTypingTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && (target.isContentEditable || target.matches("input:not([type=radio]), textarea, select"));
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "`" || event.repeat || event.metaKey || isTypingTarget(event.target)) return;
    if (event.ctrlKey && !event.altKey) return;
    event.preventDefault();
    open();
});

dialog.addEventListener("close", closeMenu);
openButton.addEventListener("click", open);
closeButton.addEventListener("click", () => dialog.close());
openButton.hidden = false;
