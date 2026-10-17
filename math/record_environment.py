"""Record tools and SHA-256 links. This is self-reported provenance, not a TSA."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "math" / "results"


def command(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True, encoding="utf-8").strip()


index = json.loads((RESULTS / "latest.json").read_text(encoding="utf-8"))
name = index["result"]
assert Path(name).name == name and name.endswith(".json")
result = json.loads((RESULTS / name).read_text(encoding="utf-8"))
assert result["status"] == "pass"
assert result["runtime"] == "GNU Octave" and not result["executed_in_matlab"]
assert result["reduced_domain"]["pairs"] == 24510
assert result["replay_model"]["reachable_states"] == 20
assert result["replay_model"]["transitions"] == 160
paths = ["math/Dockerfile", "math/horizon_checks.m", "math/run_checks.m",
         "math/record_environment.py", "math/results/" + name,
         "docs/whitepaper/whitepaper.tex", "docs/whitepaper/references.bib",
         "docs/whitepaper/build.sh", "docs/whitepaper/whitepaper.pdf",
         "labs/horizon/proof/src/lib.rs", "labs/horizon/Cargo.lock",
         "packages/horizon-demo/src/store.ts"]
metadata = {
    "schema": "horizon-math-environment-v1",
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "date_is_self_reported": True,
    "third_party_timestamp_or_signature": False,
    "source_commit": command("git", "rev-parse", "HEAD"),
    "source_tree_may_be_dirty": True,
    "image_id": command("docker", "image", "inspect", "horizon-math-paper:local", "--format", "{{.Id}}"),
    "base_digest": "debian@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587",
    "container_packages": command("docker", "run", "--rm", "--network", "none", "horizon-math-paper:local",
        "dpkg-query", "-W", "octave", "texlive-latex-base", "texlive-latex-recommended", "texlive-fonts-recommended",
        "texlive-binaries", "poppler-utils", "lmodern", "python3"),
    "result": "math/results/" + name,
    "external_numeric_inputs": "None; domains, boundary vectors and state model are in hashed horizon_checks.m.",
    "sha256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths},
    "limitations": ["No signature/TSA, semantic validity or security proof implied by hashes.",
                    "Base digest pinned; apt repository is not snapshotted; rebuild may change installed versions.",
                    "Octave execution only; MATLAB syntax compatibility is intended, not executed."],
}
target = RESULTS / (Path(name).stem + ".environment.json")
with target.open("x", encoding="utf-8") as stream:
    json.dump(metadata, stream, indent=2, ensure_ascii=False)
    stream.write("\n")
print(target.relative_to(ROOT).as_posix())
