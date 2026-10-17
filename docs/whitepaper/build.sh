#!/bin/sh
set -eu
cd /work/docs/whitepaper
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build whitepaper.tex > build/pass1.txt
BIBINPUTS=.: BSTINPUTS=.: bibtex build/whitepaper > build/bibtex.txt
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build whitepaper.tex > build/pass2.txt
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build whitepaper.tex > build/pass3.txt
cp build/whitepaper.pdf whitepaper.pdf
pdfinfo whitepaper.pdf > build/pdfinfo.txt
pdftotext -layout whitepaper.pdf build/whitepaper.txt
pdftoppm -scale-to 1400 -png whitepaper.pdf build/page > build/render.log 2>&1
grep -E '(^!|Warning|Overfull|Output written)' build/whitepaper.log > build/diagnostics.txt || true
cat build/diagnostics.txt
cat build/pdfinfo.txt
