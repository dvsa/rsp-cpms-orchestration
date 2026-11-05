import sinon from 'sinon';
import expect from 'expect';

import QueueService from './queueService';

describe('QueueService', () => {
	afterEach(() => sinon.restore());

	it('sends message attributes with offline fallback and logs the acknowledgement', async () => {
		const response = { MessageId: 'message-123' };
		const sendMessage = sinon.stub().returns({ promise: () => Promise.resolve(response) });
		const log = sinon.stub(console, 'log');
		const service = new QueueService({ sendMessage }, 'https://sqs.invalid/unit');

		const result = await service.sendMessage({
			ReceiptReference: 'CPMS-123',
			PenaltyId: 'PEN-1_FPN',
			VehicleRegistration: undefined,
			PenaltyType: 'FPN',
			IsGroupPayment: false,
		});

		expect(result).toBe(response);
		expect(sendMessage.calledOnce).toBe(true);
		expect(sendMessage.firstCall.args[0]).toEqual({
			MessageAttributes: {
				ReceiptReference: { DataType: 'String', StringValue: 'CPMS-123' },
				PenaltyId: { DataType: 'String', StringValue: 'PEN-1_FPN' },
				RegistrationNumber: { DataType: 'String', StringValue: 'OFFLINE' },
				IsGroupPayment: { DataType: 'String', StringValue: 'false' },
				PenaltyType: { DataType: 'String', StringValue: 'FPN' },
			},
			MessageBody: 'Information about a launched payment to CPMS from the Roadside Payments service.',
			QueueUrl: 'https://sqs.invalid/unit',
		});
		expect(log.calledOnce).toBe(true);
		expect(JSON.parse(log.firstCall.args[0])).toMatchObject({
			logName: 'CPMSCheckingQueueMessageSent',
			message: { sqsResponse: response },
			logLevel: 'INFO',
		});
	});

	it('propagates SQS promise failures', async () => {
		const sendMessage = sinon.stub().returns({
			promise: () => Promise.reject(new Error('SQS unavailable')),
		});
		const service = new QueueService({ sendMessage }, 'queue');

		await expect(service.sendMessage({
			ReceiptReference: 'CPMS-1',
			PenaltyId: 'PEN-1',
			VehicleRegistration: 'UNIT123',
			PenaltyType: 'FPN',
			IsGroupPayment: true,
		})).rejects.toThrow('SQS unavailable');
	});
});
