
const constants = {
	cpmsBaseUrl: process.env.URL,
	cardHolderPresentAuthBody: {
		scope: 'CARD',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	cardHolderNotPresentAuthBody: {
		scope: 'CNP',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	chequePaymentAuthBody: {
		scope: 'CHEQUE',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	cashPaymentAuthBody: {
		scope: 'CASH',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	postalOrderAuthBody: {
		scope: 'POSTAL_ORDER',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	reportingAuthBody: {
		scope: 'REPORT',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	chargebackAuthBody: {
		scope: 'CHARGE_BACK',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	reversalAuthBody: {
		scope: 'CHEQUE_RD',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	receiverAddress: {
		line_1: 'DVSA Fixed Penalty Office',
		line_2: 'Ellipse',
		line_3: 'Padley Road',
		line_4: '',
		city: 'Swansea',
		postcode: 'SA18AN',
	},
	customerName: process.env.CUSTOMER_NAME,
	customerManagerName: process.env.CUSTOMER_MANAGER_NAME,
	customerAddress: {
		line_1: process.env.CUSTOMER_ADDRESS_LINE1,
		line_2: process.env.CUSTOMER_ADDRESS_LINE2,
		line_3: process.env.CUSTOMER_ADDRESS_LINE3,
		line_4: process.env.CUSTOMER_ADDRESS_LINE4,
		city: process.env.CUSTOMER_ADDRESS_CITY,
		postcode: process.env.CUSTOMER_ADDRESS_POSTCODE,
	},
	fixedPenaltyClientId: process.env.FIXED_PENALTY_SCHEME,
	immobilisationClientId: process.env.IMMOBILISATION_SCHEME,
	courtDepositClientId: process.env.COURT_DEPOSIT_SCHEME,
	fixedPenaltySecret: process.env.FIXED_PENALTY_SECRET,
	immobilisationSecret: process.env.IMMOBILISATION_SECRET,
	courtDepositSecret: process.env.COURT_DEPOSIT_SECRET,
	userId: process.env.USERID,
};

export default constants;

