from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "repository_verify",
    ROOT / "scripts" / "verify.py",
)
assert SPEC and SPEC.loader
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


def phase(name: str, *paths: str) -> dict:
    return {
        "name": name,
        "paths": list(paths),
        "exclude_paths": [],
        "requires": [],
        "covered_by": [],
        "network": False,
    }


class GlobMatchingTests(unittest.TestCase):
    def test_double_star_matches_zero_or_more_directories(self) -> None:
        self.assertTrue(VERIFY.glob_matches(".project/testing.md", ".project/**/*.md"))
        self.assertTrue(VERIFY.glob_matches(".project/guides/testing.md", ".project/**/*.md"))

    def test_single_star_does_not_cross_a_directory(self) -> None:
        self.assertTrue(VERIFY.glob_matches("README.md", "*.md"))
        self.assertFalse(VERIFY.glob_matches("docs/README.md", "*.md"))


class ChangeSelectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.phases = [
            phase("typecheck", "src/**", "tests/**/*.ts", "package*.json"),
            phase("build", "src/**", "public/**", "package*.json"),
            phase("unit", "src/core/**", "scripts/search-index/**", "tests/*.test.ts", "package*.json"),
            phase("integration", "public/search-index/**", "src/data/docs-sources.toml", "package*.json"),
            phase("e2e", "src/client/**", "src/pages/**", "public/**", "package*.json"),
            phase("contract", "scripts/serve-production.mjs", "public/search-index/**", "package*.json"),
            phase("live", "scripts/search-index/**", "src/data/docs-sources.toml"),
            phase("security", "package*.json"),
        ]
        self.change_detection = {
            "documentation_paths": [
                "*.md",
                ".plans/**",
                ".decisions/**",
                ".project/**/*.md",
            ],
            "full_paths": [
                "scripts/verify.py",
                ".project/verification.toml",
            ],
            "safe_added_paths": [
                "*.md",
                "public/search-index/**",
            ],
            "fallback_base_refs": ["origin/dev", "origin/main"],
        }

    def select(
        self,
        changed_files: list[str],
        error: str | None = None,
    ) -> tuple[list[str], dict]:
        selected, explanation = VERIFY.select_changed_phases(
            self.phases,
            changed_files,
            self.change_detection,
            error,
        )
        return [item["name"] for item in selected], explanation

    def test_documentation_only_selects_no_phase(self) -> None:
        selected, explanation = self.select(
            ["README.md", ".project/testing.md", ".plans/task.md"]
        )
        self.assertEqual(selected, [])
        self.assertTrue(explanation["documentation_only"])

    def test_ui_change_selects_only_matching_phases(self) -> None:
        selected, explanation = self.select(["src/client/search-page.ts"])
        self.assertEqual(selected, ["typecheck", "build", "e2e"])
        self.assertIsNone(explanation["fallback"])

    def test_parser_change_does_not_select_browser_or_build(self) -> None:
        selected, _ = self.select(
            ["scripts/search-index/jobs/remaining-group-d.mjs"]
        )
        self.assertEqual(selected, ["unit", "live"])

    def test_generated_index_change_uses_offline_consumers(self) -> None:
        selected, _ = self.select(
            ["public/search-index/gfortran.en.123456789abc.json"]
        )
        self.assertEqual(selected, ["build", "integration", "e2e", "contract"])
        self.assertNotIn("live", selected)

    def test_dependency_change_selects_every_declared_consumer(self) -> None:
        selected, _ = self.select(["package-lock.json"])
        self.assertEqual(
            selected,
            [
                "typecheck",
                "build",
                "unit",
                "integration",
                "e2e",
                "contract",
                "security",
            ],
        )

    def test_verification_infrastructure_selects_all_eligible_phases(self) -> None:
        selected, explanation = self.select(["scripts/verify.py"])
        self.assertEqual(selected, [item["name"] for item in self.phases])
        self.assertEqual(
            explanation["fallback"],
            "verification infrastructure changed",
        )

    def test_unknown_path_fails_safe_to_all_phases(self) -> None:
        selected, explanation = self.select(["tools/new-runner.rb"])
        self.assertEqual(selected, [item["name"] for item in self.phases])
        self.assertEqual(explanation["unknown_files"], ["tools/new-runner.rb"])

    def test_unknown_unrelated_path_does_not_trigger_network_phase(self) -> None:
        live = next(item for item in self.phases if item["name"] == "live")
        live["network"] = True

        selected, _ = self.select(["tools/new-runner.rb"])

        self.assertNotIn("live", selected)

    def test_new_implementation_path_fails_safe_to_all_offline_phases(self) -> None:
        live = next(item for item in self.phases if item["name"] == "live")
        live["network"] = True

        selected, explanation = self.select(
            ["src/config/new-runtime.ts"],
        )
        selected_with_addition, added_explanation = VERIFY.select_changed_phases(
            self.phases,
            ["src/config/new-runtime.ts"],
            self.change_detection,
            added_files=["src/config/new-runtime.ts"],
        )

        self.assertEqual(selected, ["typecheck", "build"])
        self.assertEqual(
            [item["name"] for item in selected_with_addition],
            [item["name"] for item in self.phases if item["name"] != "live"],
        )
        self.assertEqual(
            added_explanation["fallback"],
            "new implementation or configuration paths changed",
        )
        self.assertEqual(explanation["fallback"], None)

    def test_new_generated_bundle_uses_normal_phase_mapping(self) -> None:
        selected, explanation = VERIFY.select_changed_phases(
            self.phases,
            ["public/search-index/new.json"],
            self.change_detection,
            added_files=["public/search-index/new.json"],
        )

        self.assertEqual(
            [item["name"] for item in selected],
            ["build", "integration", "e2e", "contract"],
        )
        self.assertIsNone(explanation["fallback"])

    def test_invalid_git_range_fails_safe_to_all_phases(self) -> None:
        selected, explanation = self.select([], "bad revision")
        self.assertEqual(selected, [item["name"] for item in self.phases])
        self.assertEqual(explanation["fallback"], "bad revision")

    def test_mixed_docs_and_code_classifies_the_code(self) -> None:
        selected, explanation = self.select(
            ["README.md", "src/core/search.ts"]
        )
        self.assertEqual(selected, ["typecheck", "build", "unit"])
        self.assertFalse(explanation["documentation_only"])

    def test_requirements_are_added_and_covered_variants_are_removed(self) -> None:
        build = phase("build", "src/**")
        full = phase("e2e", "src/app.ts")
        full["requires"] = ["build"]
        subset = phase("e2e_layout", "public/styles.css")
        subset["requires"] = ["build"]
        subset["covered_by"] = ["e2e"]

        expanded = VERIFY.expand_required_phases(
            [full, subset],
            [build, full, subset],
        )

        self.assertEqual([item["name"] for item in expanded], ["build", "e2e"])


