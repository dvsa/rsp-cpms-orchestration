const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const httpServer = require('node:http');
const path = require('node:path');
const { inventory, scenarios } = require('./contracts.cjs');
const checks = require('./assertions.cjs');
const fixtures = require('./fixtures.cjs');
const config = require('./private-config.cjs');
const {
	execute, knownDependencyFailure, request: integrationRequest, safeError,
} = require('./run.cjs');
const { DependencyUnavailable } = require('./errors.cjs');
const { render, directory, write } = require('./report.cjs');
const reversals = require('./reversals.cjs');

function routeSet(file) {
	const text = fs.readFileSync(file, 'utf8');
	return [...text.matchAll(/path:\s*([^\n]+)\n\s+method:\s*([^\n]+)/g)]
		.map((match) => `${match[2].trim().toUpperCase()} /${match[1].trim()}`)
		.sort();
}

test('inventory exactly covers all 13 exported handlers and Serverless HTTP routes', () => {
	const root = path.resolve(__dirname, '..');
	const handler = fs.readFileSync(path.join(root, 'src/handler.js'), 'utf8');
	const exports = [...handler.matchAll(/as\s+(\w+),?/g)].map((match) => match[1]).sort();
	assert.deepEqual(inventory.map((entry) => entry.exportName).sort(), exports);
	assert.deepEqual(inventory.map((entry) => entry.route).sort(), routeSet(path.join(root, 'serverless/serverless.yml')));
	assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, scenarios.length);
	assert.ok(inventory.every((entry) => entry.transport === 'HTTP' && entry.stagePrefix === '/dev'));
	assert.ok(inventory.every((entry) => scenarios.some((scenario) => scenario.endpoint === entry.id)));
});

test('synthetic fixtures are unique, coherent and have independent expected amounts', () => {
	const first = fixtures.createRun('https://nonprod.pay-roadside-fine.service.gov.uk/return');
	const second = fixtures.createRun('https://nonprod.pay-roadside-fine.service.gov.uk/return');
	assert.notEqual(first.runId, second.runId);
	assert.equal(Object.keys(first.individual).length, 5);
	assert.equal(Object.keys(first.groups).length, 5);
	assert.equal(new Set(Object.values(first.individual).map((item) => item.customerReference)).size, 5);
	Object.values(first.groups).forEach((group) => {
		assert.equal(group.members.length, 2);
		assert.equal(Math.round(group.members.reduce((sum, member) => sum + member.amount, 0) * 100), Math.round(group.amount * 100));
		assert.equal(group.payload.TotalAmount, group.amount);
		assert.ok(Number.isInteger(group.amount));
		assert.ok(group.amount >= 10 && group.amount <= 9999);
		assert.ok(group.members.every((member) => Number.isInteger(member.amount)));
	});
});

test('local and external target guards require explicit confirmation and reject unsafe targets', () => {
	assert.throws(() => config.configuration({}), /INTEGRATION_CONFIRM_LOCAL/);
	assert.throws(() => config.configuration({ CI: 'true', INTEGRATION_CONFIRM_LOCAL: 'yes' }), /CI/);
	assert.equal(config.configuration({
		INTEGRATION_CONFIRM_LOCAL: 'yes',
	}).baseUrl, 'http://127.0.0.1:3000/dev');
	[
		'https://127.0.0.1:3000/dev',
		'http://example.org:3000/dev',
		'http://127.0.0.1:3001/dev',
		'http://127.0.0.1:3000/other',
		'http://user:pass@127.0.0.1:3000/dev',
	].forEach((url) => {
		assert.throws(() => config.localUrl({ INTEGRATION_BASE_URL: url }), /Integration target/);
	});
	assert.match(config.requirement({ mutation: true }, {}), /INTEGRATION_CONFIRM_NONPROD/);
	assert.match(config.requirement({ mutation: true, sqs: true }, {
		INTEGRATION_CONFIRM_NONPROD: 'yes',
		INTEGRATION_ALLOW_PAYMENT_MUTATIONS: 'yes',
	}), /INTEGRATION_ALLOW_SQS/);
	assert.match(config.requirement({ reportGeneration: true }, {
		INTEGRATION_CONFIRM_NONPROD: 'yes',
		INTEGRATION_ALLOW_REPORT_GENERATION: 'yes',
	}), /INTEGRATION_REPORT_CODE/);
	assert.throws(() => config.redirectUrl({ INTEGRATION_REDIRECT_URL: 'https://example.org/' }), /approved non-production/);
});

