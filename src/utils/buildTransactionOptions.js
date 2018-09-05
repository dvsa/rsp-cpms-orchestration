import Constants from './constants';

export default (transactionData) => {
	console.log(transactionData);
	let productDescription = '';
	switch (transactionData.paymentObject.penalty_type) {
	case 'FPN':
		productDescription = 'Fixed_Penalties';
		break;
	case 'IM':
		productDescription = 'Immobilisation';
		break;
	case 'CDN':
		productDescription = 'Court_Deposits';
		break;
	default:
		productDescription = '';
		break;
	}

	let vehicleReg = transactionData.paymentObject.vehicle_reg;
	if (transactionData.paymentObject.vehicle_reg === false) {
		vehicleReg = 'OFFLINE';
	}

	switch (transactionData.auth.scope) {
	case 'CARD':
		return {
			redirect_uri: transactionData.redirectUrl,
			total_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
			customer_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
			scope: transactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: [{
				line_identifier: '1',
				amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				net_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_amount: Number(0.00).toFixed(2),
				allocated_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_code: 'O',
				tax_rate: '0',
				sales_reference: vehicleReg,
				product_reference: 'RoadSidePayments',
				product_description: productDescription,
				invoice_date: new Date(Date.now()).toISOString().split('T')[0],
				receiver_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
				receiver_name: 'DVSA RSP',
				receiver_address: Constants.receiverAddress,
				rule_start_date: new Date(Date.now()).toISOString().split('T')[0],
				deferment_period: '1',
				sales_person_reference: 'DVSA RSP',
				user_id: Constants.userId,
			}],
		};
	case 'CNP':
		return {
			redirect_uri: transactionData.redirectUrl,
			total_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
			customer_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
			scope: transactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: [{
				line_identifier: '1',
				amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				net_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_amount: Number(0.00).toFixed(2),
				allocated_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_code: 'O',
				tax_rate: '0',
				sales_reference: vehicleReg,
				product_reference: 'RoadSidePayments',
				product_description: productDescription,
				invoice_date: new Date(Date.now()).toISOString().split('T')[0],
				receiver_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
				receiver_name: 'DVSA RSP',
				receiver_address: Constants.receiverAddress,
				rule_start_date: new Date(Date.now()).toISOString().split('T')[0],
				deferment_period: '1',
				sales_person_reference: 'DVSA RSP',
				user_id: Constants.userId,
			}],
		};
	case 'CASH':
		return {
			slip_number: transactionData.paymentObject.slip_number,
			batch_number: transactionData.paymentObject.batch_number,
			receipt_date: transactionData.paymentObject.receipt_date,
			redirect_uri: transactionData.redirectUrl,
			total_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
			customer_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
			scope: transactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: [{
				line_identifier: '1',
				amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				net_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_amount: Number(0.00).toFixed(2),
				allocated_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_code: 'O',
				tax_rate: '0',
				sales_reference: vehicleReg,
				product_reference: 'RoadSidePayments',
				product_description: productDescription,
				invoice_date: new Date(Date.now()).toISOString().split('T')[0],
				receiver_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
				receiver_name: 'DVSA RSP',
				receiver_address: Constants.receiverAddress,
				rule_start_date: new Date(Date.now()).toISOString().split('T')[0],
				deferment_period: '1',
				sales_person_reference: 'DVSA RSP',
				user_id: Constants.userId,
			}],
		};
	case 'CHEQUE':
		return {
			slip_number: transactionData.paymentObject.slip_number,
			batch_number: transactionData.paymentObject.batch_number,
			receipt_date: transactionData.paymentObject.receipt_date,
			cheque_date: transactionData.paymentObject.cheque_date,
			cheque_number: transactionData.paymentObject.cheque_number,
			name_on_cheque: transactionData.paymentObject.name_on_cheque,
			redirect_uri: transactionData.redirectUrl,
			total_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
			customer_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
			scope: transactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: [{
				line_identifier: '1',
				amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				net_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_amount: Number(0.00).toFixed(2),
				allocated_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_code: 'O',
				tax_rate: '0',
				sales_reference: vehicleReg,
				product_reference: 'RoadSidePayments',
				product_description: productDescription,
				invoice_date: new Date(Date.now()).toISOString().split('T')[0],
				receiver_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
				receiver_name: 'DVSA RSP',
				receiver_address: Constants.receiverAddress,
				rule_start_date: new Date(Date.now()).toISOString().split('T')[0],
				deferment_period: '1',
				sales_person_reference: 'DVSA RSP',
				user_id: Constants.userId,
			}],
		};
	case 'POSTAL_ORDER':
		return {
			slip_number: transactionData.paymentObject.slip_number,
			batch_number: transactionData.paymentObject.batch_number,
			receipt_date: transactionData.paymentObject.receipt_date,
			postal_order_number: transactionData.paymentObject.postal_order_number,
			redirect_uri: transactionData.redirectUrl,
			total_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
			customer_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
			scope: transactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: [{
				line_identifier: '1',
				amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				net_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_amount: Number(0.00).toFixed(2),
				allocated_amount: transactionData.paymentObject.penalty_amount.toFixed(2),
				tax_code: 'O',
				tax_rate: '0',
				sales_reference: vehicleReg,
				product_reference: 'RoadSidePayments',
				product_description: productDescription,
				invoice_date: new Date(Date.now()).toISOString().split('T')[0],
				receiver_reference: `${transactionData.paymentObject.penalty_reference}_${transactionData.paymentObject.penalty_type}`,
				receiver_name: 'DVSA RSP',
				receiver_address: Constants.receiverAddress,
				rule_start_date: new Date(Date.now()).toISOString().split('T')[0],
				deferment_period: '1',
				sales_person_reference: 'DVSA RSP',
				user_id: Constants.userId,
			}],
		};
	default:
		return null;
	}
};
