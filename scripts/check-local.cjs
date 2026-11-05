const assert = require('node:assert/strict');
const http = require('node:http');

// JSON null fails in PaymentService before CPMS authentication or SQS access.
const body = JSON.stringify({ body: 'null' });
const request = http.request({
	hostname: '127.0.0.1',
	port: process.env.LOCAL_LAMBDA_PORT || 3002,
	path: '/2015-03-31/functions/rsp-cpms-orchestration-dev-cardPayment/invocations',
	method: 'POST',
	headers: {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(body),
	},
}, (response) => {
	let result = '';
	response.setEncoding('utf8');
	response.on('data', (chunk) => { result += chunk; });
	response.on('end', () => {
		try {
			const error = JSON.parse(result);
			assert.equal(response.statusCode, 200);
			assert.equal(response.headers['x-amz-function-error'], 'Unhandled');
			assert.match(error.errorMessage, /Cannot read properties of null.*penalty_type/);
			assert.match(JSON.stringify(error.trace), /src\/services\/paymentService\.js/);
			assert.doesNotMatch(result, /unsupported runtime/i);
			console.log('PASS: Node20 Card Payment handler loaded and reached PaymentService; expected pre-auth null error, no CPMS/SQS calls.');
		} catch {
			console.error('FAIL: unexpected local invocation result. Check the local runtime and handler configuration.');
			process.exitCode = 1;
		}
	});
	response.on('error', () => {
		console.error('FAIL: local invocation response interrupted.');
		process.exitCode = 1;
	});
});
request.setTimeout(15000, () => request.destroy(new Error('Local invocation timeout')));
request.on('error', () => {
	console.error('FAIL: cannot invoke the local Lambda listener. Start npm start first.');
	process.exitCode = 1;
});
request.end(body);
