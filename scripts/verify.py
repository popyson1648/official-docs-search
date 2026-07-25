#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
import tomllib


DEFAULT_ORDER = [
    "format",
    "lint",
    "typecheck",
    "build",
    "test_unit",
    "test_integration",
    "test_e2e",
    "test_e2e_filters",
    "test_e2e_catalog",
    "test_e2e_layout",
    "test_e2e_performance",
    "test_live",
    "test_component",
    "test_contract",
    "test_verification",
    "accessibility",
    "performance",
    "bundle_size",
    "security",
]

MODE_FLAG_MAP = {
    "all": None,
    "edit": "run_on_edit",
    "pre-commit": "run_pre_commit",
    "pre-push": "run_pre_push",
    "ci": "run_in_ci",
}


def load_config(config_path: Path) -> dict:
    if not config_path.exists():
        print(f"verification config not found: {config_path}", file=sys.stderr)
        raise SystemExit(2)

    with config_path.open("rb") as f:
        data = tomllib.load(f)

    if not isinstance(data, dict):
        print("verification config must be a TOML table", file=sys.stderr)
        raise SystemExit(2)

    return data


def normalize_phase(name: str, entry: dict) -> dict:
    if not isinstance(entry, dict):
        print(f"phase '{name}' must be a TOML table", file=sys.stderr)
        raise SystemExit(2)

    return {
        "name": name,
        "enabled": bool(entry.get("enabled", False)),
        "command": str(entry.get("command", "")).strip(),
        "reason": str(entry.get("reason", "")).strip(),
        "run_on_edit": _optional_bool(entry.get("run_on_edit")),
        "run_pre_commit": _optional_bool(entry.get("run_pre_commit")),
        "run_pre_push": _optional_bool(entry.get("run_pre_push")),
        "run_in_ci": _optional_bool(entry.get("run_in_ci")),
        "paths": _string_list(entry.get("paths"), f"phase '{name}' paths"),
        "exclude_paths": _string_list(
            entry.get("exclude_paths"),
            f"phase '{name}' exclude_paths",
        ),
        "requires": _string_list(entry.get("requires"), f"phase '{name}' requires"),
        "covered_by": _string_list(
            entry.get("covered_by"),
            f"phase '{name}' covered_by",
        ),
        "network": bool(entry.get("network", False)),
    }


def _optional_bool(value: object) -> bool | None:
    if value is None:
        return None
    return bool(value)


