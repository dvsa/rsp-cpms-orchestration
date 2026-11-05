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

## Manual black-box integration baseline

The portable integration suite characterises all 13 exported handlers and all
13 HTTP routes declared in `serverless/serverless.yml` under the `/dev` stage.
It does not import handlers or services. Tests call the running loopback HTTP
service and exercise real non-production CPMS/report endpoints; they are not
unit tests, mocks, CI checks, or source-coverage measurements. Java and
DynamoDB Local are not required.

### Prepare a first run

1. Follow the local setup above: Node 20, `npm ci`, private `.env`, AWS CLI v2
   login and non-production CPMS configuration. Keep `.env` mode `600`.
2. Explicitly opt into the desired non-production side effects in the private,
   ignored `.env` (never commit these settings):

   ```dotenv
   INTEGRATION_BASE_URL=http://127.0.0.1:3000/dev
   INTEGRATION_REDIRECT_URL=https://nonprod.pay-roadside-fine.service.gov.uk
   INTEGRATION_REPORT_CODE=<approved code from Bruno Generate Report or listReports>
   INTEGRATION_CONFIRM_LOCAL=yes
   INTEGRATION_CONFIRM_NONPROD=yes
   INTEGRATION_ALLOW_PAYMENT_MUTATIONS=yes
   INTEGRATION_ALLOW_SQS=yes
   INTEGRATION_ALLOW_CONFIRMATION=yes
   INTEGRATION_ALLOW_REPORT_GENERATION=yes
   INTEGRATION_ALLOW_REVERSALS=no
   ```

   Replace the report-code placeholder with the approved non-production code.
   The return URL must be HTTPS on `nonprod.pay-roadside-fine.service.gov.uk`.
   Do not put credentials, payment tokens, or these settings in source control
   or reports.
3. In terminal one, start `npm start` and leave it running. Refresh AWS login
   first; the launcher exports temporary credentials once. Restart the service
   after credentials expire.
4. In terminal two, run:

   ```sh
   npm run test:integration:local
   ```

   The suite loads configuration and gates from `.env`; invoking-shell values
   take precedence, including `no` and empty values. Omitted gates default off;
   set an existing gate to `no` to disable its scenarios. Persisted `yes` values
   authorize these operations on every run until changed: each run creates real
   non-production transactions, confirmations, reports and SQS messages, with
   no automatic cleanup. Only enable side effects you have permission to exercise.
   `INTEGRATION_CONFIRM_NONPROD=yes` confirms that the running service's private
   CPMS settings point to the intended non-production environment. Group
   payments and card-present payment publish real messages to the configured
   SQS queue.

5. Review `integration-reports/latest.html` and
   `integration-reports/latest.json`, or use
   `npm run test:integration:report:open`. `npm run test:integration:report`
   rebuilds the HTML from the last JSON result; it does not rerun tests.
   `npm run test:integration:tooling` runs offline-only safety/report tests and
   `npm run lint:integration` lints the integration harness.

### Transaction safety and coverage

The suite creates unique synthetic references per run; there is no DynamoDB
seed/reset and no operation on Bruno or historical payments. A permission-
restricted ignored manifest under `integration-state/` records only the
synthetic references, attempted amounts, response receipts and status so an
ambiguous write can be reconciled. The HTML/JSON report omits those identifiers,
credentials, URLs, payloads and raw CPMS/AWS responses.

CPMS transactions and SQS messages are external side effects. They are **not**
deleted or rolled back by suite cleanup. The runner never retries a payment
request, stops later mutations after an uncertain result, and requires manual
reconciliation of the manifest against CPMS before any retry. Do not rerun
after a timeout, SQS failure or HTTP error until checking whether CPMS already
created the transaction. A successful response/read-back is not proof of
settlement.
The suite also does not consume SQS messages or claim that downstream consumers
received them; an API response does not prove queue delivery or processing.
Card responses expose their HTTPS return gateway in `gateway_url`. Report
generation uses a full UTC-day timestamp range, and status polling recognizes
CPMS's `completed`/`error` booleans for up to 120 bounded polls. The captured
summary report exposes transaction totals rather than separate group members;
reconciliation verifies exact customer/receipt references and total amounts.
Group fixtures total £10 (members £4 and £6) because the existing local group
transaction validator requires integer `total_amount` between 10 and 9999
before calling CPMS.

The confirmation scenario is limited to this run's uncompleted CNP transaction;
the observed CPMS code 827 / `auth_code` P response is explicitly not a
paid transaction. Reversals require both `INTEGRATION_ALLOW_REVERSALS=yes` and
the independently verified, individually approved fixtures below. Without these
fixtures, at most 15 of the 17 scenarios can pass; skips are incomplete coverage,
not passes. The suite does not automate third-party card entry. Neither a reversal
nor a card checkout is part of automatic cleanup. Report generation requires
its own explicit gate. Report output is reconciled by exact synthetic customer
references and independently specified transaction totals; individual group
member references and amounts are not verified by this summary report. Unknown report
formats fail rather than being treated as a successful read-back.

