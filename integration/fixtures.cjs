const { randomBytes, randomUUID } = require('node:crypto');

const amountFor = (index) => Number((1.37 + index * 0.11).toFixed(2));
const numericReference = () => `990099${randomBytes(3).readUIntBE(0, 3).toString().padStart(6, '0')}`;
const paymentCode = () => randomBytes(8).toString('hex');
const today = () => new Date().toISOString().slice(0, 10);

function createRun(redirectUrl) {
	const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`;
	const now = today();
	const individualMethods = [
		'cardPayment',
		'cardNotPresentPayment',
		'cashPayment',
		'chequePayment',
		'postalOrderPayment',
	];
	const individual = Object.fromEntries(individualMethods.map((method, index) => {
		const reference = numericReference();
		const amount = amountFor(index);
		const payload = {
			penalty_type: 'FPN',
			redirect_url: redirectUrl,
			vehicle_reg: 'RSPINT',
			penalty_id: `${reference}_FPN`,
			payment_code: paymentCode(),
			penalty_amount: amount,
			penalty_reference: reference,
		};
		if (method === 'cashPayment' || method === 'chequePayment' || method === 'postalOrderPayment') {
			Object.assign(payload, {
				slip_number: `INT${randomBytes(3).toString('hex')}`,
				batch_number: `INT${randomBytes(3).toString('hex')}`,
				receipt_date: now,
			});
		}
		if (method === 'chequePayment') {
			Object.assign(payload, {
				cheque_date: now,
				cheque_number: `${randomBytes(4).readUInt32BE(0)}`,
				name_on_cheque: 'RSP Integration Fixture',
			});
		}
		if (method === 'postalOrderPayment') {
			payload.postal_order_number = `INT${randomBytes(3).toString('hex')}`;
		}
		return [method, {
			method,
			customerReference: payload.payment_code,
			penaltyReference: reference,
			amount,
			payload,
		}];
	}));

	const groups = Object.fromEntries(['CARD', 'CNP', 'CASH', 'CHEQUE', 'POSTAL_ORDER'].map((method) => {
		const first = { PenaltyReference: numericReference(), PenaltyAmount: 4, VehicleRegistration: 'RSPINT' };
		const second = { PenaltyReference: numericReference(), PenaltyAmount: 6, VehicleRegistration: 'RSPINT' };
		const groupId = `RSPINT-${runId}-${method}`;
		const payload = {
			PaymentMethod: method,
			RedirectUrl: redirectUrl,
			PenaltyGroupId: groupId,
			VehicleRegistration: 'RSPINT',
			PenaltyType: 'FPN',
			TotalAmount: 10,
			Penalties: [first, second],
		};
		if (method === 'CASH' || method === 'CHEQUE' || method === 'POSTAL_ORDER') {
			Object.assign(payload, {
				SlipNumber: `INT${randomBytes(3).toString('hex')}`,
				BatchNumber: `INT${randomBytes(3).toString('hex')}`,
				ReceiptDate: now,
			});
		}
		if (method === 'CHEQUE') {
			Object.assign(payload, {
				ChequeDate: now,
				ChequeNumber: `${randomBytes(4).readUInt32BE(0)}`,
				NameOnCheque: 'RSP Integration Fixture',
			});
		}
		if (method === 'POSTAL_ORDER') payload.PostalOrderNumber = `INT${randomBytes(3).toString('hex')}`;
		return [method, {
			method,
			customerReference: groupId,
			amount: 10,
			members: [first, second].map((member) => ({
				reference: `${member.PenaltyReference}_FPN`,
				amount: member.PenaltyAmount,
			})),
			payload,
		}];
	}));

	return {
		runId,
		startedAt: new Date().toISOString(),
		individual,
		groups,
		attempts: [],
		reportReference: undefined,
	};
}

module.exports = { createRun };