def _string_list(value: object, label: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or not all(
        isinstance(item, str) and item.strip() for item in value
    ):
        print(f"{label} must be an array of non-empty strings", file=sys.stderr)
        raise SystemExit(2)
    return [item.strip() for item in value]


def collect_phases(config: dict) -> list[dict]:
    raw_phases = config.get("phases")
    if raw_phases is None:
        return []

    if not isinstance(raw_phases, dict):
        print("[phases] must be a TOML table", file=sys.stderr)
        raise SystemExit(2)

    phases_by_name = {
        name: normalize_phase(name, entry)
        for name, entry in raw_phases.items()
    }

    ordered: list[dict] = []

    for name in DEFAULT_ORDER:
        phase = phases_by_name.pop(name, None)
        if phase is not None:
            ordered.append(phase)

    for name in sorted(phases_by_name.keys()):
        ordered.append(phases_by_name[name])

    return ordered


def is_selected_for_mode(phase: dict, mode: str) -> bool:
    if not phase["enabled"]:
        return False

    flag_name = MODE_FLAG_MAP[mode]
    if flag_name is None:
        return True

    flag_value = phase.get(flag_name)
    if flag_value is None:
        return False

    return bool(flag_value)


def glob_matches(path: str, pattern: str) -> bool:
    normalized_path = path.replace("\\", "/").removeprefix("./")
    normalized_pattern = pattern.replace("\\", "/").removeprefix("./")
    pieces: list[str] = []
    index = 0

    while index < len(normalized_pattern):
        char = normalized_pattern[index]
        if char == "*":
            if index + 1 < len(normalized_pattern) and normalized_pattern[index + 1] == "*":
                index += 2
                if index < len(normalized_pattern) and normalized_pattern[index] == "/":
                    pieces.append("(?:.*/)?")
                    index += 1
                else:
                    pieces.append(".*")
                continue
            pieces.append("[^/]*")
        elif char == "?":
            pieces.append("[^/]")
        else:
            pieces.append(re.escape(char))
        index += 1

    return re.fullmatch("".join(pieces), normalized_path) is not None


def matches_any(path: str, patterns: list[str]) -> bool:
    return any(glob_matches(path, pattern) for pattern in patterns)


def phase_matches_path(phase: dict, path: str) -> bool:
    return (
        matches_any(path, phase["paths"])
        and not matches_any(path, phase["exclude_paths"])
    )


def load_change_detection(config: dict) -> dict:
    raw = config.get("change_detection", {})
    if not isinstance(raw, dict):
        print("[change_detection] must be a TOML table", file=sys.stderr)
        raise SystemExit(2)
    return {
        "documentation_paths": _string_list(
            raw.get("documentation_paths"),
            "change_detection.documentation_paths",
        ),
        "full_paths": _string_list(
            raw.get("full_paths"),
            "change_detection.full_paths",
        ),
        "safe_added_paths": _string_list(
            raw.get("safe_added_paths"),
            "change_detection.safe_added_paths",
        ),
        "fallback_base_refs": _string_list(
            raw.get("fallback_base_refs"),
            "change_detection.fallback_base_refs",
        ),
    }


def git_lines(arguments: list[str]) -> tuple[list[str], str | None]:
    completed = subprocess.run(
        ["git", *arguments],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip()
        return [], message or f"git {' '.join(arguments)} failed"
    return [line.strip() for line in completed.stdout.splitlines() if line.strip()], None


def discover_local_changes(
    fallback_base_refs: list[str] | None = None,
) -> tuple[list[str], list[str], str | None]:
    tracked, error = git_lines(
        ["diff", "--name-only", "--no-renames", "--diff-filter=ACDMRTUXB", "HEAD"]
    )
    if error:
        return [], [], error
    added_tracked, error = git_lines(
        ["diff", "--name-only", "--no-renames", "--diff-filter=A", "HEAD"]
    )
    if error:
        return [], [], error
    untracked, error = git_lines(["ls-files", "--others", "--exclude-standard"])
    if error:
        return [], [], error
    committed = []
    added_committed = []
    comparison_base = discover_local_comparison_base(fallback_base_refs or [])
    if comparison_base:
        committed, error = git_lines(
            [
                "diff",
                "--name-only",
                "--no-renames",
                "--diff-filter=ACDMRTUXB",
                f"{comparison_base}...HEAD",
            ]
        )
        if error:
            return [], [], error
        added_committed, error = git_lines(
            [
                "diff",
                "--name-only",
                "--no-renames",
                "--diff-filter=A",
                f"{comparison_base}...HEAD",
            ]
        )
        if error:
            return [], [], error
    elif not tracked and not untracked:
        return (
            [],
            [],
            "no upstream or fallback comparison base is available",
        )
    return (
        sorted(set(committed + tracked + untracked)),
        sorted(set(added_committed + added_tracked + untracked)),
        None,
    )


def discover_local_comparison_base(fallback_base_refs: list[str]) -> str | None:
    upstream, error = git_lines(
        [
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            "@{upstream}",
        ]
    )
    if not error and len(upstream) == 1:
        return upstream[0]
    for reference in fallback_base_refs:
        resolved, resolve_error = git_lines(
            ["rev-parse", "--verify", "--quiet", reference]
        )
        if not resolve_error and len(resolved) == 1:
            return reference
    return None


def discover_range_changes(
    change_range: str,
) -> tuple[list[str], list[str], str | None]:
    if not change_range.strip() or re.fullmatch(r"0{40}(?:\.\.[.]?.*)?", change_range):
        return [], [], "comparison range is empty or starts with the zero SHA"
    changed, error = git_lines(
        [
            "diff",
            "--name-only",
            "--no-renames",
            "--diff-filter=ACDMRTUXB",
            change_range,
        ]
    )
    if error:
        return [], [], error
    added, error = git_lines(
        [
            "diff",
            "--name-only",
            "--no-renames",
            "--diff-filter=A",
            change_range,
        ]
    )
    return changed, added, error


def discover_staged_additions() -> tuple[list[str], str | None]:
    return git_lines(
        ["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=A"]
    )


def select_changed_phases(
    eligible_phases: list[dict],
    changed_files: list[str],
    change_detection: dict,
    discovery_error: str | None = None,
    added_files: list[str] | None = None,
) -> tuple[list[dict], dict]:
    normalized_files = sorted(
        {
            path.replace("\\", "/").removeprefix("./")
            for path in changed_files
            if path.strip()
        }
    )
    explanation = {
        "changed_files": normalized_files,
        "added_files": sorted(
            {
                path.replace("\\", "/").removeprefix("./")
                for path in (added_files or [])
                if path.strip()
            }
        ),
        "fallback": None,
        "unknown_files": [],
        "documentation_only": False,
    }

    def fallback_phases() -> list[dict]:
        return [
            phase
            for phase in eligible_phases
            if not phase["network"]
            or any(
                matches_any(path, phase["paths"])
                and not matches_any(path, phase["exclude_paths"])
                for path in normalized_files
            )
        ]

    if discovery_error:
        explanation["fallback"] = discovery_error
        return fallback_phases(), explanation
    if not normalized_files:
        return [], explanation

    documentation_patterns = change_detection["documentation_paths"]
    full_patterns = change_detection["full_paths"]
    non_documentation_files = [
        path for path in normalized_files if not matches_any(path, documentation_patterns)
    ]

    if not non_documentation_files:
        explanation["documentation_only"] = True
        return [], explanation

    unsafe_added_files = [
        path
        for path in explanation["added_files"]
        if not matches_any(path, documentation_patterns)
        and not matches_any(path, change_detection["safe_added_paths"])
    ]
    if unsafe_added_files:
        explanation["unknown_files"] = unsafe_added_files
        explanation["fallback"] = "new implementation or configuration paths changed"
        return fallback_phases(), explanation

    if any(matches_any(path, full_patterns) for path in non_documentation_files):
        explanation["fallback"] = "verification infrastructure changed"
        return fallback_phases(), explanation

    selected: list[dict] = []
    classified_files = {
        path
        for path in normalized_files
        if matches_any(path, documentation_patterns)
    }
    for phase in eligible_phases:
        phase_matches = [
            path
            for path in non_documentation_files
            if phase_matches_path(phase, path)
        ]
        if phase_matches:
            selected.append(phase)
            classified_files.update(phase_matches)

    unknown_files = [
        path for path in non_documentation_files if path not in classified_files
    ]
    if unknown_files:
        explanation["unknown_files"] = unknown_files
        explanation["fallback"] = "unclassified paths changed"
        return fallback_phases(), explanation

    return selected, explanation


def expand_required_phases(
    selected_phases: list[dict],
    mode_phases: list[dict],
) -> list[dict]:
    phases_by_name = {phase["name"]: phase for phase in mode_phases}
    required_names = {phase["name"] for phase in selected_phases}
    pending = list(required_names)

    while pending:
        phase_name = pending.pop()
        phase = phases_by_name[phase_name]
        for required_name in phase["requires"]:
            if required_name not in phases_by_name:
                print(
                    f"phase '{phase_name}' requires unavailable phase "
                    f"'{required_name}' in this mode",
                    file=sys.stderr,
                )
                raise SystemExit(2)
            if required_name not in required_names:
                required_names.add(required_name)
                pending.append(required_name)

    expanded = [
        phase for phase in mode_phases if phase["name"] in required_names
    ]
    expanded_names = {phase["name"] for phase in expanded}
    return [
        phase
        for phase in expanded
        if not any(parent in expanded_names for parent in phase["covered_by"])
    ]


def run_command(command: str, environment: dict[str, str]) -> int:
    completed = subprocess.run(command, shell=True, env=environment)
    return completed.returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run repository verification phases from .project/verification.toml."
    )
    parser.add_argument(
        "--config",
        default=".project/verification.toml",
        help="Path to verification.toml",
    )
    parser.add_argument(
        "--mode",
        choices=["all", "edit", "pre-commit", "pre-push", "ci"],
        default="pre-push",
        help="Execution mode",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        default=[],
        help="Run only the specified phases",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List selected phases and exit",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run every phase allowed by the selected mode",
    )
    parser.add_argument(
        "--include-network",
        action="store_true",
        help="Include network phases during explicit full verification",
    )
    parser.add_argument(
        "--changed-files",
        nargs="*",
        default=None,
        help="Classify these changed repository-relative files",
    )
    parser.add_argument(
        "--changed-range",
        default="",
        help="Classify files in this git diff range, for example BASE...HEAD",
    )
    parser.add_argument(
        "--added-files",
        nargs="*",
        default=None,
        help="Mark changed files that are newly added",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the selection as JSON (requires --list)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.config)

    config = load_config(config_path)
    phases = collect_phases(config)
    change_detection = load_change_detection(config)

    mode_phases = [
        phase for phase in phases if is_selected_for_mode(phase, args.mode)
    ]
    only_set = set(args.only)
    eligible_phases = [
        phase
        for phase in mode_phases
        if not only_set or phase["name"] in only_set
    ]

    explanation = {
        "changed_files": [],
        "added_files": [],
        "fallback": None,
        "unknown_files": [],
        "documentation_only": False,
    }
    if args.full:
        selected_phases = [
            phase
            for phase in eligible_phases
            if args.include_network or not phase["network"]
        ]
        explanation["fallback"] = "explicit full verification"
    else:
        if args.changed_files is not None:
            changed_files = args.changed_files
            if args.added_files is not None:
                added_files = args.added_files
                discovery_error = None
            else:
                staged_additions, discovery_error = discover_staged_additions()
                changed_set = set(changed_files)
                added_files = [
                    path for path in staged_additions if path in changed_set
                ]
        elif args.changed_range:
            changed_files, added_files, discovery_error = discover_range_changes(
                args.changed_range
            )
        else:
            changed_files, added_files, discovery_error = discover_local_changes(
                change_detection["fallback_base_refs"]
            )
        selected_phases, explanation = select_changed_phases(
            eligible_phases,
            changed_files,
            change_detection,
            discovery_error,
            added_files,
        )
    selected_phases = expand_required_phases(selected_phases, mode_phases)

    if args.list:
        if args.json:
            print(
                json.dumps(
                    {
                        "phases": [phase["name"] for phase in selected_phases],
                        **explanation,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )
        else:
            for phase in selected_phases:
                print(phase["name"])
        return 0

    if not selected_phases:
        if explanation["documentation_only"]:
            print("no verification phases selected: documentation-only change")
        else:
            print("no verification phases selected: no relevant changes")
        return 0

    print(f"mode: {args.mode}")
    print(f"config: {config_path}")
    if explanation["fallback"]:
        print(f"selection: all eligible phases ({explanation['fallback']})")
    else:
        print(
            "selection: "
            + ", ".join(phase["name"] for phase in selected_phases)
        )
    if explanation["unknown_files"]:
        print("unclassified paths:")
        for path in explanation["unknown_files"]:
            print(f"  - {path}")

    command_environment = os.environ.copy()
    command_environment["VERIFY_CHANGED_FILES_JSON"] = json.dumps(
        explanation["changed_files"],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    command_environment["VERIFY_FULL"] = (
        "1" if args.full and args.include_network else "0"
    )

    for phase in selected_phases:
        print("")
        print(f"[verify] phase: {phase['name']}")

        command = phase["command"]
        if not command:
            reason = phase["reason"]
            if reason:
                print(f"[verify] skipped: {reason}")
                continue
            print(f"[verify] failed: phase '{phase['name']}' has no command", file=sys.stderr)
            return 2

        print(f"[verify] command: {command}")
        code = run_command(command, command_environment)

        if code != 0:
            print(
                f"[verify] failed: {phase['name']} ( exit code {code} )",
                file=sys.stderr,
            )
            return code

        print(f"[verify] passed: {phase['name']}")

    print("")
    print("[verify] all selected phases passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
