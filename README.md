# RSP CPMS Orchestration API
#### Pre-requisites
Use Node.js 24 and npm 11 (`nvm use`) and AWS CLI v2 with an authenticated non-production
profile, for example `rsp-dev`. A `[default]` profile is not required.

#### Description
This API will handle all requests to CPMS. This API is being put in place to deal with cold-start warm up times experienced when lambdas are contained on VPC's

Running Node.js 24 with OSLS 4.5 and Serverless Offline 14.
The `serverless` package is an npm alias of OSLS, not the licensed framework.
Runtime AWS operations use SDK v3 SQS and Secrets Manager clients.

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
- Authenticate the selected profile (`aws login --profile rsp-dev` for this
  development profile; use `aws sso login` only for an SSO-configured profile).
- `npm start`

`npm start` builds direct webpack Lambda entries, then runs the source watcher
and Offline. Node's `--env-file=../.env` privately loads the root configuration;
exported shell values take precedence. SDK v3 resolves `AWS_PROFILE` natively,
including the AWS CLI login profile. The obsolete SDK v2 credential-export
launcher and dotenv framework plugin are removed. No `.env` or credentials are
copied into build artifacts. `npm run start:local` is a compatibility alias.
Renew expired authentication before live tests; restart Offline after renewal
if a worker still has stale configuration. Java and DynamoDB Local are not
required by this service (unlike Documents).

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
option; these local options do not change deployed configuration.

With the service running, `npm run check:local` verifies actual Node24 handler
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

1. Follow the local setup above: Node 24/npm 11, `npm ci`, private `.env`, AWS CLI v2
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
   first; SDK v3 resolves the profile without exporting access/session keys.
   Renew login and restart the service if authentication expires.
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
   Automatic report opening is supported on macOS; on other platforms, open
   the HTML report directly from `integration-reports/`.
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
- `npm run package` (production build plus archive/export verification)
- `npm run build:prod` / `npm run build:ci` (production build only)

`lambdas.json` drives all 13 direct webpack entries. Development and production
bundles are `.webpack/<name>/app.js`; ZIPs retain their existing
`dist/<name>.zip` names. Each archive contains a self-contained CommonJS bundle
and third-party license file, plus a generated `handler.js` compatibility shim
that re-exports its local `app.js`. Existing infrastructure using
`handler.<name>` or `handler.handler` therefore remains compatible without an
implicit Terraform change. SDK dynamic imports are bundled without shared
chunks. Archive creation waits for every output stream to close.
`scripts/verify-artifacts.cjs` tests every ZIP and loads its code without
`node_modules` resolution or handler invocation, checking both `handler` and
the original named export and the legacy filename shim.

Serverless local handlers now map to `<name>/app.handler`. This deliberately
corrects the old SAM `reverseCard.handler` mapping: the source actually exports
`reverseCard`, now also aliased as `handler`. All 13 POST routes, `/dev` prefix,
IAM authorizers and CORS remain unchanged. SAM's plugin/template and generated
`.aws-sam` build are obsolete and removed.

`npm run build-openapi` generates and validates `build/openapi.json` with
`serverless-openapi-documenter`, then checks all 13 POST routes and 200/400
response definitions from the package root. Model definitions, response mapping
indentation and the cheque `methodResponses` typo are documentation corrections,
not runtime validation changes. CPMS response schemas intentionally do not invent
required fields for state-dependent responses.

## Isolated unit tests and coverage

Use the isolated unit suite for behavioural regression checks:

- `npm test`
- `npm run test:coverage`

The coverage command instruments original source with Babel/Istanbul and checks
statements, branches, functions and lines at a minimum of 95.01% for **each**
production JavaScript file under `src/`. Test files and test helpers are excluded;
the HTML and JSON reports are written to ignored `coverage/`, with raw data in
ignored `.nyc_output/`.

