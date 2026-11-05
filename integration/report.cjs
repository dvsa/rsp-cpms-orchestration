const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const directory = path.resolve(__dirname, '../integration-reports');
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
	'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function summarize(report) {
	const summary = {
		passed: 0,
		failed: 0,
		skipped: 0,
		'dependency-unavailable': 0,
		'not-run': 0,
	};
	report.scenarios.forEach(({ status }) => { summary[status] = (summary[status] || 0) + 1; });
	report.summary = summary;
	report.endpoints = report.inventory.map((endpoint) => {
		const scenarios = report.scenarios.filter((scenario) => scenario.endpoint === endpoint.id);
		const passed = scenarios.filter((scenario) => scenario.status === 'passed').length;
		let status = 'incomplete';
		if (scenarios.length > 0 && passed === scenarios.length) status = 'passed';
		else if (scenarios.some((scenario) => ['failed', 'dependency-unavailable'].includes(scenario.status))) status = 'failed';
		return {
			...endpoint, scenarioCount: scenarios.length, passed, status,
		};
	});
	return report;
}

function render(report) {
	summarize(report);
	const endpointRows = report.endpoints.map((endpoint) => `<tr><td>${escape(endpoint.id)}</td><td>${escape(endpoint.route)}</td><td>${escape(endpoint.sideEffects)}</td><td>${escape(endpoint.status)}</td><td>${endpoint.passed}/${endpoint.scenarioCount}</td></tr>`).join('');
	const scenarioRows = report.scenarios.map((scenario) => `<tr><td>${escape(scenario.endpoint)}</td><td>${escape(scenario.id)}</td><td>${escape(scenario.validation)}${scenario.actions && scenario.actions.length ? `<details><summary>Action/read-back evidence</summary><ul>${scenario.actions.map((action) => `<li>${escape(action)}</li>`).join('')}</ul></details>` : ''}</td><td class="${escape(scenario.status)}">${escape(scenario.status)}</td><td>${escape(scenario.reason || '')}</td><td>${scenario.durationMs || 0} ms</td></tr>`).join('');
	return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CPMS Orchestration integration report</title>
<style>body{font:16px system-ui;margin:2rem;color:#17212b}table{border-collapse:collapse;width:100%;margin:1rem 0 2rem}th,td{border:1px solid #bbb;padding:.5rem;text-align:left;vertical-align:top}th{background:#eee}td{overflow-wrap:anywhere}.passed{background:#d8f3dc}.failed,.dependency-unavailable{background:#ffd6d6}.skipped,.not-run{background:#fff3bf}details{margin-top:.5rem}summary{cursor:pointer}</style>
<style>th:nth-child(4),td:nth-child(4),th:nth-child(6),td:nth-child(6){white-space:nowrap;overflow-wrap:normal}</style>
<h1>CPMS Orchestration integration baseline</h1>
<p>${escape(report.startedAt)} — Node ${escape(report.node)} — ${escape(report.operation)}</p>
<p><strong>Endpoint/scenario coverage, not source coverage.</strong> ${escape(report.outcome)}. ${escape(JSON.stringify(report.summary))}</p>
<p>Target: ${escape(report.target)}. Setup: ${escape(report.setup)}. Cleanup: ${escape(report.cleanup)}.</p>
<p>Safety gates: ${escape(JSON.stringify(report.safetyGates))}</p>
${report.readback ? `<h2>Independent CPMS read-back</h2><p>${escape(JSON.stringify(report.readback))}</p>` : ''}
<p>All 13 exported handlers map to HTTP routes in <code>serverless/serverless.yml</code>. Report reads/generation use CPMS. Payment operations create real non-production transactions; card/group operations also publish to SQS. CPMS transactions and queue messages cannot be automatically removed. A failed response may follow a successful CPMS write, so reconcile the private run manifest/report before any retry.</p>
<p><strong>Known current behavior:</strong> confirming an uncompleted CNP transaction can return HTTP 200 with CPMS code 827 and auth_code P; that is not a paid transaction. Group creation can persist at CPMS before its SQS send fails. Reversals require individually approved manifest-bound fixtures and independent private CPMS proof. Card proof requires completed checkout code 801; cheque approval requires resolving the earlier CPMS 218 rejection. The suite never enters card details or retries an already attempted reversal. SAM's <code>reverseCard</code> handler mapping points to a non-existent <code>handler</code> export; this baseline does not alter deployment configuration.</p>
<p><strong>Coverage limits:</strong> this suite does not consume SQS messages, verify their attributes or prove downstream delivery. CPMS report read-back verifies transaction records, not settlement. Reversal outcomes need separate CPMS reconciliation.</p>
<h2>Handler and route inventory</h2><table><tr><th>Handler</th><th>Route</th><th>External effects</th><th>Coverage status</th><th>Passed / scenarios</th></tr>${endpointRows}</table>
<h2>Scenarios</h2><table><tr><th>Handler</th><th>Scenario</th><th>Checks</th><th>Result</th><th>Reason</th><th>Duration</th></tr>${scenarioRows}</table>
<p>Reports intentionally omit credentials, CPMS URLs, tokens, private fixture identifiers, raw payloads and external response bodies. Skips and dependency-unavailable results are not passes. Integration state is stored in a permission-restricted ignored manifest; payment side effects are not reversible by suite cleanup.</p></html>`;
}

function write(report, name = 'latest') {
	summarize(report);
	fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
	fs.chmodSync(directory, 0o700);
	const json = `${JSON.stringify(report, null, 2)}\n`;
	const html = render(report);
	['json', 'html'].forEach((suffix) => {
		const content = suffix === 'json' ? json : html;
		const filename = path.join(directory, `${name}.${suffix}`);
		fs.writeFileSync(filename, content, { mode: 0o600 });
		fs.chmodSync(filename, 0o600);
	});
	console.log(`Integration result: ${report.outcome}; ${JSON.stringify(report.summary)}`);
	console.log(`HTML report: ${path.join(directory, `${name}.html`)}`);
	console.log(`JSON report: ${path.join(directory, `${name}.json`)}`);
}

function open(options = {}) {
	const file = options.file || path.join(directory, 'latest.html');
	if (!fs.existsSync(file)) throw new Error('No integration report found; run npm run test:integration:local first');
	const platform = options.platform || process.platform;
	if (platform !== 'darwin') {
		throw new Error(`Automatic report opening is supported only on macOS; open this file manually: ${file}`);
	}
	const child = (options.spawnProcess || spawn)('open', [file], { stdio: 'ignore' });
	return new Promise((resolve, reject) => {
		child.once('error', () => reject(new Error(`Could not open integration report; open it manually: ${file}`)));
		child.once('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`Could not open integration report; open it manually: ${file}`));
		});
	});
}

module.exports = {
	directory, open, render, summarize, write,
};
