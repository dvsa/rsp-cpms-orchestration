import Constants from './constants';
import generatePaymentItems from './generatePaymentItems';

export default (groupTransactionData) => {
	const {
		RedirectUrl,
		TotalAmount,
		PenaltyType,
		PenaltyGroupId,
		Penalties,
	} = groupTransactionData.paymentObject;

	switch (groupTransactionData.auth.scope) {
	case 'CARD':
		return {
			redirect_uri: RedirectUrl,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: `${PenaltyGroupId}_${PenaltyType}`,
			scope: groupTransactionData.auth.scope,
			country_code: 'gb',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, Constants),
		};
	case 'CNP':
		return {
			redirect_uri: RedirectUrl,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: `${PenaltyGroupId}_${PenaltyType}`,
			scope: groupTransactionData.auth.scope,
			country_code: 'gb',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, Constants),
		};
	case 'CASH':
		return {
			slip_number: groupTransactionData.paymentObject.SlipNumber,
			batch_number: groupTransactionData.paymentObject.BatchNumber,
			receipt_date: groupTransactionData.paymentObject.ReceiptDate,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: `${PenaltyGroupId}_${PenaltyType}`,
			scope: groupTransactionData.auth.scope,
			country_code: 'gb',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, Constants),
		};
	case 'CHEQUE':
		return {
			slip_number: groupTransactionData.paymentObject.SlipNumber,
			batch_number: groupTransactionData.paymentObject.BatchNumber,
			receipt_date: groupTransactionData.paymentObject.ReceiptDate,
			cheque_date: groupTransactionData.paymentObject.cheque_date,
			cheque_number: groupTransactionData.paymentObject.cheque_number,
			name_on_cheque: groupTransactionData.paymentObject.name_on_cheque,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: `${PenaltyGroupId}_${PenaltyType}`,
			scope: groupTransactionData.auth.scope,
			country_code: 'gb',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, Constants),
		};
	case 'POSTAL_ORDER':
		return {
			slip_number: groupTransactionData.paymentObject.SlipNumber,
			batch_number: groupTransactionData.paymentObject.BatchNumber,
			receipt_date: groupTransactionData.paymentObject.ReceiptDate,
			postal_order_number: groupTransactionData.paymentObject.postal_order_number,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: `${PenaltyGroupId}_${PenaltyType}`,
			scope: groupTransactionData.auth.scope,
			country_code: 'gb',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, Constants),
		};
	default:
		return null;
	}
};