The unit-test setup uses synthetic configuration and AWS credentials, rejects
unexpected SDK v3 client sends, blocks HTTP/HTTPS network requests, and mocks AWS
and CPMS calls. It does not load the
private `.env` file or require AWS authentication, CPMS access, a running service
or a queue. The service integration tests under `src/test/` are separate and are
not part of `npm test` or the coverage gate.

## To Lint

- `npm run lint`
- `npm run lint:integration`
- `npm run check-js-types` (TypeScript, Node 24 declarations; all production JS,
  no `skipLibCheck`)

## To auto fix linting errors

- `npm run lint:fix`

## Upgrade validation and remaining limitations

The accepted pre-upgrade baseline was 107 isolated unit tests, 37 production
files, and 100% statements/branches/functions/lines. The SDK3 upgrade retains
those tests and adds missing-secret/retry and startup/isolation checks: 111
unit tests with the same per-file 95.01% gates and 100% in all four metrics.
The current source-inclusive NYC report enumerates 38 production files,
including `src/handler.js`; the accepted handoff described 37. No production
source was added or excluded to change coverage, and all measured files have
executable counters. The Babel test-runner-only `--no-experimental-detect-module`
flag prevents Node24 automatic ESM detection from bypassing the existing
CommonJS Babel hook; Offline needs no legacy module-loading flags.
SDK3 Secrets Manager failures reject without caching; malformed/missing JSON
also rejects. SQS requests preserve exact attributes/body/URL and awaited
publication semantics; async queue rejections retain existing HTTP errors.

Security remediation updates Axios within major 1 and Joi within major 17,
removes unused build/runtime dependencies and stage-1 `.snyk` deferrals, and
updates supported Node24 build/test tooling. OpenAPI's scoped js-yaml, nanoid
and YAML overrides stay within the requested majors. No new exceptions or
incompatible transitive-major overrides are introduced.

Unignored Snyk production scan: zero advisories. The development-inclusive scan
still reports 12 unique advisory IDs across OpenAPI tooling, braces, ESLint 8,
flat, glob/minimatch, inflight, uri-js and uuid. Several have no published fix;
others require unsupported transitive major changes or an ESLint/Airbnb
configuration migration. They are **not waived**, and the full tree is not clean.
Raw safe-local scan evidence is in ignored
`build/security/node24-snyk-{production,development}.json`.
Snyk 1.1302.0's strict peer/alias resolver incorrectly reports missing
`ajv@^8.12.0` despite a valid npm tree. The development scan uses
`--dev --ignore-policy --strict-out-of-sync=false`; this relaxes manifest
synchronisation checking, not vulnerability/policy scanning. Validate the actual
lockfile with `npm ci` and `npm ls` separately. CI uses the same unignored
development-inclusive scope/workaround, so unresolved findings remain visible
and can fail security validation rather than passing under baseline exceptions.

Remaining unignored development advisories (no renewed deferrals):

