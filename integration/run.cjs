const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scenarios, inventory } = require('./contracts.cjs');
const assertions = require('./assertions.cjs');
const fixtures = require('./fixtures.cjs');
const reversals = require('./reversals.cjs');
const privateConfig = require('./private-config.cjs');
const reports = require('./report.cjs');
const { DependencyUnavailable, ExternalOutcomeUnknown } = require('./errors.cjs');

function safeError(error) {
	if (error instanceof DependencyUnavailable || error instanceof ExternalOutcomeUnknown) return error.message;
	if (error instanceof assert.AssertionError) return error.message.split('\n')[0];
	if (['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(error && error.code)) return 'Local service unavailable or timed out';
	return 'Setup, transport or assertion failed; raw responses are deliberately withheld';
}

function knownDependencyFailure(value) {
	const text = typeof value === 'string' ? value : JSON.stringify(value || {});
	return /ExpiredToken|CredentialsError|InvalidClientToken|AccessDenied|UnrecognizedClient|NetworkingError|ENOTFOUND/i.test(text);
}

async function request(baseUrl, method, route, body) {
	let response;
	try {
		response = await fetch(`${baseUrl}${route}`, {
			method,
			redirect: 'error',
			signal: AbortSignal.timeout(20000),
			headers: body === undefined ? {} : { 'content-type': 'application/json' },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
	} catch {
		throw new DependencyUnavailable('Loopback service is unreachable or timed out; no downstream result is available');
	}
	const text = await response.text();
	let data;
	try { data = JSON.parse(text); } catch { data = text; }
	if (knownDependencyFailure(data)) {
		throw new DependencyUnavailable('AWS or CPMS dependency unavailable/unauthorised; reconcile any attempted payment before retrying');
	}
	return { status: response.status, data };
}

function unwrap(result) {
	let value = result.data;
	if (value && typeof value === 'object' && Number.isInteger(value.statusCode) && 'body' in value) {
		value = value.body;
		if (typeof value === 'string') {
			try { value = JSON.parse(value); } catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
			}
		}
	}
	return value;
}

function endpointRoute(id) {
	const endpoint = inventory.find((entry) => entry.id === id);
	if (!endpoint) throw new Error('Unknown integration endpoint');
	return endpoint.route.split(' ')[1];
}

function statusCheck(response, expected, label) {
	assertions.check(response.status === expected, `${label} expected HTTP ${expected}`);
}

function reportDate() {
	return new Date().toISOString().slice(0, 10);
}

function makeReport(reportCode) {
	const date = reportDate();
	return {
		penalty_type: 'FPN',
		report_code: reportCode,
		from_date: `${date} 00:00:00`,
		to_date: `${date} 23:59:59`,
	};
}

function manifestPath(run) {
	return path.resolve(__dirname, `../integration-state/${run.runId}.json`);
}

function persistManifest(run) {
	const directory = path.dirname(manifestPath(run));
	fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
	fs.chmodSync(directory, 0o700);
	const file = manifestPath(run);
	fs.writeFileSync(file, `${JSON.stringify({
		runId: run.runId,
		startedAt: run.startedAt,
		purpose: 'synthetic CPMS integration references; external transactions are not auto-deleted',
		attempts: run.attempts,
		reportReference: run.reportReference,
	}, null, 2)}\n`, { mode: 0o600 });
	fs.chmodSync(file, 0o600);
}

function allExpected(run) {
	return [
		...Object.values(run.individual).map((item) => ({
			customerReference: item.customerReference,
			amount: item.amount,
			receiptReference: item.receiptReference,
		})),
		...Object.values(run.groups).map((item) => ({
			customerReference: item.customerReference,
			amount: item.amount,
			members: item.members,
			receiptReference: item.receiptReference,
		})),
	].filter((item) => run.attempts.some((attempt) => attempt.customerReference === item.customerReference
		&& ['response-received', 'outcome-unknown'].includes(attempt.status)));
}

function addScenario(report, scenario, result) {
	if (result.status === 'passed') delete report.scenarios.find((entry) => entry.id === scenario.id).reason;
	Object.assign(report.scenarios.find((entry) => entry.id === scenario.id), result);
}

async function execute(options = {}) {
	const env = options.env || privateConfig.load(process.env);
	const tests = options.tests || scenarios;
	const progress = options.progress || console.log;
	const report = {
		startedAt: new Date().toISOString(),
		node: process.version,
		operation: options.operation || 'manual-loopback-black-box',
		target: 'not validated',
		inventory,
		scenarios: tests.map(({ id, endpoint, validation }) => ({
			id, endpoint, validation, status: 'not-run', reason: 'Setup did not complete',
		})),
		setup: 'not-started',
		cleanup: 'No local database fixtures; external CPMS/SQS effects are never auto-deleted',
		safetyGates: {
			loopbackConfirmed: env.INTEGRATION_CONFIRM_LOCAL === 'yes',
			nonProductionConfirmed: env.INTEGRATION_CONFIRM_NONPROD === 'yes',
			paymentMutationsEnabled: env.INTEGRATION_ALLOW_PAYMENT_MUTATIONS === 'yes',
			sqsWritesEnabled: env.INTEGRATION_ALLOW_SQS === 'yes',
			confirmationEnabled: env.INTEGRATION_ALLOW_CONFIRMATION === 'yes',
			reportGenerationEnabled: env.INTEGRATION_ALLOW_REPORT_GENERATION === 'yes',
			reversalsEnabled: env.INTEGRATION_ALLOW_REVERSALS === 'yes',
		},
		outcome: 'failed',
	};
	const write = options.write || reports.write;
	let config;
	let run;
	let stopMutations = false;
	let lock;
	try {
		progress('Starting integration baseline; no CPMS writes are made before the loopback and per-scenario safety gates pass.');
		progress('Validating manual loopback target and checking service readiness...');
		config = privateConfig.configuration(env);
		report.target = config.target;
		report.setup = 'Loopback target validated';
		const lockPath = path.resolve(__dirname, '../.integration-local.lock');
		lock = fs.openSync(lockPath, 'wx', 0o600);
		const health = await (options.http || request)(new URL(config.baseUrl).origin, 'GET', '/local-readiness');
		assertions.check(health.status === 404, 'Local service readiness probe must return the documented harmless HTTP 404');
		run = fixtures.createRun(env.INTEGRATION_REDIRECT_URL);
		report.setup = 'Loopback readiness passed; unique synthetic fixture identifiers prepared';
		progress('Loopback readiness passed. Preparing numbered black-box scenarios...');
		for (let index = 0; index < tests.length; index += 1) {
			const scenario = tests[index];
			const label = `[${index + 1}/${tests.length}] ${scenario.endpoint} / ${scenario.id}`;
			const previous = scenario.dependsOn
				? report.scenarios.find((entry) => entry.id === scenario.dependsOn)
				: undefined;
			let reason = privateConfig.requirement(scenario, env);
			if (!reason && scenario.dependsOn && (!previous || previous.status !== 'passed')) {
				reason = `Prerequisite ${scenario.dependsOn} did not pass; dependent workflow not executed`;
			}
			if (!reason && stopMutations && scenario.mutation) {
				reason = 'A previous external mutation had an uncertain result; remaining mutations stopped to prevent duplicates';
			}
			if (reason) {
				addScenario(report, scenario, { status: 'skipped', reason });
				progress(`${label}: SKIPPED - ${reason}`);
				continue;
			}
			progress(`${label}: RUNNING`);
			const started = Date.now();
			const firstAttemptIndex = run.attempts.length;
			const actions = [];
			try {
				const http = async (endpoint, payload) => {
					const route = endpointRoute(endpoint);
					actions.push(`${endpoint} POST request; response envelope and independent domain values checked`);
					return (options.http || request)(config.baseUrl, 'POST', route, payload);
				};
				const mutate = async (endpoint, details, payload) => {
					run.attempts.push({ ...details, status: 'request-sent' });
					persistManifest(run);
					try {
						const response = await http(endpoint, payload);
						const attempt = run.attempts[run.attempts.length - 1];
						attempt.httpStatus = response.status;
						if (response.status !== 200) {
							attempt.status = 'outcome-unknown';
							stopMutations = true;
							persistManifest(run);
							throw new ExternalOutcomeUnknown('HTTP failure followed an external payment attempt; reconcile report/manifest before any retry');
						}
						attempt.status = 'response-received';
						persistManifest(run);
						return response;
					} catch (error) {
						run.attempts[run.attempts.length - 1].status = 'outcome-unknown';
						stopMutations = true;
						persistManifest(run);
						if (error instanceof DependencyUnavailable) throw error;
						throw new ExternalOutcomeUnknown('External payment result is unknown; reconcile report/manifest before any retry');
					}
				};
				switch (scenario.id) {
				case 'list-report-definitions': {
					const response = await http('listReports', { penalty_type: 'FPN' });
					statusCheck(response, 200, 'Report list');
					const definitions = assertions.reportDefinitions(unwrap(response));
					run.reportCodes = definitions.map((entry) => entry.report_code || entry.reportCode || entry.code);
					actions.push('Validated unique report codes and names for every returned definition');
					break;
				}
				case 'generate-current-day-report': {
					assertions.check(
						run.reportCodes.includes(env.INTEGRATION_REPORT_CODE),
						'Configured report code must exactly match a CPMS-listed definition',
					);
					const response = await http('generateReport', makeReport(env.INTEGRATION_REPORT_CODE));
					statusCheck(response, 200, 'Report generation');
					run.reportReference = assertions.reportReference(unwrap(response));
					persistManifest(run);
					actions.push('Recorded generated report reference in private manifest');
					break;
				}
				case 'check-generated-report': {
					let completed;
					for (let attempt = 0; attempt < 120; attempt += 1) {
						const response = await http('checkReportStatus', {
							penalty_type: 'FPN',
							report_ref: run.reportReference,
						});
						statusCheck(response, 200, 'Report status');
						const status = unwrap(response);
						const state = String((status && (status.status || status.report_status || status.reportStatus)) || '').toLowerCase();
						if (status.completed === true || ['complete', 'completed', 'success', 'succeeded'].includes(state)) {
							assertions.reportStatus(status);
							completed = true;
							break;
						}
						if (status.error === true || ['failed', 'error', 'cancelled'].includes(state)) {
							throw new assert.AssertionError({ message: 'Generated report ended in a non-success terminal state' });
						}
						await new Promise((resolve) => { setTimeout(resolve, 1000); });
					}
					assertions.check(completed, 'Generated CPMS report must complete within 120 bounded polls');
					actions.push('Polled report status to a recognized completed state');
					break;
				}
				case 'download-and-reconcile-report': {
					const response = await http('downloadReport', {
						penalty_type: 'FPN',
						report_ref: run.reportReference,
					});
					statusCheck(response, 200, 'Report download');
					const rows = assertions.reportRows(unwrap(response));
					const expected = allExpected(run);
					assertions.check(expected.length > 0, 'At least one suite-owned payment response must be available for reconciliation');
					assertions.verifyReport(rows, expected);
					actions.push(`Compared ${expected.length} suite-owned transaction references and amounts against independently generated CPMS report rows`);
					break;
				}
				case 'confirm-uncompleted-cnp': {
					const item = run.individual.cardNotPresentPayment;
					const response = await mutate('confirm', {
						kind: 'confirmation',
						customerReference: item.customerReference,
						amount: item.amount,
					}, { penalty_type: 'FPN', receipt_reference: item.receiptReference });
					statusCheck(response, 200, 'CNP confirmation');
					const body = unwrap(response);
					assertions.check(Number(body && body.code) === 827, 'Uncompleted CNP confirmation must return CPMS code 827');
					assertions.check(body && (body.auth_code || body.auth) === 'P', 'Uncompleted CNP confirmation must return auth code P');
					actions.push('Confirmed a suite-owned CNP receipt; CPMS code 827 and auth code P explicitly do not establish payment');
					break;
				}
				case 'reverse-suite-cheque':
				case 'reverse-completed-test-card': {
					const item = reversals.fixture(scenario.reversalMethod, env);
					const response = await mutate(scenario.endpoint, {
						kind: `${scenario.reversalMethod.toLowerCase()}-reversal`,
						customerReference: item.customerReference,
						receiptReference: item.receiptReference,
						amount: item.amount,
					}, {
						penalty_type: item.penaltyType,
						receipt_ref: item.receiptReference,
						payment_ref: item.customerReference,
					});
					statusCheck(response, 200, 'Reversal');
					const body = unwrap(response);
					assertions.object(body, 'Reversal response');
					if (body.code !== undefined) {
						assertions.check(['000', '0'].includes(String(body.code)), 'Reversal returned a non-success CPMS code; reconcile before retrying');
					}
					actions.push('One reversal request only; final CPMS state requires report/manual reconciliation');
					break;
				}
				default: {
					const individual = run.individual[scenario.endpoint];
					if (individual) {
						const response = await mutate(scenario.endpoint, {
							kind: scenario.endpoint,
							customerReference: individual.customerReference,
							penaltyReference: individual.penaltyReference,
							amount: individual.amount,
						}, individual.payload);
						statusCheck(response, 200, `${scenario.endpoint} creation`);
						const receipt = assertions.receipt(unwrap(response), scenario.endpoint);
						individual.receiptReference = receipt.receipt_reference;
						const attempt = run.attempts.findLast((entry) => entry.customerReference === individual.customerReference);
						attempt.receiptReference = receipt.receipt_reference;
						persistManifest(run);
						actions.push('Matched response receipt to private fixture record; transaction amount/reference are verified from the later CPMS report');
					} else {
						const method = scenario.id.replace('create-group-', '').toUpperCase();
						const group = run.groups[method];
						const response = await mutate('groupPayment', {
							kind: `group-${method}`,
							customerReference: group.customerReference,
							amount: group.amount,
							members: group.members,
						}, group.payload);
						statusCheck(response, 200, `groupPayment ${method} creation`);
						const receipt = assertions.receipt(unwrap(response), 'groupPayment');
						group.receiptReference = receipt.receipt_reference;
						const attempt = run.attempts.findLast((entry) => entry.customerReference === group.customerReference);
						attempt.receiptReference = receipt.receipt_reference;
						persistManifest(run);
						actions.push(`Matched ${method} group response; later CPMS summary read-back verifies the transaction total, not individual members`);
					}
				}
				}
				addScenario(report, scenario, { status: 'passed', actions, durationMs: Date.now() - started });
			} catch (error) {
				const status = error instanceof DependencyUnavailable ? 'dependency-unavailable' : 'failed';
				if (scenario.mutation) {
					stopMutations = true;
					const attempt = run.attempts.slice(firstAttemptIndex)
						.findLast((entry) => entry.status === 'response-received');
					if (attempt) {
						attempt.status = 'outcome-unknown';
						persistManifest(run);
					}
				}
				if (scenario.id === 'list-report-definitions') stopMutations = true;
				if (error instanceof ExternalOutcomeUnknown || error instanceof DependencyUnavailable) stopMutations = true;
				addScenario(report, scenario, {
					status, reason: safeError(error), actions, durationMs: Date.now() - started,
				});
			}
			const outcome = report.scenarios[index].status.toUpperCase();
			progress(`${label}: ${outcome} (${Date.now() - started}ms)${report.scenarios[index].reason ? ` - ${report.scenarios[index].reason}` : ''}`);
		}
		report.outcome = 'passed';
		if (report.scenarios.some((scenario) => ['failed', 'dependency-unavailable', 'not-run'].includes(scenario.status))) {
			report.outcome = 'failed';
		} else if (report.scenarios.some((scenario) => scenario.status === 'skipped')) {
			report.outcome = 'passed-with-skips (incomplete)';
		}
	} catch (error) {
		report.setup = safeError(error);
		report.outcome = 'failed';
		progress(`Setup failed: ${report.setup}`);
	} finally {
		if (lock !== undefined) {
			fs.closeSync(lock);
			try {
				fs.unlinkSync(path.resolve(__dirname, '../.integration-local.lock'));
			} catch (error) {
				if (error.code !== 'ENOENT') {
					report.cleanup = 'Could not remove local integration lock; inspect it before rerunning';
					report.outcome = 'failed';
				}
			}
		}
		report.finishedAt = new Date().toISOString();
		if (run) report.manifest = path.relative(path.resolve(__dirname, '..'), manifestPath(run));
		write(report);
		progress(`Final result: ${report.outcome}; ${JSON.stringify(report.summary || {})}`);
		progress('HTML report: integration-reports/latest.html');
	}
	return report;
}

if (require.main === module) {
	if (process.argv[2] === 'report') reports.write(JSON.parse(fs.readFileSync(path.join(reports.directory, 'latest.json'), 'utf8')));
	else if (process.argv[2] === 'open') {
		Promise.resolve().then(() => reports.open()).catch((error) => {
			console.error(error.message);
			process.exitCode = 1;
		});
	} else {
		execute({
			progress: console.log,
			...(process.argv[2] === 'reversals' ? { tests: scenarios.filter((scenario) => scenario.reversal) } : {}),
		})
			.then((report) => { process.exitCode = report.outcome === 'failed' ? 1 : 0; })
			.catch(() => { console.error('Integration suite failed; the report contains safe diagnostics.'); process.exitCode = 1; });
	}
}

module.exports = {
	DependencyUnavailable, execute, knownDependencyFailure, request, safeError, unwrap,
};
