import tokens from "../styles/tokens.css?raw";

export function darkToken(name: string) {
    const match = tokens.match(new RegExp(`--${name}:\\s*light-dark\\(#\\w+,\\s*(#\\w+)\\)`));
    if (!match) throw new Error(`Unknown colour token: ${name}`);
    return match[1];
}
