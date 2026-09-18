import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("report_renderer", Path(__file__).with_name("render-visual-report.py"))
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class ReportPresentationTests(unittest.TestCase):
    def test_complete_honest_source_register(self):
        urls = [f"https://example.com/evidence/{index}" for index in range(14)]
        output = renderer.extract_and_render_sources_register("\n".join(urls + [urls[0] + "."]), 100)
        self.assertIn("14 Sources", output)
        self.assertIn("SRC-014", output)
        self.assertNotIn("Verified", output)
        self.assertIn(f'href="{urls[-1]}"', output)

    def test_escaped_pipes_preserve_table_columns(self):
        blocks = renderer.parse_markdown_blocks("| Topic | Evidence |\n|---|---|\n| Sales \\| Marketing | Supplied page |")
        self.assertEqual(blocks[0]["rows"][1], ["Sales | Marketing", "Supplied page"])

    def test_inline_evidence_is_clickable(self):
        self.assertIn('<a class="smark-cite-link" href="https://example.com/proof">Proof</a>', renderer.clean_inline("[Proof](https://example.com/proof)"))

    def test_no_static_measurements_are_injected(self):
        output = renderer.build_report_html({"title": "Evidence review", "companyName": "Example", "documentType": "SEO_AUDIT", "updatedAt": "2026-09-08", "markdown": "# Evidence review\n\n## Findings\n\nNo measured rankings are available."})
        self.assertNotIn("1,480", output)
        self.assertNotIn("Top 3 (22%)", output)


if __name__ == "__main__":
    unittest.main()
