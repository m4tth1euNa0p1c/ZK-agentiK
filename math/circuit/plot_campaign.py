"""Standard scientific figures from actual rows; no inferred or synthetic timings."""
import json
import pathlib
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = pathlib.Path(sys.argv[1])
report = json.loads((root / "correlation.json").read_text(encoding="utf-8"))
verifier = json.loads((root / "verifier-results.json").read_text(encoding="utf-8"))
assert report["status"] == "pass"
out = root / "figures"
out.mkdir(exist_ok=False)
plt.rcParams.update({"font.size": 10, "figure.dpi": 140, "savefig.facecolor": "white"})
n = 2**32
fig, axes = plt.subplots(1, 2, figsize=(12, 5), layout="constrained")
visible = [r for r in report["cases"] if int(r["amount"]) <= 2*n and int(r["cap"]) <= 4*n]
for expected, color, label in [(True, "#087f5b", "In domain"), (False, "#b42338", "Out of domain")]:
    rows = [r for r in visible if r["expected_accept"] == expected]
    axes[0].scatter([int(r["amount"])/n for r in rows], [(int(r["cap"])-int(r["amount"]))/n for r in rows],
                    s=9, alpha=.45, c=color, label=label, rasterized=True)
axes[0].plot([0, 1, 1, 0, 0], [0, 0, 1, 1, 0], color="#18304a", linewidth=1)
axes[0].set(xlabel="a / 2^32", ylabel="(c - a) / 2^32", title="Integer domain: 0 < a <= 2^32, 0 <= c-a < 2^32")
axes[0].legend(loc="upper right")
axes[0].text(.02, .02, f"{len(visible)} shown; {report['case_count']-len(visible)} extreme u64 cases outside view",
             transform=axes[0].transAxes, fontsize=8, bbox={"facecolor": "white", "alpha": .85, "edgecolor": "none"})
names = list(dict.fromkeys(r["category"] for r in report["cases"]))
yes = [sum(r["category"] == name and r["expected_accept"] for r in report["cases"]) for name in names]
no = [sum(r["category"] == name and not r["expected_accept"] for r in report["cases"]) for name in names]
axes[1].barh(names, yes, label="Expected accept", color="#087f5b")
axes[1].barh(names, no, left=yes, label="Expected reject", color="#b42338")
axes[1].set(xlabel="Case count", title="Exact agreement: BigInt / Octave / native Rust")
axes[1].legend(loc="lower right")
fig.suptitle(f"Horizon correlated circuit campaign — {report['case_count']} synthetic cases")
for ext in ["png", "svg"]:
    fig.savefig(out / f"coverage.{ext}")
plt.close(fig)

fig, ax = plt.subplots(figsize=(10, 5), layout="constrained")
groups = [("a_valid", "Valid A", "#0659a9"), ("b_valid", "Valid B", "#087f5b"),
          ("b_scalar_corruption", "Algebraic corruption B", "#b42338"),
          ("b_direct_bypass", "Out-of-domain candidate B", "#8752aa")]
for test, label, color in groups:
    values = sorted(r["duration_ns"]/1e6 for r in verifier["cases"] if r["test"] == test)
    if values:
        ax.step(values, [(i+1)/len(values) for i in range(len(values))], where="post", label=f"{label} (n={len(values)})", color=color)
ax.set(xlabel="Observed verification time (ms, log scale)", ylabel="Empirical cumulative fraction",
       title="Correctness campaign timings — no warm-up, no service SLA")
ax.set_xscale("log")
ax.grid(alpha=.2)
ax.legend(loc="lower right")
# Keep the caveat in the title and HTML; a figure-level footer overlaps the
# constrained-layout x label in Matplotlib 3.6.3.
for ext in ["png", "svg"]:
    fig.savefig(out / f"verification.{ext}")
plt.close(fig)
(out / "plot-metadata.json").write_text(json.dumps({"matplotlib": matplotlib.__version__, "backend": matplotlib.get_backend(),
    "input": ["correlation.json", "verifier-results.json"], "performance_claim": False}, indent=2) + "\n", encoding="utf-8")
