export default class QueueService {

	constructor(sqs, sqsQueueUrl) {
		this.sqs = sqs;
		this.sqsQueueUrl = sqsQueueUrl;
	}

	sendMessage(receiptReference, paymentCode, regNum) {
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
		return new Promise((resolve, reject) => {
			this.sqs.sendMessage(params).promise()
				.then(data => resolve(data))
				.catch(err => reject(err));
		});
	}
}
