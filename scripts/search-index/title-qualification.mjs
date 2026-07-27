const PROPOSAL_SOURCE_IDS = new Set([
  "openjdk-jeps",
  "python-peps",
  "tc39-proposals",
  "wg21-papers"
]);

const CPP_NAMESPACES = new Set([
  "chrono",
  "execution",
  "filesystem",
  "linalg",
  "numbers",
  "ranges",
  "this_thread"
]);

const CPP_OPERATOR_NAMES = new Map([
  ["op_assign", "operator="],
  ["op_equal", "operator=="],
  ["op_not_equal", "operator!="],
  ["op_less", "operator<"],
  ["op_less_equal", "operator<="],
  ["op_greater", "operator>"],
  ["op_greater_equal", "operator>="],
  ["op_compare_3way", "operator<=>"],
  ["op_index", "operator[]"],
  ["op_call", "operator()"],
  ["op_bool", "operator bool"],
  ["op_arrow", "operator->"],
  ["op_dereference", "operator*"],
  ["op_increment", "operator++"],
  ["op_decrement", "operator--"],
  ["op_add", "operator+"],
  ["op_sub", "operator-"],
  ["op_mul", "operator*"],
  ["op_div", "operator/"]
]);

export function qualifySearchRecordTitles(records, job) {
  const explicitlyQualified = records.map((record) => ({
    ...record,
    title: explicitTitle(record, job)
  }));
  if (PROPOSAL_SOURCE_IDS.has(job.sourceId)) return explicitlyQualified;

  const groups = new Map();
  for (const record of explicitlyQualified) {
    const key = normalize(record.title);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return explicitlyQualified.map((record) => {
    const group = groups.get(normalize(record.title)) ?? [];
    if (group.length < 2) return record;
    const contextual = contextualTitle(record);
    if (!contextual) return record;
    const alternatives = new Set(
      group.map((candidate) => contextualTitle(candidate) ?? candidate.title)
    );
    return alternatives.size > 1 ? { ...record, title: contextual } : record;
  });
}

function explicitTitle(record, job) {
  if (job.sourceId === "cpprefjp") {
    return cpprefjpTitle(record) ?? record.title;
  }
  if (job.sourceId === "ruby-docs") {
    return rubyTitle(record, job.docsLocale) ?? record.title;
  }
  if (job.adapter === "exdoc-sidebar") {
    return exDocTitle(record) ?? record.title;
  }
  if (job.adapter === "javadoc-types") {
    return javadocTitle(record) ?? record.title;
  }
  return record.title;
}

function cpprefjpTitle(record) {
  const url = new URL(record.url);
  const marker = "/reference/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return undefined;
  const segments = url.pathname
    .slice(markerIndex + marker.length)
    .split("/")
    .filter(Boolean)
    .map(decodePathPart);
  if (segments.length < 2) return undefined;
  segments[segments.length - 1] = segments.at(-1).replace(/\.html?$/i, "");

  const category = segments[0];
  let leaf = segments.at(-1);
  let namespace = CPP_NAMESPACES.has(category) ? category : undefined;
  if (leaf.startsWith("ranges_")) {
    namespace = "ranges";
    leaf = leaf.slice("ranges_".length);
  }

  const owner = segments.length >= 3 ? segments.at(-2) : undefined;
  if (owner && leaf === "op_constructor") leaf = owner;
  else if (owner && leaf === "op_destructor") leaf = `~${owner}`;
  else leaf = CPP_OPERATOR_NAMES.get(leaf) ?? leaf;

  const parts = ["std"];
  if (namespace) parts.push(namespace);
  if (owner && owner !== namespace && owner !== leaf) parts.push(owner);
  parts.push(leaf);
  return parts.filter(Boolean).join("::");
}

function rubyTitle(record, docsLocale) {
  const url = new URL(record.url);
  if (docsLocale === "ja") {
    const match = url.pathname.match(/\/method\/([^/]+)\/([is])\/([^/]+)\.html$/i);
    if (!match) return undefined;
    const owner = decodeRubyComponent(match[1]);
    const method = decodeRubyComponent(match[3]);
    return `${owner}${match[2].toLowerCase() === "i" ? "#" : "."}${method}`;
  }

  const versionRoot = url.pathname.match(/^\/en\/[^/]+\//)?.[0] ?? "/";
  const relative = url.pathname
    .slice(versionRoot.length)
    .replace(/\.html$/i, "")
    .split("/")
    .filter(Boolean)
    .map(decodePathPart);
  const owner = relative.join("::");
  if (!owner || !/^(?:::|#)/.test(record.title)) return undefined;
  return `${owner}${record.title}`;
}

function exDocTitle(record) {
  const section = String(record.section ?? "").trim();
  const title = String(record.title ?? "").trim();
  if (
    !section ||
    section === title ||
    normalize(title).startsWith(`${normalize(section)}.`) ||
    !/^(?:[a-z_][\w!?]*|t)\([^)]*\)$/i.test(title)
  ) {
    return undefined;
  }
  return `${section}.${title}`;
}

function javadocTitle(record) {
  const url = new URL(record.url);
  const section = String(record.section ?? "").trim();
  const title = String(record.title ?? "").trim();
  if (
    !section ||
    !title ||
    url.pathname.endsWith("/package-summary.html") ||
    normalize(title).startsWith(`${normalize(section)}.`)
  ) {
    return undefined;
  }
  return `${section}.${title}`;
}

function contextualTitle(record) {
  const title = String(record.title ?? "").trim();
  const section = String(record.section ?? "").trim();
  if (title && section) {
    if (
      normalize(title) !== normalize(section) &&
      !normalize(title).includes(normalize(section)) &&
      !/^https?:\/\//i.test(section)
    ) {
      return `${title} — ${section}`;
    }
  }
  const context = urlContext(record.url);
  return title && context ? `${title} — ${context}` : undefined;
}

function urlContext(value) {
  const url = new URL(value);
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map(decodePathPart);
  if (segments.length < 2) return undefined;
  const parent = segments.at(-2);
  if (!parent || /^\d+(?:\.\d+)*$/.test(parent)) return undefined;
  return parent.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function decodeRubyComponent(value) {
  return decodePathPart(
    value.replace(/=([0-9a-f]{2})/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
  );
}

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}
