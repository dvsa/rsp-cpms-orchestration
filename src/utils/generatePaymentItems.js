export default (penalties, penaltyType, constants) => {
	let productDescription = '';
	switch (penaltyType) {
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
	return penalties.map((penalty, index) => {
		return {
			line_identifier: (index + 1).toString(),
			amount: penalty.PenaltyAmount.toFixed(2),
			net_amount: penalty.PenaltyAmount.toFixed(2),
			tax_amount: Number(0.00).toFixed(2),
			allocated_amount: penalty.PenaltyAmount.toFixed(2),
			tax_code: 'O',
			tax_rate: '0',
			sales_reference: `${penalty.PenaltyReference}_${penalty.VehicleRegistration}`,
			product_reference: 'RoadSidePayments',
			product_description: productDescription,
			invoice_date: new Date(Date.now()).toISOString().split('T')[0],
			receiver_reference: `${penalty.PenaltyReference}_${penaltyType}`,
			receiver_name: 'DVSA RSP',
			receiver_address: constants.receiverAddress,
			rule_start_date: new Date(Date.now()).toISOString().split('T')[0],
			deferment_period: '1',
			sales_person_reference: 'DVSA RSP',
			user_id: constants.userId,
		};
	});
};
