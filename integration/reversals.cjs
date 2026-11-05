const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { verifyReport } = require('./assertions.cjs');

const directory = path.resolve(__dirname, '../integration-state');
const purpose = 'synthetic CPMS integration references; external transactions are not auto-deleted';

function privateFile(name) {
	assert.ok(
		typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(name),
		'Use a JSON filename within ignored integration-state, not an external path',
	);
	const file = path.join(directory, name);
	assert.ok(!fs.lstatSync(file).isSymbolicLink(), 'Fixture files must not be symbolic links');
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fixture(method, env) {
	const prefix = `INTEGRATION_${method}_REVERSAL`;
	assert.equal(
		env[`${prefix}_APPROVED`],
		'yes',
		`Set ${prefix}_APPROVED=yes only after independently reconciling this owned synthetic non-production fixture`,
	);
	for (const field of ['MANIFEST', 'RECEIPT_REFERENCE', 'CUSTOMER_REFERENCE', 'PENALTY_TYPE', 'EXPECTED_AMOUNT', 'PROOF']) {
		assert.ok(env[`${prefix}_${field}`], `Set ${prefix}_${field} in private .env; see README reversal preparation`);
	}
	const item = {
		receiptReference: env[`${prefix}_RECEIPT_REFERENCE`],
		customerReference: env[`${prefix}_CUSTOMER_REFERENCE`],
		penaltyType: env[`${prefix}_PENALTY_TYPE`],
		amount: Number(env[`${prefix}_EXPECTED_AMOUNT`]),
	};
	assert.ok(
		item.penaltyType === 'FPN' && Number.isFinite(item.amount) && item.amount > 0,
		'Reversal fixture must use FPN and a positive independently verified amount',
	);
	const manifest = privateFile(env[`${prefix}_MANIFEST`]);
	assert.equal(manifest.purpose, purpose, 'Reversal requires an owned synthetic integration manifest');
	const creation = manifest.attempts.find((attempt) => attempt.kind === (method === 'CARD' ? 'cardPayment' : 'chequePayment')
		&& attempt.status === 'response-received'
		&& attempt.httpStatus === 200
		&& attempt.customerReference === item.customerReference
		&& attempt.receiptReference === item.receiptReference
		&& attempt.amount === item.amount
		&& /^990099\d+(_FPN)?$/.test(attempt.penaltyReference));
	assert.ok(creation, 'Receipt, customer, amount and payment method must match a successful suite-owned synthetic creation');
	const proof = privateFile(env[`${prefix}_PROOF`]);
	assert.ok(
		proof.environment === 'non-production'
		&& proof.independentlyVerified === true
		&& proof.receiptReference === item.receiptReference
		&& proof.customerReference === item.customerReference
		&& proof.penaltyType === item.penaltyType
		&& proof.amount === item.amount
		&& Number.isFinite(Date.parse(proof.verifiedAt)),
		'Reversal proof must independently verify non-production, exact receipt/customer/type/amount and verification time',
	);
	assert.equal(
		String(proof.cpmsCode),
		method === 'CARD' ? '801' : '000',
		method === 'CARD' ? 'Complete the approved sandbox checkout and independently verify CPMS code 801 first'
			: 'Independently verify the owned cheque was accepted by CPMS with code 000 first',
	);
	assert.ok(Array.isArray(proof.reportRows), 'Include independently downloaded CPMS reportRows in private proof');
	verifyReport(proof.reportRows, [item]);
	assert.ok(proof.reportRows.some((row) => row['customer reference'] === item.customerReference
		&& row['receipt reference'] === item.receiptReference
		&& row['payment type'] === method), 'CPMS report must independently verify the expected payment method');
	if (method === 'CHEQUE') {
		assert.equal(
			proof.rejection218Resolved,
			true,
			'Resolve the earlier CPMS 218 rejection using its full message/CPMS support before approving another cheque reversal',
		);
	}
	for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json'))) {
		const previous = privateFile(file);
		assert.ok(
			!(previous.attempts || []).some((attempt) => /reversal$/.test(attempt.kind)
			&& (attempt.receiptReference === item.receiptReference
				|| attempt.customerReference === item.customerReference)),
			'A reversal was already attempted for this fixture; reconcile CPMS and choose a different owned fixture, never blindly retry',
		);
	}
	return item;
}

function preflight(method, env) {
	try {
		fixture(method, env);
		return undefined;
	} catch (error) {
		return error instanceof assert.AssertionError ? error.message.split('\n')[0]
			: 'Reversal private manifest/proof is missing or unreadable; check ignored integration-state files';
	}
}

module.exports = { fixture, preflight };