test('private .env loads explicitly configured gates without bypassing target guards', () => {
	const root = path.join(__dirname, '.private-config-fixture');
	const file = path.join(root, '.env');
	fs.mkdirSync(root, { recursive: true, mode: 0o700 });
	try {
		fs.writeFileSync(file, [
			...config.SAFETY_FLAGS.map((flag) => `${flag}=yes`),
			'INTEGRATION_BASE_URL=http://127.0.0.1:3000/dev',
			'INTEGRATION_REDIRECT_URL=https://nonprod.pay-roadside-fine.service.gov.uk',
			'INTEGRATION_REPORT_CODE=SYNTH',
			'',
		].join('\n'), { mode: 0o600 });
		const loaded = config.load({}, root);
		config.SAFETY_FLAGS.forEach((flag) => assert.equal(loaded[flag], 'yes'));
		assert.equal(config.configuration(loaded).baseUrl, 'http://127.0.0.1:3000/dev');
		assert.equal(config.requirement({ mutation: true, sqs: true }, loaded), undefined);
		assert.equal(config.requirement({ mutation: true, confirmation: true }, loaded), undefined);
		assert.equal(config.requirement({ mutation: true, reversal: true }, loaded), undefined);
		assert.equal(config.requirement({ reportGeneration: true }, loaded), undefined);
		assert.throws(() => config.configuration({ ...loaded, CI: 'true' }), /CI/);
		assert.throws(() => config.configuration({
			...loaded, INTEGRATION_BASE_URL: 'http://example.org:3000/dev',
		}), /Integration target/);
		assert.match(config.requirement({ mutation: true }, {
			...loaded, INTEGRATION_REDIRECT_URL: 'https://example.org',
		}), /approved non-production/);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test('shell values override every .env gate and ordinary configuration, including empty values', () => {
	const root = path.join(__dirname, '.private-config-override-fixture');
	fs.mkdirSync(root, { recursive: true, mode: 0o700 });
	try {
		fs.writeFileSync(path.join(root, '.env'), [
			...config.SAFETY_FLAGS.map((flag) => `${flag}=yes`),
			'INTEGRATION_BASE_URL=http://127.0.0.1:3000/dev',
			'INTEGRATION_REPORT_CODE=FILE',
			'',
		].join('\n'), { mode: 0o600 });
		const shell = Object.fromEntries(config.SAFETY_FLAGS.map((flag) => [flag, 'no']));
		shell.INTEGRATION_BASE_URL = 'http://localhost:3000/dev';
		shell.INTEGRATION_REPORT_CODE = 'SHELL';
		const loaded = config.load(shell, root);
		config.SAFETY_FLAGS.forEach((flag) => assert.equal(loaded[flag], 'no'));
		assert.equal(loaded.INTEGRATION_BASE_URL, shell.INTEGRATION_BASE_URL);
		assert.equal(loaded.INTEGRATION_REPORT_CODE, 'SHELL');
		assert.throws(() => config.configuration(loaded), /INTEGRATION_CONFIRM_LOCAL/);
		assert.match(config.requirement({ mutation: true }, loaded), /INTEGRATION_CONFIRM_NONPROD/);
		const empty = config.load(Object.fromEntries(config.SAFETY_FLAGS.map((flag) => [flag, ''])), root);
		config.SAFETY_FLAGS.forEach((flag) => assert.equal(empty[flag], ''));
		assert.throws(() => config.configuration(empty), /INTEGRATION_CONFIRM_LOCAL/);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test('report contracts validate report metadata and CSV transaction read-backs', () => {
	assert.equal(checks.reportDefinitions([{ report_code: 'SYNTH', report_name: 'Synthetic report' }]).length, 1);
	assert.throws(() => checks.reportDefinitions([{ report_code: 'SYNTH' }]), /Report name/);
	assert.throws(() => checks.reportDefinitions([
		{ report_code: 'SYNTH', report_name: 'One' },
		{ report_code: 'SYNTH', report_name: 'Duplicate' },
	]), /unique/);
	const rows = checks.parseCsv('Customer Reference,Total Amount,Sales Reference,Receipt Reference\r\nSYNTH-GROUP,3.14,990001_FPN,RCPT-1\r\n');
	checks.verifyReport(rows, [{
		customerReference: 'SYNTH-GROUP',
		amount: 3.14,
		receiptReference: 'RCPT-1',
		members: [{ reference: '990001_FPN', amount: 1.11 }, { reference: '990002_FPN', amount: 2.03 }],
	}]);
	assert.throws(() => checks.verifyReport(rows, [{ customerReference: 'OTHER', amount: 3.14 }]), /exact synthetic customer reference/);
});

test('response assertions verify exact payment and report behavior', () => {
	checks.receipt({ receipt_reference: 'SYNTH-1', payment_url: 'https://payments.example/synthetic' }, 'cardPayment');
	checks.receipt({ receipt_reference: 'SYNTH-1', gateway_url: 'https://payments.example/synthetic' }, 'cardPayment');
	checks.receipt({ receipt_reference: 'SYNTH-2', code: '000' }, 'cashPayment');
	assert.throws(() => checks.receipt({ receipt_reference: 'SYNTH-3', code: '827' }, 'cashPayment'), /success code 000/);
	assert.equal(checks.reportReference({ report_ref: 'REPORT-1' }), 'REPORT-1');
	assert.equal(checks.reportStatus({ status: 'completed' }), 'completed');
	assert.equal(checks.reportStatus({ completed: true, error: false }), 'completed');
	assert.throws(() => checks.reportStatus({ completed: true, error: true }), /without an error/);
	assert.throws(() => checks.reportStatus({ completed: false, error: false }), /completion/);
	assert.throws(() => checks.reportStatus({ status: 'processing' }), /indicate completion/);
});

test('CPMS summary report verifies group totals without inventing member detail', () => {
	const rows = checks.parseCsv('customer_reference,total_amount,line_amount,sales_reference,receipt_reference\nGROUP,3.14,3.14,ONE,R-1\n');
	checks.verifyReport(rows, [{
		customerReference: 'GROUP',
		amount: 3.14,
		receiptReference: 'R-1',
		members: [{ reference: 'ONE', amount: 1.11 }, { reference: 'TWO', amount: 2.03 }],
	}]);
	assert.throws(() => checks.verifyReport(rows, [{
		customerReference: 'GROUP',
		amount: 4,
	}]), /report amount/);
	assert.throws(() => checks.verifyReport(rows, [{
		customerReference: 'GROUP', amount: 3.14, receiptReference: 'WRONG',
	}]), /receipt reference/);
});

test('preflight failure reports every scenario as not-run and never makes a network request', async () => {
	let writes = 0;
	const report = await execute({
		env: {},
		http: async () => { assert.fail('network must not be used'); },
		write: (value) => { writes += 1; value.summary = {}; },
		progress: () => {},
	});
	assert.equal(report.outcome, 'failed');
	assert.equal(report.scenarios.length, scenarios.length);
	assert.ok(report.scenarios.every((scenario) => scenario.status === 'not-run'));
	assert.equal(writes, 1);
});

test('runner records passes, gated skips and dependency failures with ordered request evidence', async () => {
	const successful = await execute({
		env: { INTEGRATION_CONFIRM_LOCAL: 'yes' },
		tests: [
			{ id: 'list-report-definitions', endpoint: 'listReports', validation: 'report metadata' },
			{
				id: 'mutating-scenario', endpoint: 'groupPayment', mutation: true, sqs: true, validation: 'group create',
			},
		],
		http: async (baseUrl, method) => (method === 'GET'
			? { status: 404 }
			: { status: 200, data: [{ report_code: 'SYNTH', report_name: 'Synthetic report' }] }),
		write: (value) => {
			value.summary = value.scenarios.reduce((summary, scenario) => {
				summary[scenario.status] = (summary[scenario.status] || 0) + 1;
				return summary;
			}, {});
		},
		progress: () => {},
	});
	assert.deepEqual(successful.scenarios.map((scenario) => scenario.status), ['passed', 'skipped']);
	assert.equal(successful.outcome, 'passed-with-skips (incomplete)');

	const unavailable = await execute({
		env: { INTEGRATION_CONFIRM_LOCAL: 'yes' },
		tests: [{ id: 'list-report-definitions', endpoint: 'listReports', validation: 'remote dependency' }],
		http: async (baseUrl, method) => {
			if (method === 'GET') return { status: 404 };
			throw new DependencyUnavailable('dependency unavailable');
		},
		write: () => {},
		progress: () => {},
	});
	assert.equal(unavailable.scenarios[0].status, 'dependency-unavailable');
	assert.equal(unavailable.outcome, 'failed');
});

test('runner writes safe HTML and JSON even when local service is unavailable', async () => {
	const report = await execute({
		env: { INTEGRATION_CONFIRM_LOCAL: 'yes' },
		http: async () => { throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }); },
		write: (value) => write(value, 'tooling-preview'),
		progress: () => {},
	});
	assert.equal(report.outcome, 'failed');
	assert.equal(report.scenarios.length, scenarios.length);
	const json = JSON.parse(fs.readFileSync(path.join(directory, 'tooling-preview.json'), 'utf8'));
	assert.equal(json.endpoints.length, 13);
	assert.ok(json.scenarios.every((scenario) => scenario.status === 'not-run'));
	assert.match(fs.readFileSync(path.join(directory, 'tooling-preview.html'), 'utf8'), /all 13 exported handlers/i);
	assert.ok(!JSON.stringify(json).includes('secret'));
	fs.unlinkSync(path.join(directory, 'tooling-preview.json'));
	fs.unlinkSync(path.join(directory, 'tooling-preview.html'));
});

test('HTML report escapes untrusted content and errors omit raw CPMS/AWS data', () => {
	const html = render({
		startedAt: '<script>',
		node: '20',
		operation: 'tooling',
		target: 'loopback',
		setup: '<img>',
		cleanup: 'none',
		safetyGates: {},
		readback: { ownedRows: 10, note: '<svg>' },
		outcome: 'failed',
		inventory,
		scenarios: [{
			endpoint: 'listReports',
			id: 'x',
			validation: 'fields',
			status: 'failed',
			reason: '<script>alert(1)</script>',
		}],
	});
	assert.ok(!html.includes('<script>') && !html.includes('<img>'));
	assert.ok(html.includes('&lt;script&gt;'));
	assert.ok(!html.includes('<svg>') && html.includes('&lt;svg&gt;'));
	assert.equal(knownDependencyFailure({ name: 'ExpiredTokenException', message: 'sensitive' }), true);
	assert.doesNotMatch(safeError(new Error('raw response contains private data')), /private data/);
});

test('HTTP helper uses bounded local requests and rejects redirects without following them', async () => {
	const server = httpServer.createServer((request, response) => {
		if (request.url === '/redirect') {
			response.writeHead(302, { location: 'https://example.org' });
			response.end();
		} else {
			response.writeHead(200, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ ok: true }));
		}
	});
	await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
	try {
		const base = `http://127.0.0.1:${server.address().port}`;
		assert.deepEqual(await integrationRequest(base, 'GET', '/', undefined), { status: 200, data: { ok: true } });
		await assert.rejects(() => integrationRequest(base, 'GET', '/redirect'), /unreachable or timed out/);
	} finally {
		await new Promise((resolve) => { server.close(resolve); });
	}
});

async function reversalFixture(method, callback) {
	const state = path.resolve(__dirname, '../integration-state');
	fs.mkdirSync(state, { recursive: true, mode: 0o700 });
	const stem = `tooling-reversal-${process.pid}-${method}`;
	const manifestName = `${stem}-manifest.json`;
	const proofName = `${stem}-proof.json`;
	const attempt = {
		kind: method === 'CARD' ? 'cardPayment' : 'chequePayment',
		status: 'response-received',
		httpStatus: 200,
		receiptReference: `${stem}-receipt`,
		customerReference: `${stem}-customer`,
		penaltyReference: '990099123456',
		amount: 1.37,
	};
	const manifest = {
		purpose: 'synthetic CPMS integration references; external transactions are not auto-deleted',
		attempts: [attempt],
	};
	const proof = {
		environment: 'non-production',
		independentlyVerified: true,
		verifiedAt: new Date().toISOString(),
		receiptReference: attempt.receiptReference,
		customerReference: attempt.customerReference,
		penaltyType: 'FPN',
		amount: attempt.amount,
		cpmsCode: method === 'CARD' ? 801 : '000',
		rejection218Resolved: method === 'CHEQUE',
		reportRows: [{
			'customer reference': attempt.customerReference,
			'receipt reference': attempt.receiptReference,
			'total amount': '1.37',
			'payment type': method,
		}],
	};
	const prefix = `INTEGRATION_${method}_REVERSAL`;
	const env = {
		INTEGRATION_CONFIRM_LOCAL: 'yes',
		INTEGRATION_CONFIRM_NONPROD: 'yes',
		INTEGRATION_ALLOW_PAYMENT_MUTATIONS: 'yes',
		INTEGRATION_ALLOW_REVERSALS: 'yes',
		[`${prefix}_APPROVED`]: 'yes',
		[`${prefix}_MANIFEST`]: manifestName,
		[`${prefix}_PROOF`]: proofName,
		[`${prefix}_RECEIPT_REFERENCE`]: attempt.receiptReference,
		[`${prefix}_CUSTOMER_REFERENCE`]: attempt.customerReference,
		[`${prefix}_PENALTY_TYPE`]: 'FPN',
		[`${prefix}_EXPECTED_AMOUNT`]: '1.37',
	};
	const save = () => {
		fs.writeFileSync(path.join(state, manifestName), JSON.stringify(manifest), { mode: 0o600 });
		fs.writeFileSync(path.join(state, proofName), JSON.stringify(proof), { mode: 0o600 });
	};
	save();
	try {
		await callback({
			env, manifest, proof, save,
		});
	} finally {
		fs.unlinkSync(path.join(state, manifestName));
		fs.unlinkSync(path.join(state, proofName));
	}
}

test('reversal preflight rejects unapproved, unpaid, unowned and mismatched card fixtures', async () => {
	await reversalFixture('CARD', async ({
		env, manifest, proof, save,
	}) => {
		assert.equal(reversals.preflight('CARD', env), undefined);
		let mutationCalls = 0;
		const skipped = await execute({
			env: { ...env, INTEGRATION_CARD_REVERSAL_APPROVED: 'no' },
			tests: scenarios.filter((entry) => entry.reversalMethod === 'CARD'),
			http: async (base, verb) => {
				if (verb !== 'GET') mutationCalls += 1;
				return { status: 404 };
			},
			progress: () => {},
			write: () => {},
		});
		assert.equal(skipped.scenarios[0].status, 'skipped');
		assert.equal(mutationCalls, 0);
		assert.match(reversals.preflight('CARD', { ...env, INTEGRATION_CARD_REVERSAL_APPROVED: 'no' }), /APPROVED/);
		assert.match(reversals.preflight('CARD', { ...env, INTEGRATION_CARD_REVERSAL_MANIFEST: '../outside.json' }), /filename/);
		assert.match(reversals.preflight('CARD', { ...env, INTEGRATION_CARD_REVERSAL_EXPECTED_AMOUNT: '5' }), /suite-owned/);
		proof.cpmsCode = 827;
		save();
		assert.match(reversals.preflight('CARD', env), /801/);
		proof.cpmsCode = 801;
		proof.environment = 'production';
		save();
		assert.match(reversals.preflight('CARD', env), /non-production/);
		proof.environment = 'non-production';
		proof.reportRows[0]['total amount'] = '8';
		save();
		assert.match(reversals.preflight('CARD', env), /report amount/);
		proof.reportRows[0]['total amount'] = '1.37';
		manifest.attempts[0].kind = 'cardNotPresentPayment';
		save();
		assert.match(reversals.preflight('CARD', env), /suite-owned/);
	});
});

test('cheque preflight requires resolution of CPMS 218 and forbids retrying an attempted fixture', async () => {
	await reversalFixture('CHEQUE', async ({
		env, manifest, proof, save,
	}) => {
		proof.rejection218Resolved = false;
		save();
		assert.match(reversals.preflight('CHEQUE', env), /218/);
		proof.rejection218Resolved = true;
		manifest.attempts.push({ ...manifest.attempts[0], kind: 'cheque-reversal', status: 'outcome-unknown' });
		save();
		assert.match(reversals.preflight('CHEQUE', env), /already attempted/);
	});
});

test('approved independently verified fixtures call the actual card and cheque routes once', async () => {
	for (const method of ['CARD', 'CHEQUE']) {
		// eslint-disable-next-line no-await-in-loop
		await reversalFixture(method, async ({ env }) => {
			const scenario = scenarios.find((entry) => entry.reversalMethod === method);
			const calls = [];
			const report = await execute({
				env,
				tests: [scenario],
				http: async (base, verb, route, payload) => {
					if (verb === 'GET') return { status: 404 };
					calls.push({ route, payload });
					return { status: 200, data: { code: '000' } };
				},
				progress: () => {},
				write: () => {},
			});

			try {
				assert.equal(report.scenarios[0].status, 'passed');
				assert.deepEqual(calls, [{
					route: method === 'CARD' ? '/reverseCard' : '/reverseCheque',
					payload: {
						penalty_type: 'FPN',
						receipt_ref: env[`INTEGRATION_${method}_REVERSAL_RECEIPT_REFERENCE`],
						payment_ref: env[`INTEGRATION_${method}_REVERSAL_CUSTOMER_REFERENCE`],
					},
				}]);
				assert.match(reversals.preflight(method, env), /already attempted/);
				const journal = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', report.manifest)));
				assert.equal(journal.attempts[0].receiptReference, calls[0].payload.receipt_ref);
				assert.ok(!JSON.stringify(report.scenarios).includes(calls[0].payload.receipt_ref));
			} finally {
				fs.rmSync(path.resolve(__dirname, '..', report.manifest), { force: true });
			}
		});
	}
});

test('CPMS rejection codes cannot pass as a successful reversal or be retried', async () => {
	await reversalFixture('CHEQUE', async ({ env }) => {
		let calls = 0;
		const report = await execute({
			env,
			tests: scenarios.filter((entry) => entry.reversalMethod === 'CHEQUE'),
			http: async (base, verb) => {
				if (verb === 'GET') return { status: 404 };
				calls += 1;
				return { status: 200, data: { code: 218 } };
			},
			progress: () => {},
			write: () => {},
		});
		try {
			assert.equal(calls, 1);
			assert.equal(report.scenarios[0].status, 'failed');
			assert.match(report.scenarios[0].reason, /non-success CPMS code/);
			assert.match(reversals.preflight('CHEQUE', env), /already attempted/);
		} finally {
			fs.rmSync(path.resolve(__dirname, '..', report.manifest), { force: true });
		}
	});
});
