import GroupPaymentService from '../services/groupPaymentService';

export default (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return GroupPaymentService.groupPayment(paymentObject);
};
