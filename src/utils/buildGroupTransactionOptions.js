import Constants from './constants';
import generatePaymentItems from './generatePaymentItems';

export default (groupTransactionData) => {
	const {
		RedirectUrl,
		TotalAmount,
		PenaltyType,
		PenaltyGroupId,
		Penalties,
		VehicleRegistration,
	} = groupTransactionData.paymentObject;

	switch (groupTransactionData.auth.scope) {
	case 'CARD':
		return {
			redirect_uri: RedirectUrl,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: PenaltyGroupId,
			scope: groupTransactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, VehicleRegistration, Constants),
		};
	case 'CNP':
		return {
			redirect_uri: RedirectUrl,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: PenaltyGroupId,
			scope: groupTransactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, VehicleRegistration, Constants),
		};
	case 'CASH':
		return {
			slip_number: groupTransactionData.paymentObject.SlipNumber,
			batch_number: groupTransactionData.paymentObject.BatchNumber,
			receipt_date: groupTransactionData.paymentObject.ReceiptDate,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: PenaltyGroupId,
			scope: groupTransactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, VehicleRegistration, Constants),
		};
	case 'CHEQUE':
		return {
			slip_number: groupTransactionData.paymentObject.SlipNumber,
			batch_number: groupTransactionData.paymentObject.BatchNumber,
			receipt_date: groupTransactionData.paymentObject.ReceiptDate,
			cheque_date: groupTransactionData.paymentObject.ChequeDate,
			cheque_number: groupTransactionData.paymentObject.ChequeNumber,
			name_on_cheque: groupTransactionData.paymentObject.NameOnCheque,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: PenaltyGroupId,
			scope: groupTransactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, VehicleRegistration, Constants),
		};
	case 'POSTAL_ORDER':
		return {
			slip_number: groupTransactionData.paymentObject.SlipNumber,
			batch_number: groupTransactionData.paymentObject.BatchNumber,
			receipt_date: groupTransactionData.paymentObject.ReceiptDate,
			postal_order_number: groupTransactionData.paymentObject.PostalOrderNumber,
			total_amount: TotalAmount.toFixed(2),
			customer_reference: PenaltyGroupId,
			scope: groupTransactionData.auth.scope,
			country_code: 'GB',
			customer_manager_name: Constants.customerManagerName,
			customer_name: Constants.customerName,
			customer_address: Constants.customerAddress,
			payment_data: generatePaymentItems(Penalties, PenaltyType, VehicleRegistration, Constants),
		};
	default:
		return null;
	}
};
