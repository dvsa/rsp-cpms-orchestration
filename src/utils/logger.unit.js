import sinon from 'sinon';
import expect from 'expect';

import {
	logInfo,
	logError,
	errorMessageFromAxiosError,
	logAxiosError,
} from './logger';

describe('structured logging helpers', () => {
	afterEach(() => sinon.restore());

	it('writes info and error logs as structured JSON', () => {
		const info = sinon.stub(console, 'log');
		const error = sinon.stub(console, 'error');

		logInfo('UnitInfo', { accepted: true });
		logError('UnitError', 'failed');

		expect(JSON.parse(info.firstCall.args[0])).toEqual({
			logName: 'UnitInfo',
			message: { accepted: true },
			logLevel: 'INFO',
		});
		expect(JSON.parse(error.firstCall.args[0])).toEqual({
			logName: 'UnitError',
			message: 'failed',
			logLevel: 'ERROR',
		});
	});

	it('normalizes response, request-only and setup Axios errors', () => {
		expect(errorMessageFromAxiosError({
			response: { data: { error: 'declined' }, status: 422 },
			request: 'ignored when response exists',
		})).toEqual({ errorData: { error: 'declined' }, errorStatus: 422 });
		expect(errorMessageFromAxiosError({ request: { path: '/payment' } })).toEqual({
			message: 'The request was made but no response was received',
			request: { path: '/payment' },
		});
		expect(errorMessageFromAxiosError({ message: 'invalid request' })).toEqual({
			errorMessage: 'invalid request',
		});
	});

	it('logs Axios errors with and without contextual details', () => {
		const error = sinon.stub(console, 'error');

		logAxiosError('Payment', 'CPMS', { response: { data: 'declined', status: 400 } });
		logAxiosError('Queue', 'AWS', { message: 'network issue' }, { requestId: 'request-1' });

		expect(JSON.parse(error.firstCall.args[0])).toEqual({
			logName: 'PaymentError',
			serviceName: 'CPMS',
			requestErrorMessage: { errorData: 'declined', errorStatus: 400 },
			logLevel: 'ERROR',
		});
		expect(JSON.parse(error.secondCall.args[0])).toEqual({
			logName: 'QueueError',
			serviceName: 'AWS',
			requestErrorMessage: { errorMessage: 'network issue' },
			logLevel: 'ERROR',
			details: { requestId: 'request-1' },
		});
	});
});
