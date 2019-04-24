import supertest from 'supertest';
import dotenv from 'dotenv';

dotenv.config();

const url = 'http://localhost:3000';
const request = supertest(url);
const redirectUri = process.env.REDIRECT_URI;


describe('Group payment service', () => {
	context('POST /groupPayment', () => {
		context('when a correct request is made', () => {
			it('responds with a correct response', async () => {
				const payload = {
					PaymentMethod: 'CARD',
					RedirectUrl: redirectUri,
					PenaltyGroupId: 'testgroup',
					VehicleRegistration: 'EXAMPLE',
					PenaltyType: 'FPN',
					TotalAmount: 20,
					Penalties: [{
						PenaltyAmount: 10,
						PenaltyReference: '1525235141234_FPN',
						VehicleRegistration: 'EXAMPLE',
					}, {
						PenaltyAmount: 20,
						PenaltyReference: '7387127348123_FPN',
						VehicleRegistration: 'EXAMPLE',
					}],
				};
				await request
					.post('/groupPayment')
					.set('Content-Type', 'application/json')
					.send(payload)
					.expect(200);
			});
		});
	});
});
