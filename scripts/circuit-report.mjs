import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function writeReport(directory, report) {
  const data = JSON.stringify(report).replaceAll('<', '\\u003c');
  const script = `const report = ${data};
const select = document.querySelector('#category');
for (const category of [...new Set(report.cases.map(row => row.category))]) { const option=document.createElement('option');option.value=category;option.textContent=category;select.append(option); }
function render(){ const rows=report.cases.filter(row=>select.value==='all'||row.category===select.value);document.querySelector('#count').textContent=rows.length+' cas ; premières 200 lignes affichées';const body=document.querySelector('tbody');body.replaceChildren();for(const row of rows.slice(0,200)){const tr=document.createElement('tr');for(const value of [row.id,row.amount,row.cap,row.expected_accept?'admis':'refusé',row.octave===row.rust_native?'accord':'DÉSACCORD',row.cryptographic_checks]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}body.append(tr);}}
select.addEventListener('change',render);render();`;
  const csp = createHash('sha256').update(script).digest('base64');
  const families = Object.entries(report.families).map(([name, row]) => `<tr><td>${escape(name)}</td><td>${row.checked}</td><td>${row.accepted}</td><td>${row.rejected}</td><td>${escape(row.expected_error ?? 'acceptation attendue')}</td></tr>`).join('');
  writeFileSync(join(directory, 'report.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'sha256-${csp}'; base-uri 'none'; form-action 'none'">
<title>Horizon — campagne de validation corrélée</title>
<style>body{font:17px/1.6 system-ui,sans-serif;margin:auto;padding:2rem;max-width:1100px;color:#18304a;background:#f6f8fc}h1,h2{line-height:1.2}section{background:white;border:1px solid #b6c5d6;border-radius:12px;padding:1.2rem;margin:1.2rem 0}.metrics{display:flex;flex-wrap:wrap;gap:2rem}.metrics strong{font-size:2rem;display:block}.steps{display:flex;gap:.5rem;flex-wrap:wrap;padding:0;list-style:none}.steps li{padding:.8rem;border:1px solid #8ba7bf;border-radius:5px}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{text-align:left;border-bottom:1px solid #cad6e1;padding:.5rem}img{max-width:100%;height:auto}.table{overflow:auto}a{color:#075aa8}select{font:inherit;padding:.4rem}code{overflow-wrap:anywhere}p.note{border-left:4px solid #a66a08;padding-left:.8rem}</style></head>
<body><h1>Un même circuit, des contrôles corrélés</h1>
<p>Profil <code>horizon-range-v1</code> : preuve de plages Bulletproofs sur <strong>a − 1</strong> et <strong>c − a</strong>, chacune sur 32 bits. Données intégralement synthétiques.</p>
<section class="metrics"><div><strong>${report.case_count}</strong>cas arithmétiques</div><div><strong>${report.valid_proofs_generated}</strong>preuves valides A/B générées</div><div><strong>${report.invalid_upstream_candidates}</strong>candidats hors domaine</div><div><strong>${report.cryptographic_checks}</strong>vérifications, dont mutations</div></section>
<section><h2>Chaîne de vérification</h2><ol class="steps"><li>Vecteurs décimaux u64</li><li>Oracle BigInt</li><li>Octave / MATLAB séparé</li><li>Prover Rust + attaques</li><li>Processus vérifieur</li><li>Jointure stricte par identifiant</li></ol>
<p>${report.observed_mismatches} désaccord observé ; ${report.observed_false_acceptances} acceptation indue observée. Ce constat concerne exclusivement les lignes de cette campagne.</p>
<p>Ce rapport local comporte Octave. Statut MATLAB de ce bundle : <strong>${report.matlab_executed ? 'exécuté et corrélé' : 'non exécuté ici'}</strong>. Le job MATLAB publie son résultat et une nouvelle corrélation séparément ; une réussite Octave ne vaut pas exécution MATLAB.</p>
<p class="note">La chaîne agentique MCP est testée séparément : proposition → challenge imposé → preuve → vérification → réservation → effet synthétique. Cette campagne arithmétique ne déclenche aucune mutation métier.</p></section>
<section><h2>Domaine entier et contrôles</h2><img src="figures/coverage.png" alt="Domaine des valeurs synthétiques et couverture par famille, calculés à partir des résultats JSON"><p>Les cas u64 extrêmes sont comptés séparément de la fenêtre dessinée. Aucun graphique n'est une preuve de sécurité.</p></section>
<section><h2>Durées observées</h2><img src="figures/verification.png" alt="Distribution empirique des durées de vérification des preuves et mutations"><p>Campagne de correction, sans protocole de benchmark isolé ni échauffement dédié : ces durées ne fondent aucun SLA ou comparaison Vega/GPU.</p></section>
<section><h2>Cas inspectables</h2><label for="category">Famille numérique </label><select id="category"><option value="all">Toutes</option></select><p id="count"></p><div class="table"><table><thead><tr><th>ID</th><th>a</th><th>c</th><th>Prédicat</th><th>Octave / Rust</th><th>Contrôles crypto</th></tr></thead><tbody></tbody></table></div><p>Corpus complet : <a href="vectors.json">vecteurs</a>, <a href="correlation.json">corrélation</a>, <a href="verification-requests.ndjson.gz">requêtes publiques compressées</a>, <a href="verifier-results.json">résultats du vérifieur</a>.</p></section>
<section><h2>Familles adverses</h2><div class="table"><table><thead><tr><th>Test</th><th>Nombre</th><th>Acceptés</th><th>Refusés</th><th>Étape attendue</th></tr></thead><tbody>${families}</tbody></table></div></section>
<section><h2>Limites</h2><ul>${report.limitations.map(item => `<li>${escape(item)}</li>`).join('')}</ul><p>Les signatures sont vérifiées hors circuit. Le prover connaît les deux ouvertures. Ce profil n'est pas post-quantique. Les hashes lient les fichiers, sans attester la date ni la vérité des sources. <a href="manifest.json">Manifeste des octets et des commandes</a>.</p></section>
<script>${script}</script></body></html>`, { flag: 'wx' });
}
