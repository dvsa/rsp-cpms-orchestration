import supertest from 'supertest';
import expect from 'expect';
import dotenv from 'dotenv';

dotenv.config();

const url = 'http://localhost:3000';
const request = supertest(url);
const redirectUri = process.env.REDIRECT_URI;

function makeTestCardPayment() {
	const payload = {
		penalty_type: 'FPN',
		redirect_url: redirectUri,
		vehicle_reg: 'TESTREG',
		penalty_id: '123456789011_FPN',
		payment_code: '5039d580cd0f68c0',
		penalty_amount: 10,
		penalty_reference: '123456789011',
	};
	return request
		.post('/cardPayment')
		.set('Content-Type', 'application/json')
		.send(payload)
		.expect(200);
}

function makeTestChequePayment() {
	const payload = {
		penalty_type: 'FPN',
		redirect_url: redirectUri,
		vehicle_reg: 'TESTREG',
		penalty_id: '23456789011_FPN',
		payment_code: '5039d580cd0f68c0',
		penalty_amount: 10,
		penalty_reference: '23456789011',
		slip_number: '1234',
		batch_number: '123',
		receipt_date: '2019-04-17',
		cheque_date: '2019-04-17',
		cheque_number: '1234',
		name_on_cheque: 'DVSA',
	};
	return request
		.post('/chequePayment')
		.set('Content-Type', 'application/json')
		.send(payload)
		.expect(200);
}

describe('Payment service', () => {
	context('POST /cardPayment', () => {
		context('when a correct request is sent', () => {
			it('responds with a receipt code of the payment', async () => {
				const res = await makeTestCardPayment();

				expect(res.body.receipt_reference).toContain('GFPD-');
			});
		});
	});

	context('POST /cardNotPresentPayment', () => {
		context('when a correct request is sent', () => {
			it('responds with a receipt code of the payment', async () => {
				const payload = {
					penalty_type: 'IM',
					redirect_url: redirectUri,
					vehicle_reg: 'TESTREG',
					penalty_id: '123450006789_IM',
					payment_code: '5039d580cd0f68c0',
					penalty_amount: 10,
					penalty_reference: '12345-0-6789-IM',
				};
				const res = await request
					.post('/cardNotPresentPayment')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);

				expect(res.body.receipt_reference).toContain('ECMS-');
			});
		});
	});

	context('POST /cashPayment', () => {
		context('when a correct request is sent', () => {
			it('responds with a receipt code of the payment', async () => {
				const payload = {
					penalty_type: 'CDN',
					redirect_url: redirectUri,
					vehicle_reg: 'TESTREG',
					penalty_id: '23456789011_CDN',
					payment_code: '5039d580cd0f68c0',
					penalty_amount: 10,
					penalty_reference: '23456789011',
					slip_number: '1234',
					batch_number: '1234',
					receipt_date: '2019-04-17',
				};
				const res = await request
					.post('/cashPayment')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);

				expect(res.body.receipt_reference).toContain('COUR-');
			});
		});
	});

	context('POST /chequePayment', () => {
		context('when a correct request is sent', () => {
			it('responds with a receipt code of the payment', async () => {
				const res = await makeTestChequePayment();

				expect(res.body.receipt_reference).toContain('GFPD-');
			});
		});
	});

	context('POST /postalOrderPayment', () => {
		context('when a correct request is sent', () => {
			it('responds with a receipt code of the payment', async () => {
				const payload = {
					penalty_type: 'FPN',
					redirect_url: redirectUri,
					vehicle_reg: 'TESTREG',
					payment_code: '5039d580cd0f68c0',
					penalty_amount: 10,
					penalty_reference: '23456789011',
					slip_number: '1234',
					batch_number: '123',
					receipt_date: '2019-04-17',
					postal_order_number: '1234',
				};
				const res = await request
					.post('/postalOrderPayment')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);

				expect(res.body.receipt_reference).toContain('GFPD-');
			});
		});
	});

	context('POST /confirm (confirmPayment)', () => {
		context('when a correct request is sent', () => {
			it('responds with a 200 response', async () => {
				const cardPayment = await makeTestCardPayment();
				const receiptReference = cardPayment.body.receipt_reference;

				const payload = {
					penalty_type: 'FPN',
					receipt_reference: receiptReference,
				};

				await request
					.post('/confirm')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);
			});
		});
		context('when a receipt reference does not already exist', () => {
			it('responds with an error', async () => {
				const payload = {
					penalty_type: 'FPN',
					receipt_reference: 'ECMS-12345-67890',
				};

				await request
					.post('/confirm')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(400);
			});
		});
	});

	context('POST /reverseCard', () => {
		context('when a correct request is sent', () => {
			it('responds with a 200 response', async () => {
				const cardPayment = await makeTestCardPayment();
				const receiptReference = cardPayment.body.receipt_reference;

				const payload = {
					penalty_type: 'FPN',
					receipt_reference: receiptReference,
				};

				await request
					.post('/reverseCard')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);
			});
		});
	});

	context('POST /reverseCheque', () => {
		context('when a correct request is sent', () => {
			it('responds with a 200 response', async () => {
				const cardPayment = await makeTestChequePayment();
				const receiptReference = cardPayment.body.receipt_reference;

				const payload = {
					penalty_type: 'FPN',
					receipt_reference: receiptReference,
				};

				await request
					.post('/reverseCheque')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);
			});
		});
	});
});
