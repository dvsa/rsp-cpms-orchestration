# RSP CPMS Orchestration API
#### Pre-requisites
Use Node.js 20 (`nvm use`) and AWS CLI v2 with an authenticated non-production
profile, for example `rsp-dev`. A `[default]` profile is not required.

#### Description
This API will handle all requests to CPMS. This API is being put in place to deal with cold-start warm up times experienced when lambdas are contained on VPC's

Running Node.js 20.
Serverless Offline 13 is required for local `nodejs20.x` handler invocation;
Offline 11 can start listening but fails when a route actually invokes a handler.

## Run locally
- `nvm use`
- `npm ci` (first checkout, or when dependencies change)
- Create a private, ignored `.env` in the repository root and run `chmod 600 .env`.
  Set `AWS_PROFILE=rsp-dev`, `AWS_REGION=eu-west-1`, `REGION=eu-west-1`,
  and `USE_SECRETS_MANAGER=false`. Obtain the non-production CPMS configuration
  securely: `URL`, `FIXED_PENALTY_SCHEME`, `FIXED_PENALTY_SECRET`,
  `IMMOBILISATION_SCHEME`, `IMMOBILISATION_SECRET`, `COURT_DEPOSIT_SCHEME`,
  `COURT_DEPOSIT_SECRET`, `USERID`, `SQS_URL`, `COST_CENTRE`, `CUSTOMER_NAME`,
  `CUSTOMER_MANAGER_NAME`, `ADDRESS_LINE1`–`ADDRESS_LINE4`, `ADDRESS_CITY`
  and `ADDRESS_POSTCODE`. Do not commit credentials or paste them into logs.
- Authenticate the selected profile (for an SSO profile, `aws sso login --profile rsp-dev`).
- `npm start`

The launcher privately loads `.env` and exports the selected profile's temporary
credentials through AWS CLI v2 for the bundled AWS SDK v2. It preserves the
Webpack build, source watcher and Serverless Offline workflow; the local generated
Serverless configuration skips the dotenv plugin and inherits the launcher's
environment instead. No `.env` or credentials are copied into build artifacts.
Restart after credentials expire. Java and DynamoDB Local are not required.

Refresh credentials before a live test run. CPMS creation can succeed while the
later SQS send fails with an expired AWS token, especially for `/groupPayment`.
An HTTP 400 in that case is not evidence that no transaction exists. Reconcile
the original CPMS receipt/report before retrying; do not create a duplicate
payment to recover a failed queue send.

HTTP listens at `http://127.0.0.1:3000` (routes such as `POST /dev/cardPayment`);
the local Lambda invocation server uses port `3002`. Both bind to loopback.
If ports are already in use, leave those processes alone and select free ports:
`LOCAL_HTTP_PORT=3010 LOCAL_LAMBDA_PORT=3012 npm start`.
Stop the foreground process with Ctrl+C.

A harmless readiness probe is `curl -i http://127.0.0.1:3000/local-readiness`
(expected HTTP 404). Payment and reporting routes are POST-only and still use
external non-production CPMS/SQS services. Do not submit financial requests just
to check startup. Local IAM authorization is disabled by the existing `--noAuth`
option; this launcher does not change deployed configuration.

With the service running, `npm run check:local` verifies actual Node20 handler
loading through the Lambda listener, not just HTTP readiness. It invokes Card
Payment with a JSON-null body and asserts the expected `penalty_type` null-access
error inside PaymentService, before CPMS authentication or SQS access. This
intentional handler error is a passing smoke check, not a payment request.

## Package for development
- `npm run build`

## Package for production
- `npm run build:prod`

## Isolated unit tests and coverage

Use the isolated unit suite for behavioural regression checks:

- `npm test`
- `npm run test:coverage`

The coverage command instruments original source with Babel/Istanbul and checks
statements, branches, functions and lines at a minimum of 95.01% for **each**
production JavaScript file under `src/`. Test files and test helpers are excluded;
the HTML and JSON reports are written to ignored `coverage/`, with raw data in
ignored `.nyc_output/`.

The unit-test setup uses synthetic configuration and AWS credentials, blocks
HTTP/HTTPS network requests, and mocks AWS and CPMS calls. It does not load the
private `.env` file or require AWS authentication, CPMS access, a running service
or a queue. The service integration tests under `src/test/` are separate and are
not part of `npm test` or the coverage gate.

## To Lint

- `npm run lint`

## To auto fix linting errors

- `npm run lint:fix`

## To Note

SAM is a new addition and is being used for building for running locally and for packaging for production - using the `template.yaml` file.

Serverless is being used for running locally from the built files. Ideally SAM will be used for packaging and running locally going forward and the serverless config can be removed.
