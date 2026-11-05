const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

class LocalStartupError extends Error {}

function run(command, args, options = {}) {
	const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
	child.on('error', () => {
		console.error('Local startup failed: could not launch the child process.');
		process.exitCode = 1;
	});
	child.on('exit', (code, signal) => {
		process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
	});
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => child.kill(signal));
	}
}

function offline() {
	const build = path.join(root, '.aws-sam/build');
	const config = fs.readFileSync(path.join(build, 'serverless.yml'), 'utf8');
	// The launcher already loaded .env; never copy its secrets into build artifacts.
	fs.writeFileSync(path.join(build, 'serverless.local.yml'),
		config.replace(/^\s*- serverless-dotenv-plugin\s*$/m, ''));
	run(process.execPath, [
		path.join(root, 'node_modules/serverless/bin/serverless.js'),
		'offline', 'start', '--config', 'serverless.local.yml', '--noAuth',
		'--localEnvironment', '--host', '127.0.0.1',
		'--httpPort', process.env.LOCAL_HTTP_PORT || '3000',
		'--lambdaPort', process.env.LOCAL_LAMBDA_PORT || '3002',
	], { cwd: build });
}

function start() {
	if (process.versions.node.split('.')[0] !== '20') {
		throw new LocalStartupError('Node.js 20 is required. Run nvm use, then retry npm start.');
	}
	const loaded = require('dotenv').config({ path: path.join(root, '.env') });
	if (loaded.error) {
		throw new LocalStartupError('Cannot load .env. Create the private local configuration described in README.md.');
	}
	const profile = process.env.AWS_PROFILE || 'rsp-dev';
	let credentials;
	try {
		credentials = JSON.parse(execFileSync('aws', [
			'configure', 'export-credentials', '--profile', profile, '--format', 'process',
		], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
	} catch {
		throw new LocalStartupError('Cannot load AWS credentials. Authenticate your AWS_PROFILE using AWS CLI v2, then retry npm start.');
	}
	if (!credentials.AccessKeyId || !credentials.SecretAccessKey
		|| (credentials.Expiration && !(Date.parse(credentials.Expiration) > Date.now()))) {
		throw new LocalStartupError('AWS CLI returned incomplete or expired credentials. Authenticate again, then retry npm start.');
	}
	const env = {
		...process.env,
		AWS_PROFILE: profile,
		AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
		AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
		// Older Serverless dependencies expect require(ESM) to remain disabled.
		NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-experimental-require-module`.trim(),
	};
	if (credentials.SessionToken) env.AWS_SESSION_TOKEN = credentials.SessionToken;
	else delete env.AWS_SESSION_TOKEN;
	console.log('Starting locally on Node.js 20 with AWS CLI credentials. Restart after temporary credentials expire.');
	run('npm', ['run', 'start:local'], { env });
}

if (require.main === module) {
	try {
		if (process.argv.includes('--offline')) offline();
		else start();
	} catch (error) {
		console.error(error instanceof LocalStartupError
			? `Local startup failed: ${error.message}`
			: 'Local startup failed. Check private .env configuration and build files.');
		process.exitCode = 1;
	}
}

module.exports = { start, offline };
