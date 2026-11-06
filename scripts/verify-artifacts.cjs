const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { Module } = require('node:module');
const path = require('node:path');
const { lambdas } = require('../lambdas.json');

Object.assign(process.env, {
	AWS_ACCESS_KEY_ID: 'artifact-test',
	AWS_SECRET_ACCESS_KEY: 'artifact-test',
	AWS_EC2_METADATA_DISABLED: 'true',
	AWS_REGION: 'eu-west-1',
	REGION: 'eu-west-1',
	USE_SECRETS_MANAGER: 'false',
});
delete process.env.AWS_PROFILE;
delete process.env.AWS_SESSION_TOKEN;
require('node:http').request = () => { throw new Error('Artifact verification forbids network access'); };
require('node:https').request = () => { throw new Error('Artifact verification forbids network access'); };

for (const name of lambdas) {
	const archive = path.resolve(__dirname, `../dist/${name}.zip`);
	execFileSync('unzip', ['-tq', archive], { stdio: 'pipe' });
	const files = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
	assert.deepEqual(files.sort(), ['app.js', 'app.js.LICENSE.txt', 'handler.js'],
		`${name}: bundle, licenses and legacy handler entry point only`);
	const source = execFileSync('unzip', ['-p', archive, 'app.js'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
	const bundle = new Module(path.join(path.dirname(archive), `${name}.cjs`));
	bundle.filename = bundle.id;
	// No node_modules resolution: a Lambda must load solely from its archive.
	bundle.paths = [];
	bundle._compile(source, bundle.filename);
	assert.equal(typeof bundle.exports.handler, 'function', `${name}: handler export`);
	assert.equal(bundle.exports.handler, bundle.exports[name], `${name}: named export alias`);
	const legacySource = execFileSync('unzip', ['-p', archive, 'handler.js'], { encoding: 'utf8' });
	const legacy = new Module(path.join(path.dirname(archive), `${name}-legacy.cjs`));
	legacy.require = (request) => {
		assert.equal(request, './app.js', `${name}: legacy entry must resolve its own bundled app`);
		return bundle.exports;
	};
	legacy._compile(legacySource, legacy.id);
	assert.equal(legacy.exports, bundle.exports, `${name}: preserve legacy handler.<name> and handler.handler`);
	console.log(`PASS ${name}: closed ZIP, standalone load, app/legacy handler and named export`);
}
console.log(`Verified ${lambdas.length} deployment archives without invoking handlers.`);
