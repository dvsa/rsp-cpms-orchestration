import sinon from 'sinon';
import expect from 'expect';
import { SendMessageCommand, SQSServiceException } from '@aws-sdk/client-sqs';

import QueueService from './queueService';

describe('QueueService', () => {
	afterEach(() => sinon.restore());

	it('sends message attributes with offline fallback and logs the acknowledgement', async () => {
		const response = { MessageId: 'message-123' };
		const send = sinon.stub().resolves(response);
		const log = sinon.stub(console, 'log');
		const service = new QueueService({ send }, 'https://sqs.invalid/unit');

		const result = await service.sendMessage({
			ReceiptReference: 'CPMS-123',
			PenaltyId: 'PEN-1_FPN',
			VehicleRegistration: undefined,
			PenaltyType: 'FPN',
			IsGroupPayment: false,
		});

		expect(result).toBe(response);
		expect(send.calledOnce).toBe(true);
		expect(send.firstCall.args[0]).toBeInstanceOf(SendMessageCommand);
		expect(send.firstCall.args[0].input).toEqual({
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
		const failure = new SQSServiceException({
			name: 'AccessDenied',
			$fault: 'client',
			$metadata: { httpStatusCode: 403 },
			message: 'SQS unavailable',
		});
		const send = sinon.stub().rejects(failure);
		const service = new QueueService({ send }, 'queue');

		const request = service.sendMessage({
			ReceiptReference: 'CPMS-1',
			PenaltyId: 'PEN-1',
			VehicleRegistration: 'UNIT123',
			PenaltyType: 'FPN',
			IsGroupPayment: true,
		});
		await expect(request).rejects.toThrow('SQS unavailable');
		await expect(request).rejects.toBe(failure);
		expect(send.calledOnce).toBe(true);
	});
});
