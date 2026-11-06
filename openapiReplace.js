const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lambdas } = require('./lambdas.json');

const file = path.resolve(__dirname, 'build/openapi.json');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.match(document.openapi, /^3\./);
assert.equal(Object.keys(document.paths).length, lambdas.length);
for (const name of lambdas) {
	const operation = document.paths[`/${name}`].post;
	assert.ok(operation.responses['200'], `${name}: success response must be documented`);
	assert.ok(operation.responses['400'], `${name}: error response must be documented`);
	if (operation.requestBody && Object.keys(operation.requestBody).length === 0) {
		delete operation.requestBody;
	}
}
fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Validated OpenAPI inventory and response definitions for ${lambdas.length} POST routes.`);
