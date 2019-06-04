import { logInfo } from '../utils/logger';

export default class QueueService {

	constructor(sqs, sqsQueueUrl) {
		this.sqs = sqs;
		this.sqsQueueUrl = sqsQueueUrl;
	}

	sendMessage(options) {
		const {
			ReceiptReference,
			PenaltyType,
			PenaltyId,
			VehicleRegistration,
			IsGroupPayment,
		} = options;
		const params = {
			MessageAttributes: {
				ReceiptReference: {
					DataType: 'String',
					StringValue: ReceiptReference,
				},
				PenaltyId: {
					DataType: 'String',
					StringValue: PenaltyId,
				},
				RegistrationNumber: {
					DataType: 'String',
					StringValue: VehicleRegistration || 'OFFLINE',
				},
				IsGroupPayment: {
					DataType: 'String',
					StringValue: IsGroupPayment.toString(),
				},
				PenaltyType: {
					DataType: 'String',
					StringValue: PenaltyType,
				},
			},
			MessageBody: 'Information about a launched payment to CPMS from the Roadside Payments service.',
			QueueUrl: this.sqsQueueUrl,
		};
		return this.sqs.sendMessage(params).promise().then((data) => {
			logInfo('CPMSCheckingQueueMessageSent', { message: params, sqsResponse: data });
			return Promise.resolve(data);
		});
	}
}
