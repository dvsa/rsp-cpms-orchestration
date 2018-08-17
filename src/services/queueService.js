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
			DelaySeconds: 0,
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
					StringValue: VehicleRegistration,
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
		console.log('sqs sendMessage params');
		console.log(params);
		return new Promise((resolve, reject) => {
			this.sqs.sendMessage(params).promise()
				.then(data => resolve(data))
				.catch(err => reject(err));
		});
	}
}
