export default class QueueService {

	constructor(sqs, sqsQueueUrl) {
		this.sqs = sqs;
		this.sqsQueueUrl = sqsQueueUrl;
	}

	async sendMessage(receiptReference, paymentCode, regNum) {
		const params = {
			DelaySeconds: 0,
			MessageAttributes: {
				ReceiptReference: {
					DataType: 'String',
					StringValue: receiptReference,
				},
				PaymentCode: {
					DataType: 'String',
					StringValue: paymentCode,
				},
				RegistrationNumber: {
					DataType: 'String',
					StringValue: regNum,
				},
			},
			MessageBody: 'Information about a launched payment to CPMS from the Roadside Payments service.',
			QueueUrl: this.sqsQueueUrl,
		};
		console.log('sqs sendMessage params');
		console.log(params);
		try {
			await this.sqs.sendMessage(params).promise();
		} catch (err) {
			console.log('sqs sendMessage err');
			console.log(err);
		}
	}
}
