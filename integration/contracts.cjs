const inventory = [
	['cardPayment', 'POST /cardPayment', 'CPMS create + SQS message'],
	['cardNotPresentPayment', 'POST /cardNotPresentPayment', 'CPMS create'],
	['cashPayment', 'POST /cashPayment', 'CPMS create'],
	['chequePayment', 'POST /chequePayment', 'CPMS create'],
	['postalOrderPayment', 'POST /postalOrderPayment', 'CPMS create'],
	['groupPayment', 'POST /groupPayment', 'CPMS create + SQS message; five PaymentMethod variants'],
	['confirm', 'POST /confirm', 'CPMS confirmation lookup'],
	['reverseCard', 'POST /reverseCard', 'CPMS chargeback; requires a separately completed test-card checkout'],
	['reverseCheque', 'POST /reverseCheque', 'CPMS cheque reversal; financial side effect'],
	['listReports', 'POST /listReports', 'CPMS report metadata read'],
	['generateReport', 'POST /generateReport', 'CPMS report generation'],
	['checkReportStatus', 'POST /checkReportStatus', 'CPMS report status read'],
	['downloadReport', 'POST /downloadReport', 'CPMS report download/read-back'],
].map(([id, route, sideEffects]) => ({
	id,
	exportName: id,
	transport: 'HTTP',
	route,
	stagePrefix: '/dev',
	authorisation: 'aws_iam in deployment; disabled only by existing local --noAuth option',
	sideEffects,
}));

const scenarios = [
	{
		id: 'list-report-definitions',
		endpoint: 'listReports',
		validation: 'Assert HTTP response envelope and every report definition has a unique code and non-empty name.',
	},
	...['cardPayment', 'cardNotPresentPayment', 'cashPayment', 'chequePayment', 'postalOrderPayment']
		.map((method) => ({
			id: `create-${method}`,
			endpoint: method,
			validation: 'Create one uniquely owned synthetic transaction; assert receipt, payment URL/code where applicable, and independently reconcile its reference and amount in the generated CPMS report.',
			mutation: true,
			sqs: method === 'cardPayment',
		})),
	...['CARD', 'CNP', 'CASH', 'CHEQUE', 'POSTAL_ORDER'].map((method) => ({
		id: `create-group-${method.toLowerCase()}`,
		endpoint: 'groupPayment',
		validation: `Create a two-member ${method} group; verify its exact transaction total and customer/receipt references in CPMS report read-back. The summary report does not verify individual members.`,
		mutation: true,
		sqs: true,
	})),
	{
		id: 'confirm-uncompleted-cnp',
		endpoint: 'confirm',
		validation: 'Confirm only the suite-owned uncompleted CNP receipt; assert the observed CPMS code 827 and auth_code P response and that it is not treated as paid.',
		mutation: true,
		confirmation: true,
		dependsOn: 'create-cardNotPresentPayment',
	},
	{
		id: 'generate-current-day-report',
		endpoint: 'generateReport',
		validation: 'Generate one report for the configured approved report code and current UTC date; retain only its opaque reference in the private run manifest.',
		reportGeneration: true,
		dependsOn: 'list-report-definitions',
	},
	{
		id: 'check-generated-report',
		endpoint: 'checkReportStatus',
		validation: 'Poll the generated report to completion and assert a recognized completed status.',
		dependsOn: 'generate-current-day-report',
	},
	{
		id: 'download-and-reconcile-report',
		endpoint: 'downloadReport',
		validation: 'Download the completed summary report and compare exact suite-owned customer references, transaction totals and receipt references against independently specified fixtures. Individual group members are not exposed.',
		dependsOn: 'check-generated-report',
	},
	{
		id: 'reverse-suite-cheque',
		endpoint: 'reverseCheque',
		validation: 'Reverse one explicitly approved manifest-bound synthetic cheque only after independent report reconciliation and resolution of the earlier CPMS 218 rejection.',
		mutation: true,
		reversal: true,
		reversalMethod: 'CHEQUE',
	},
	{
		id: 'reverse-completed-test-card',
		endpoint: 'reverseCard',
		validation: 'Requires a human-completed non-production checkout and an independently reconciled payment; the suite never enters card details or attempts an uncompleted-card reversal.',
		mutation: true,
		reversal: true,
		reversalMethod: 'CARD',
	},
];

module.exports = { inventory, scenarios };
