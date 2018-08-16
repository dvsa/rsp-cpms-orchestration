import { StepFunctions } from 'aws-sdk';

import Constants from '../utils/constants';

const stepfunctions = new StepFunctions();

export default (input) => {
	const stateMachineArn = Constants.statemachine_arn;
	const params = {
		stateMachineArn,
		input: JSON.stringify(input),
	};
	return new Promise((resolve, reject) => {
		stepfunctions.startExecution(params).promise().then(() => {
			resolve({
				message: `Your statemachine ${stateMachineArn} executed successfully`,
			});
		}).catch((error) => {
			reject(error.message);
		});
	});
};
