const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const reversals = require('./reversals.cjs');

const SAFETY_FLAGS = [
	'INTEGRATION_CONFIRM_LOCAL',
	'INTEGRATION_CONFIRM_NONPROD',
	'INTEGRATION_ALLOW_PAYMENT_MUTATIONS',
	'INTEGRATION_ALLOW_SQS',
	'INTEGRATION_ALLOW_CONFIRMATION',
	'INTEGRATION_ALLOW_REPORT_GENERATION',
	'INTEGRATION_ALLOW_REVERSALS',
];

function load(env = process.env, root = path.resolve(__dirname, '..')) {
	const file = path.join(root, '.env');
	const fromFile = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file, 'utf8')) : {};
	return { ...fromFile, ...env };
}

function localUrl(env) {
	const port = String(env.LOCAL_HTTP_PORT || '3000');
	const url = new URL(env.INTEGRATION_BASE_URL || `http://127.0.0.1:${port}/dev`);
	const host = url.hostname.toLowerCase();
	if (url.protocol !== 'http:'
		|| !['127.0.0.1', 'localhost'].includes(host)
		|| url.port !== port
		|| url.pathname !== '/dev'
		|| url.search || url.hash || url.username || url.password) {
		throw new Error('Integration target must be plain HTTP on the configured loopback port with the /dev stage path');
	}
	return url.toString().replace(/\/$/, '');
}

function redirectUrl(env) {
	if (!env.INTEGRATION_REDIRECT_URL) throw new Error('Set INTEGRATION_REDIRECT_URL to the approved non-production payment return URL');
	let url;
	try { url = new URL(env.INTEGRATION_REDIRECT_URL); } catch { throw new Error('Invalid integration return URL'); }
	if (url.protocol !== 'https:'
		|| url.hostname !== 'nonprod.pay-roadside-fine.service.gov.uk'
		|| url.username || url.password || url.hash) {
		throw new Error('Integration return URL must use the approved non-production payment host');
	}
	return url.toString();
}

function configuration(env) {
	if (env.CI && !['false', '0', ''].includes(String(env.CI).toLowerCase())) {
		throw new Error('Integration tests must not run in CI');
	}
	if (env.INTEGRATION_CONFIRM_LOCAL !== 'yes') {
		throw new Error('Set INTEGRATION_CONFIRM_LOCAL=yes for an explicit manual loopback run');
	}
	return {
		baseUrl: localUrl(env),
		target: 'loopback HTTP /dev',
		port: String(env.LOCAL_HTTP_PORT || '3000'),
	};
}

function requirement(scenario, env) {
	if (scenario.unavailable) return scenario.unavailable;
	if (scenario.mutation) {
		if (env.INTEGRATION_CONFIRM_NONPROD !== 'yes') return 'Requires INTEGRATION_CONFIRM_NONPROD=yes for the private service CPMS configuration';
		if (env.INTEGRATION_ALLOW_PAYMENT_MUTATIONS !== 'yes') return 'Requires INTEGRATION_ALLOW_PAYMENT_MUTATIONS=yes';
		if (scenario.sqs && env.INTEGRATION_ALLOW_SQS !== 'yes') return 'Requires INTEGRATION_ALLOW_SQS=yes; this operation publishes to the configured CPMS checking queue';
		if (scenario.confirmation && env.INTEGRATION_ALLOW_CONFIRMATION !== 'yes') return 'Requires INTEGRATION_ALLOW_CONFIRMATION=yes';
		if (scenario.reversal && env.INTEGRATION_ALLOW_REVERSALS !== 'yes') return 'Requires INTEGRATION_ALLOW_REVERSALS=yes; reversal is a financial side effect';
		if (scenario.reversalMethod) return reversals.preflight(scenario.reversalMethod, env);
		if (!scenario.confirmation && !scenario.reversal) {
			try { redirectUrl(env); } catch (error) { return error.message; }
		}
	}
	if (scenario.reportGeneration) {
		if (env.INTEGRATION_CONFIRM_NONPROD !== 'yes') return 'Requires INTEGRATION_CONFIRM_NONPROD=yes';
		if (env.INTEGRATION_ALLOW_REPORT_GENERATION !== 'yes') return 'Requires INTEGRATION_ALLOW_REPORT_GENERATION=yes';
		if (!env.INTEGRATION_REPORT_CODE) return 'Set INTEGRATION_REPORT_CODE to an approved non-production report code';
	}
	return undefined;
}

module.exports = {
	SAFETY_FLAGS, configuration, load, localUrl, redirectUrl, requirement,
};