| Dependency / installed versions | Severity | Advisory IDs | Why no compatible fix remains |
| --- | --- | --- | --- |
| json-schema-ref-parser 9.1.2 | Medium | SNYK-JS-APIDEVTOOLSJSONSCHEMAREFPARSER-17937352 | Latest OpenAPI documenter 0.1.7 requires `^9.1.0`; 9.1.2 is the latest major-9 release. Snyk's fix starts at 15.3.6. |
| braces 3.0.3 | High | SNYK-JS-BRACES-19963945 | Latest published braces; no fix. Reached through nodemon/chokidar, expect/micromatch and OSLS/fast-glob. Removing one path does not remediate the others. |
| ESLint 8.57.1 | Medium | SNYK-JS-ESLINT-15102420 | Latest major 8; fix starts at 9.26.0. Airbnb base 15.0.0 explicitly peers with ESLint `^7.32.0 || ^8.2.0`, not 9+. |
| faker 5.5.3 | High | SNYK-JS-FAKERJSFAKER-18674671 | Latest Postman collection 5.3.1 pins exactly 5.5.3; fix starts at 10.5.0. Latest OpenAPI converter 6.4.2 still depends on that collection. |
| flat 5.0.2 | High | SNYK-JS-FLAT-22148819 | No Snyk fix; latest webpack-merge 6.0.1 requires `^5.0.2`, the latest major-5 flat release. Also used by webpack-cli. |
| glob 10.5.0 / 13.0.7 | Medium | SNYK-JS-GLOB-22112102 | Latest releases of those majors; fix starts at 14.0.2. Latest Mocha 12.0.3/NYC 18/test-exclude 8 require 13; Istanbul plugin 8/test-exclude 7 requires 10. |
| inflight 1.0.6 | Medium | SNYK-JS-INFLIGHT-6095116 | Latest release; no fix. Retained by ESLint 8's file-entry-cache/flat-cache/rimraf/glob dependency chain. |
| minimatch 3.1.5 / 5.1.9 / 9.0.9 / 10.2.6 | Medium | SNYK-JS-MINIMATCH-22111072 | Latest releases of their respective majors; fix starts at 11.0.1. ESLint/import/run-all, Redocly, glob, nodemon, Mocha, Archiver and coverage tooling retain these major constraints. |
| uri-js 4.4.1 | Medium | SNYK-JS-URIJS-19963961, SNYK-JS-URIJS-20341609 | Latest release; no fixes. Retained by ESLint 8 / eslintrc / AJV 6. Replacing AJV with major 8 is not a compatible override. |
| uri-js 4.4.1 | High | SNYK-JS-URIJS-19963963 | Same dependency path; no fix for this infinite-loop advisory. |
| uuid 8.3.2 | Medium | SNYK-JS-UUID-16133035 | Latest major 8; Postman collection 5.3.1 pins it exactly. Fix starts at 11.1.1 or 14.0.0. The documenter's own uuid 11 does not remove the collection's independent uuid 8. |

This is **12 unique advisories: four high and eight medium**, with no critical
remaining development advisory. These are tool/input-processing risks, not
proof of a deployed production exploit; development/build tools still need
remediation and must not process untrusted inputs under a claim of a clean tree.

### Security remediation performed and rechecked

- Refreshed the lockfile within permitted ranges (`npm update`, then `npm
  install` / reproducible `npm ci`); final `npm outdated` shows no pending
  allowed-range top-level updates. Registry checks also confirmed latest
  major-compatible versions for each vulnerable leaf and the upstream parent
  ranges/pins above. There is no identified unattempted compatible patch for
  these 12 remaining IDs.
- Updated production Axios 1.7.4 to 1.21.0 and overrode Joi 17.13.3 within
  major 17 to 17.13.9, retaining validation contracts. Production findings
  disappeared; unignored final scan covers 61 dependencies and reports zero.
- Removed obsolete AWS SDK2/framework/SAM/dotenv plugin dependencies and unused
  Babel CLI, copyfiles, replace, rimraf, wait-on, fs-extra and Node24-unneeded
  polyfills/runtime packages. This removed vulnerable wait-on/Axios 0.25 and
  obsolete dependency paths rather than applying ignores.
- Updated Node24-supported top-level tooling: Mocha 12.0.3,
  copy-webpack-plugin 14.0.0, webpack-cli 7.3.1, webpack-merge 6.0.1,
  nodemon 3.1.14, supertest 7.2.2, webpack 5.112.2, and Archiver 8.0.0.
  Archiver's ESM migration uses `ZipArchive` via dynamic import and removes its
  former glob-10 path; other coverage glob and minimatch paths remain.
- Applied only same-major OpenAPI overrides for js-yaml 4.3.2, nanoid 3.3.17
  and yaml 1.10.3, removing their advisories. Did not force parser 15, faker 10,
  uuid 11, glob 14, minimatch 11, ESLint 9 or AJV 8 into incompatible parent
  constraints.
