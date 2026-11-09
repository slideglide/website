import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import herbSvg from "../assets/noto-herb.svg?raw";
import { SITE } from "../config/site";
import { darkToken } from "./theme";
import { withBase } from "./url";

export interface OgCard {
    label: string;
    date?: string;
    title: string;
    description: string;
}

const loadFont = (subset: string, weight: 400 | 700) =>
    readFile(`node_modules/@fontsource/figtree/files/figtree-${subset}-${weight}-normal.woff`);

const fonts = Promise.all(
    (["latin", "latin-ext"] as const).flatMap((subset) =>
        ([400, 700] as const).map(async (weight) => ({
            name: subset === "latin" ? "Figtree" : "Figtree Ext",
            data: await loadFont(subset, weight),
            weight,
            style: "normal" as const,
        })),
    ),
);

const colors = {
    page: darkToken("bg-page"),
    border: darkToken("border"),
    primary: darkToken("text-primary"),
    secondary: darkToken("text-secondary"),
    muted: darkToken("text-muted"),
    accent: darkToken("accent"),
};

const darken = (hex: string, factor: number) =>
    hex.replace(/\w\w/g, (channel) =>
        Math.round(parseInt(channel, 16) * factor)
            .toString(16)
            .padStart(2, "0"),
    );

const herb = `data:image/svg+xml,${encodeURIComponent(
    herbSvg.replaceAll("#5B9821", darken(colors.accent, 0.72)).replace(/#8DC02[CD]/g, colors.accent),
)}`;

const el = (type: string, style: Record<string, unknown>, children?: unknown, props: Record<string, unknown> = {}) => ({
    type,
    props: { style, children, ...props },
});

const titleSize = (title: string) => (title.length <= 24 ? 92 : title.length <= 48 ? 74 : 60);

const siteLabel = () => {
    const { host, pathname } = new URL(withBase("/"), SITE.url);
    return `${host}${pathname.replace(/\/$/, "")}`;
};

function card({ label, date, title, description }: OgCard) {
    return el(
        "div",
        {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "64px 72px 52px",
            background: colors.page,
            fontFamily: "Figtree",
        },
        [
            el("div", { display: "flex", flex: 1, minHeight: 0 }, [
                el("div", { display: "flex", flexDirection: "column", width: 150, paddingTop: 8 }, [
                    el("div", { fontSize: 32, fontWeight: 700, color: colors.primary }, label),
                    ...(date ? [el("div", { marginTop: 6, fontSize: 25, color: colors.muted }, date)] : []),
                ]),
                el("div", { width: 2, marginRight: 44, background: colors.border }),
                el("div", { display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }, [
                    el(
                        "div",
                        {
                            display: "block",
                            lineClamp: 3,
                            fontSize: titleSize(title),
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.1,
                            color: colors.accent,
                        },
                        title,
                    ),
                    el(
                        "div",
                        {
                            display: "block",
                            lineClamp: 2,
                            marginTop: 26,
                            fontSize: 33,
                            lineHeight: 1.35,
                            color: colors.secondary,
                        },
                        description.replace(/ (\S+)$/, "\u00a0$1"),
                    ),
                ]),
            ]),
            el(
                "div",
                {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 36,
                    paddingTop: 28,
                    borderTop: `2px solid ${colors.border}`,
                },
                [
                    el("div", { display: "flex", alignItems: "center" }, [
                        el("img", { marginRight: 16 }, undefined, { src: herb, width: 50, height: 50 }),
                        el("div", { fontSize: 36, fontWeight: 700, color: colors.primary }, SITE.name),
                    ]),
                    el("div", { fontSize: 29, color: colors.muted }, siteLabel()),
                ],
            ),
        ],
    );
}

export async function renderOgImage(data: OgCard) {
    const svg = await satori(card(data) as never, { ...SITE.ogImage, fonts: await fonts });
    return new Resvg(svg, { fitTo: { mode: "width", value: SITE.ogImage.width } }).render().asPng();
}
