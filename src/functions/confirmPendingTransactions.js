import PaymentService from '../services/paymentService';

const confirmPendingTransactions = (event, context, callback) => {
	console.log(JSON.stringify(event, null, 2));
	let { body } = event;
	if (typeof body === 'string') {
		body = JSON.parse(body);
	}

	const { penaltyType, receiptReferences } = body;

	PaymentService.confirmPendingTransactions(penaltyType, receiptReferences, callback);
};

export default confirmPendingTransactions;
