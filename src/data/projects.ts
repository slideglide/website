import { SITE } from "../config/site";

export interface Project {
    name: string;
    description: string;
    language: string;
    dot: "blue" | "amber" | "rose" | "violet";
    license?: string;
    url: string;
    codeberg?: string;
}

export const PROJECTS: Project[] = [
    {
        name: "No Coyote Jumping",
        description: "Mod that disables coyote jumping in platformer mode.",
        language: "C++",
        dot: "rose",
        license: "MIT",
        url: `${SITE.socials.github}/no-coyote-jumping`,
        codeberg: `${SITE.socials.codeberg}/no-coyote-jumping`,
    },
    {
        name: "Stats Display API",
        description: "An API mod that allows mod developers to add stat items to the icon kit.",
        language: "C++",
        dot: "rose",
        url: `${SITE.socials.github}/garage-stats-menu`,
    },
    {
        name: "Unregistered HyperCam 2",
        description: "Adds the iconic 'Unregistered HyperCam 2' watermark to Geometry Dash. Modtober 2025 submission.",
        language: "C++",
        dot: "rose",
        license: "MIT",
        url: `${SITE.socials.github}/unregistered-hypercam-2-watermark-geode`,
        codeberg: `${SITE.socials.codeberg}/unregistered-hypercam-2-watermark-geode`,
    },
];
