/**
 * Programming-language colors pinned from GitHub Linguist's languages.yml.
 *
 * Bash follows Linguist's Shell entry and Visual Basic follows Visual Basic
 * .NET. Keep this map separate from the search-index source catalog because
 * colors do not affect index generation or its catalog integrity hash.
 */
export const languageColors: Readonly<Record<string, string>> = {
  python: "#3572A5",
  rust: "#dea584",
  javascript: "#f1e05a",
  typescript: "#3178c6",
  go: "#00ADD8",
  c: "#555555",
  cpp: "#f34b7d",
  csharp: "#7355dd",
  java: "#b07219",
  php: "#4F5D95",
  ruby: "#701516",
  swift: "#F05138",
  kotlin: "#A97BFF",
  scala: "#c22d40",
  dart: "#00B4AB",
  elixir: "#6e4a7e",
  erlang: "#B83998",
  haskell: "#5e5086",
  lua: "#000080",
  perl: "#0298c3",
  r: "#198CE7",
  julia: "#a270ba",
  clojure: "#db5855",
  groovy: "#4298b8",
  objc: "#438eff",
  bash: "#89e051",
  powershell: "#012456",
  fsharp: "#b845fc",
  visualbasic: "#945db7",
  zig: "#ec915c",
  nim: "#ffc200",
  crystal: "#000100",
  d: "#ba595e",
  ocaml: "#ef7a08",
  solidity: "#AA6746",
  elm: "#60B5CC",
  racket: "#3c5caa",
  commonlisp: "#3fb68b",
  fortran: "#4d41b1",
  haxe: "#df7900",
  sql: "#e38c00",
  webassembly: "#04133b",
  html: "#e34c26",
  css: "#663399"
};

export function getLanguageColor(languageId: string): string | undefined {
  return languageColors[languageId];
}

export function getLanguageTagTextColor(
  backgroundColor: string
): "#000000" | "#ffffff" {
  if (!/^#[0-9a-f]{6}$/i.test(backgroundColor)) {
    throw new Error(`Invalid language color: ${backgroundColor}`);
  }

  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(backgroundColor.slice(offset, offset + 2), 16)
  );
  const [red, green, blue] = channels.map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}
