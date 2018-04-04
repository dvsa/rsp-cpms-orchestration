
const constants = {
	cpmsBaseUrl: process.env.URL,
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
	fixedPenaltyClientId: process.env.FIXED_PENALTY_SCHEME,
	immobilisationClientId: process.env.IMMOBILISATION_SCHEME,
	courtDepositClientId: process.env.COURT_DEPOSIT_SCHEME,
	fixedPenaltyDocType: process.env.FIXED_PENALTY_DOCTYPE,
	immobilisationDocType: process.env.IMMOBILISATION_DOCTYPE,
	courtDepositDocType: process.env.COURT_DEPOSIT_DOCTYPE,
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
	countryCode: process.env.COUNTRY_CODE,
	salesReference: process.env.SALES_REFERENCE,
	productReference: process.env.PRODUCT_REFERENCE,
	productDescription: process.env.PRODUCT_DESCRIPTION,
	receiverName: process.env.RECEIVER_NAME,
	receiverReference: process.env.RECEIVER_REFERENCE,
	receiverAddress: {
		line_1: process.env.RECEIVER_ADDRESS_LINE1,
		line_2: process.env.RECEIVER_ADDRESS_LINE2,
		line_3: process.env.RECEIVER_ADDRESS_LINE3,
		line_4: process.env.RECEIVER_ADDRESS_LINE4,
		city: process.env.RECEIVER_ADDRESS_CITY,
		postcode: process.env.RECEIVER_ADDRESS_POSTCODE,
	},
	userId: process.env.USERID,
};

export default constants;

