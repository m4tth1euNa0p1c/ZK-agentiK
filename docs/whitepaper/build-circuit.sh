#!/bin/sh
set -eu
cd /work/docs/whitepaper
mkdir -p build/circuit
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build/circuit circuit-validation.tex > build/circuit/pass1.txt
BIBINPUTS=.: BSTINPUTS=.: bibtex build/circuit/circuit-validation > build/circuit/bibtex.txt
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build/circuit circuit-validation.tex > build/circuit/pass2.txt
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build/circuit circuit-validation.tex > build/circuit/pass3.txt
cp build/circuit/circuit-validation.pdf circuit-validation.pdf
pdfinfo circuit-validation.pdf > build/circuit/pdfinfo.txt
pdftotext -layout circuit-validation.pdf build/circuit/circuit-validation.txt
pdftoppm -scale-to 1400 -png circuit-validation.pdf build/circuit/page > build/circuit/render.log 2>&1
grep -E '(^!|Warning|Overfull|Output written)' build/circuit/circuit-validation.log > build/circuit/diagnostics.txt || true
cat build/circuit/diagnostics.txt
cat build/circuit/pdfinfo.txt
