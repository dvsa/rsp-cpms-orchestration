
const constants = {
	cpmsBaseUrl: process.env.URL,
	cpmsCheckingBaseUrl: process.env.CPMS_CHECKING_URL,
	aws_region: process.env.aws_region,
	statemachine_arn: process.env.statemachine_arn,
	cardHolderPresentAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'CARD',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	cardHolderNotPresentAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'CNP',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	chequePaymentAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'CHEQUE',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	cashPaymentAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'CASH',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	postalOrderAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'POSTAL_ORDER',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	reportingAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'REPORT',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	chargebackAuthBody: {
		client_secret: process.env.SECRET,
		scope: 'CHARGE_BACK',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	reversalAuthBody: {
		client_secret: process.env.SECRET,
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
	userId: process.env.USERID,
};

export default constants;