Review the result counts: skipped scenarios mean incomplete coverage, and a
dependency-unavailable result is not a pass. The local API must already be
running. A harmless `/local-readiness` 404 confirms the loopback service before
any scenario runs; the suite does not start or stop services. Stop the service
you started with Ctrl+C. Offline tooling coverage is not a real CPMS run.

### Preparing the two reversal fixtures

Use an existing successful individual `cardPayment` or `chequePayment` entry
from an ignored `integration-state/<run-id>.json` manifest. Do not use production,
Bruno, historical customer payments, CNP, or group receipts. The exact receipt,
customer reference and amount must match the recorded synthetic creation.
The runner refuses any receipt/customer for which any retained manifest records
a previous reversal attempt, including a failed or uncertain attempt.

For CARD, an authorised person must complete that owned checkout using the
approved sandbox flow, then independently obtain CPMS confirmation code **801**
and a report matching the receipt, customer, amount and CARD method. A gateway
redirect, HTTP 200, or confirmation code 827 is not payment evidence. Existing
manifests intentionally omit gateway URLs: obtain the existing receipt's checkout
link privately through the approved CPMS tooling/operator; do not create another
payment simply to obtain a link. Never enter card details into this suite or
copy gateway URLs/tokens into reports or chat.

The earlier CHEQUE attempt returned downstream HTTP 400 / CPMS **218**, exposed
locally as HTTP 502. The retained diagnostics do **not** contain CPMS's full error
message, so the precise rejection cause is not established. The adapter sends
the matching customer reference, scope `CHEQUE_RD` and an empty `cost_centre`;
the service passes an Axios response object into response serialization, which
can mask the downstream rejection. Neither a payload/auth fix nor a meaning for
218 can be safely inferred from the numeric code alone. Obtain its full message
from the existing CPMS logs/support, reconcile the original receipt's outcome,
and resolve the cause before approving a different owned cheque. Do not treat
218 as a successful reversal or retry the failed receipt.

In private `.env`, add the following for each method (replace `CARD` with
`CHEQUE` for the other fixture). No field is automatically approved:

```dotenv
INTEGRATION_ALLOW_REVERSALS=yes
INTEGRATION_CARD_REVERSAL_APPROVED=no
INTEGRATION_CARD_REVERSAL_MANIFEST=
INTEGRATION_CARD_REVERSAL_RECEIPT_REFERENCE=
INTEGRATION_CARD_REVERSAL_CUSTOMER_REFERENCE=
INTEGRATION_CARD_REVERSAL_PENALTY_TYPE=FPN
INTEGRATION_CARD_REVERSAL_EXPECTED_AMOUNT=
INTEGRATION_CARD_REVERSAL_PROOF=
```

`MANIFEST` and `PROOF` are filenames inside ignored `integration-state/`, not
paths. Create the private proof JSON only from independently verified CPMS data:

```json
{
  "environment": "non-production",
  "independentlyVerified": true,
  "verifiedAt": "<ISO timestamp of actual verification>",
  "receiptReference": "<owned receipt>",
  "customerReference": "<owned customer>",
  "penaltyType": "FPN",
  "amount": 1.37,
  "cpmsCode": 801,
  "reportRows": [{
    "customer reference": "<owned customer>",
    "receipt reference": "<owned receipt>",
    "total amount": "1.37",
    "payment type": "CARD"
  }]
}
```

Use the real fixture amount, actual report rows and actual verified code, not
the example values. For CHEQUE, use its creation success code `"000"`, payment
type `"CHEQUE"` and add `"rejection218Resolved": true` **only after resolving the
earlier rejection**. Keep the directory mode `700` and proof/config files `600`.
Set the corresponding `APPROVED=yes` only after these checks and authorisation.
The global local/non-production/payment-mutation gates still apply.

With the service running, run **only** these two scenarios without creating ten
more payments, sending SQS messages, or generating reports:

```sh
npm run test:integration:reversals
```

Missing approvals/data produce specific preflight skips without sending reversal
requests. Valid fixtures call `/reverseCard` or `/reverseCheque` once and journal
the receipt before the request. HTTP 200 plus the response envelope remains the
baseline assertion; an explicit non-success CPMS code fails rather than passing
as an object. This is not proof of final CPMS state; reconcile afterwards. Keep all
manifests to preserve duplicate-attempt protection. The normal
`npm run test:integration:local` also includes these guarded scenarios.

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