- Reran 111 units, unchanged 95.01% per-file coverage gates (all four actual
  metrics 100%), both lints, TypeScript, 18 integration-tooling tests, strict
  OpenAPI and all 13 archive/export verifications after dependency changes.
  Actual integrations remain 15 pass / 0 fail / 2 guarded reversal skips;
  final clean-install startup also passed real CPMS report-read assertions and
  a native-profile SQS read without new financial mutations.
- Final unignored development scan covers 1,036 dependencies and retains the
  12 IDs above. The security follow-up did not change policy or dependencies
  after verifying there are no permitted compatible updates. No commit/push
  or deployment was performed.

Exact migration packages are `@aws-sdk/client-sqs@3.1163.0`,
`@aws-sdk/client-secrets-manager@3.1163.0`, `osls@4.5.0`,
`serverless@npm:osls@4.5.0`, and `serverless-offline@14.8.4`.
The old SAM reverseCard entry pointed at `reverseCard.handler` even though the
source exports `reverseCard` and `default`, not `handler`. Direct bundling now
preserves those exports and aliases `app.handler` to `app.reverseCard`; the
generated `handler.js` re-exports `app.js`, preserving both legacy
`handler.reverseCard` and uniform `handler.handler`. This is an explicit
packaging/wiring correction, not a reversal business-rule change or proof
that the unapproved card reversal was executed.

Actual Node24 validation used Node 24.20.0/npm 11.19.0, OSLS 4.5.0, Offline
14.8.4, SDK clients 3.1163.0, TypeScript 5.9.3 and Snyk 1.1302.0. `npm ci`,
111 isolated units/coverage, both lints, JS type checking, 18 independent
integration-tooling tests, all 13 production ZIP/load/export checks and strict
OpenAPI generation/inventory checks passed. An intermediate tooling invocation
failed while concurrent Snyk output was being written in the fixture-journal
directory, whose reversal guards read every JSON file. Security outputs were
moved to `build/security/` so they cannot interfere with those guards.
Standalone reruns and sequential clean-install validation passed.

The actual unchanged black-box suite ran against a freshly started default
`npm start` process on IPv4 loopback 3000/3002 with inherited access/session
keys removed: **17 scenarios, 15 passed, 0 failed, 2 skipped,
0 dependency-unavailable, 0 not-run**. `integration-reports/latest.html` and
`latest.json` preserve that real result. Independent transaction-total/report
assertions were not altered. Native SDK3 profile resolution and an authorized
read of the existing SQS queue attributes passed; the API itself then produced
six SDK3 SQS success acknowledgements (values withheld). CPMS report reads,
payment methods, confirmation and report reconciliation passed. This service
has no AWS read-only API route: its read-only API proof is CPMS, while real API
AWS proof is the already-approved SQS publication. Secrets Manager cloud reads
were not enabled (`USE_SECRETS_MANAGER=false`); its behavior is unit-tested.
SQS acceptance does not prove consumer delivery, and CPMS creation does not
prove card settlement.

Both reversal gaps remain: the owned card checkout is unfinished/unproved paid,
and the earlier cheque CPMS 218 rejection is unresolved. Neither was retried
or silently approved. No local fixture database exists; external CPMS
transactions/reports/SQS messages are intentionally not rolled back. The suite
released its lock and retained its private reconciliation manifest.
Only task-owned services were stopped; no user-owned service was stopped.
The private `.env` remains byte-identical and mode 600. The migration is
implemented and locally validated, but **stage completion is still gated by
the two real reversal gaps and unresolved development security findings**.

Feature-branch CI can upload these ZIPs to non-production S3; the default-branch
workflow can update Lambdas and releases can promote artifacts. Nothing in this
local migration authorizes push, deployment or merging with unresolved security
findings. External Terraform/live Lambda runtimes are separate and unverified;
repository Node24 settings alone do not upgrade infrastructure.
