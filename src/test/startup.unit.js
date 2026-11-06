import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { expect } from 'expect';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const requireModule = createRequire(`${process.cwd()}/src/test/startup.unit.js`);
const manifest = requireModule('../../package.json');
const webpack = requireModule('../../webpack.config.js');
const { lambdas } = requireModule('../../lambdas.json');

describe('Node24 startup and deployment wiring', () => {
	it('uses Node env-file loading and native SDK3 profiles without credential-export launchers', () => {
		expect(manifest.engines).toEqual({ node: '24.x', npm: '11.x' });
		expect(manifest.scripts.start).toBe('npm run build && npm run parallel');
		expect(manifest.scripts['start:local']).toBe('npm start');
		expect(manifest.scripts.offline).toContain('--env-file=../.env');
		expect(manifest.scripts.offline).toContain('--host 127.0.0.1');
		expect(manifest.scripts.offline).not.toMatch(/start-local|export-credentials|experimental-require/);
		expect(manifest.dependencies['aws-sdk']).toBeUndefined();
		expect(manifest.devDependencies.serverless).toMatch(/^npm:osls@/);
	});

	it('preserves every handler and route while making each Lambda self-contained', () => {
		const config = fs.readFileSync(path.resolve('serverless/serverless.yml'), 'utf8');
		expect(config).toContain('runtime: nodejs24.x');
		expect(Object.keys(webpack.entry)).toEqual(lambdas);
		expect(webpack.output.asyncChunks).toBe(false);
		lambdas.forEach((name) => {
			expect(webpack.entry[name]).toBe(`./src/functions/${name}.js`);
			expect(config).toContain(`handler: ${name}/app.handler`);
			expect(config).toContain(`path: ${name}`);
		});
		expect((config.match(/authorizer: aws_iam/g) || []).length).toBe(lambdas.length);
		expect((config.match(/cors: true/g) || []).length).toBe(lambdas.length);
	});

	it('fails unexpected AWS sends before credentials or network resolution', () => {
		expect(() => new SQSClient({}).send(new SendMessageCommand({ QueueUrl: 'unit', MessageBody: 'unit' })))
			.toThrow('Unexpected AWS request');
		expect(() => new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: 'unit' })))
			.toThrow('Unexpected AWS request');
	});
});
