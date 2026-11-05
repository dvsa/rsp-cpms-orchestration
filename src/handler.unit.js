/* eslint-disable global-require */
import sinon from 'sinon';
import expect from 'expect';
import Constants from './utils/constants';

const handlerNames = [
	'cardPayment',
	'cardNotPresentPayment',
	'cashPayment',
	'chequePayment',
	'postalOrderPayment',
	'confirm',
	'listReports',
	'generateReport',
	'checkReportStatus',
	'reverseCard',
	'reverseCheque',
	'downloadReport',
	'groupPayment',
];

describe('configured Lambda handlers', () => {
	afterEach(() => sinon.restore());

	handlerNames.forEach((handlerName) => {
		it(`${handlerName} bootstraps once and invokes its route handler`, async () => {
			delete require.cache[require.resolve('./handler')];
			const bootstrap = sinon.stub(Constants, 'bootstrap').resolves();
			const handlers = require('./handler');

			await expect(handlers[handlerName]({ body: null })).rejects.toThrow();

			expect(bootstrap.calledTwice).toBe(true);
		});
	});

	it('does not bootstrap again after the first invocation', async () => {
		delete require.cache[require.resolve('./handler')];
		const bootstrap = sinon.stub(Constants, 'bootstrap').resolves();
		const handlers = require('./handler');

		await expect(handlers.cardPayment({ body: null })).rejects.toThrow();
		bootstrap.resetHistory();
		await expect(handlers.cardPayment({ body: null })).rejects.toThrow();

		expect(bootstrap.calledOnce).toBe(true);
	});
});