class GitDiscoveryTests(unittest.TestCase):
    @patch.object(
        VERIFY,
        "discover_local_comparison_base",
        return_value="origin/dev",
    )
    @patch.object(
        VERIFY,
        "git_lines",
        side_effect=[
            (["src/core/search.ts"], None),
            ([], None),
            (["tests/new.test.ts"], None),
            (["src/client/new.ts"], None),
            (["src/client/new.ts"], None),
        ],
    )
    def test_local_discovery_combines_unpushed_worktree_and_untracked_changes(
        self,
        _git_lines,
        _comparison_base,
    ) -> None:
        changed, added, error = VERIFY.discover_local_changes(["origin/dev"])

        self.assertEqual(
            changed,
            [
                "src/client/new.ts",
                "src/core/search.ts",
                "tests/new.test.ts",
            ],
        )
        self.assertEqual(
            added,
            ["src/client/new.ts", "tests/new.test.ts"],
        )
        self.assertIsNone(error)

    @patch.object(
        VERIFY,
        "git_lines",
        side_effect=[
            (["src/core/search.ts", "tests/new.test.ts"], None),
            (["tests/new.test.ts"], None),
        ],
    )
    def test_range_discovery_uses_the_same_range_for_added_files(
        self,
        git_lines_mock,
    ) -> None:
        changed, added, error = VERIFY.discover_range_changes("base...HEAD")

        self.assertEqual(changed, ["src/core/search.ts", "tests/new.test.ts"])
        self.assertEqual(added, ["tests/new.test.ts"])
        self.assertIsNone(error)
        self.assertEqual(
            git_lines_mock.call_args_list[0].args[0][-1],
            "base...HEAD",
        )
        self.assertEqual(
            git_lines_mock.call_args_list[1].args[0][-1],
            "base...HEAD",
        )

    def test_zero_sha_range_fails_safe_without_invoking_git(self) -> None:
        changed, added, error = VERIFY.discover_range_changes(
            f"{'0' * 40}..HEAD"
        )

        self.assertEqual(changed, [])
        self.assertEqual(added, [])
        self.assertIn("zero SHA", error)

    @patch.object(
        VERIFY,
        "git_lines",
        side_effect=[
            ([], "no upstream"),
            (["abc123"], None),
        ],
    )
    def test_local_base_falls_back_to_configured_remote_ref(
        self,
        _git_lines,
    ) -> None:
        self.assertEqual(
            VERIFY.discover_local_comparison_base(
                ["origin/dev", "origin/main"]
            ),
            "origin/dev",
        )

    @patch.object(
        VERIFY,
        "discover_local_comparison_base",
        return_value=None,
    )
    @patch.object(
        VERIFY,
        "git_lines",
        side_effect=[
            ([], None),
            ([], None),
            ([], None),
        ],
    )
    def test_clean_tree_without_a_base_fails_safe(
        self,
        _git_lines,
        _comparison_base,
    ) -> None:
        changed, added, error = VERIFY.discover_local_changes([])

        self.assertEqual(changed, [])
        self.assertEqual(added, [])
        self.assertIn("no upstream", error)


if __name__ == "__main__":
    unittest.main()
