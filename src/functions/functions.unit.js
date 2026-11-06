/* eslint-disable import/no-named-as-default */
import sinon from 'sinon';
import expect from 'expect';

import PaymentService from '../services/paymentService';
import GroupPaymentService from '../services/groupPaymentService';
import ReportService from '../services/reportService';
import Constants from '../utils/constants';

import cardPayment from './cardPayment';
import cardNotPresentPayment from './cardNotPresentPayment';
import cashPayment from './cashPayment';
import chequePayment from './chequePayment';
import postalOrderPayment from './postalOrderPayment';
import groupPayment from './groupPayment';
import confirm from './confirm';
import reverseCard from './reverseCard';
import reverseCheque from './reverseCheque';
import generateReport from './generateReport';
import listReports from './listReports';
import checkReportStatus from './checkReportStatus';
import downloadReport from './downloadReport';

describe('payment and report handlers', () => {
	let bootstrap;

	beforeEach(() => {
		bootstrap = sinon.stub(Constants, 'bootstrap').resolves();
		sinon.stub(PaymentService, 'cardPayment').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'cardNotPresentPayment').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'cashPayment').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'chequePayment').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'postalOrderPayment').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'confirmPayment').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'reverseCard').resolves({ statusCode: 200 });
		sinon.stub(PaymentService, 'reverseCheque').resolves({ statusCode: 200 });
		sinon.stub(GroupPaymentService, 'groupPayment').resolves({ statusCode: 200 });
		sinon.stub(ReportService, 'generateReport').resolves({ statusCode: 200 });
		sinon.stub(ReportService, 'listReports').resolves({ statusCode: 200 });
		sinon.stub(ReportService, 'checkReportStatus').resolves({ statusCode: 200 });
		sinon.stub(ReportService, 'downloadReport').resolves({ statusCode: 200 });
	});

	afterEach(() => sinon.restore());

	const handlers = [
		{
			fn: cardPayment, service: PaymentService, method: 'cardPayment', field: 'penalty_type',
		},
		{
			fn: cardNotPresentPayment, service: PaymentService, method: 'cardNotPresentPayment', field: 'payment_type',
		},
		{
			fn: cashPayment, service: PaymentService, method: 'cashPayment', field: 'payment_type',
		},
		{
			fn: chequePayment, service: PaymentService, method: 'chequePayment', field: 'payment_type',
		},
		{
			fn: postalOrderPayment, service: PaymentService, method: 'postalOrderPayment', field: 'payment_type',
		},
		{
			fn: groupPayment, service: GroupPaymentService, method: 'groupPayment', field: 'penalty_type',
		},
		{
			fn: confirm, service: PaymentService, method: 'confirmPayment', field: 'receipt_reference',
		},
		{
			fn: reverseCard, service: PaymentService, method: 'reverseCard', field: 'penalty_type',
		},
		{
			fn: reverseCheque, service: PaymentService, method: 'reverseCheque', field: 'penalty_type',
		},
		{
			fn: generateReport, service: ReportService, method: 'generateReport', field: 'penalty_type',
		},
		{
			fn: listReports, service: ReportService, method: 'listReports', field: 'penalty_type',
		},
		{
			fn: checkReportStatus, service: ReportService, method: 'checkReportStatus', field: 'penalty_type',
		},
		{
			fn: downloadReport, service: ReportService, method: 'downloadReport', field: 'penalty_type',
		},
	];

	handlers.forEach(({
		fn, service, method, field,
	}) => {
		it(`${fn.name} bootstraps and forwards an object body`, async () => {
			const body = { [field]: 'FPN', details: 'representative request' };
			const result = await fn({ body });

			expect(result).toEqual({ statusCode: 200 });
			expect(bootstrap.calledOnce).toBe(true);
			expect(service[method].calledOnceWithExactly(body)).toBe(true);
		});

		it(`${fn.name} parses and forwards a JSON body`, async () => {
			const body = { [field]: 'FPN', details: 'serialized request' };
			const result = await fn({ body: JSON.stringify(body) });

			expect(result).toEqual({ statusCode: 200 });
			expect(service[method].calledOnceWithExactly(body)).toBe(true);
		});
	});
});
