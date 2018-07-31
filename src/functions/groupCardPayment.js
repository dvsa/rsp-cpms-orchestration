import GroupPaymentService from '../services/groupPaymentService';

export default (event, context, callback) => {
	console.log(JSON.stringify(event, null, 2));
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	console.log(paymentObject);

	// extract needed info from penalty doc
	GroupPaymentService.cardGroupPayment(paymentObject, callback);
};
