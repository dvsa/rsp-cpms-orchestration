# RSP CPMS Orchestration API
#### The below environment variables should be acquired and set locally for the API to run correctly

#### Pre-requisites
Although Serverless Framework is being used solely for local development purposes, you still need a `[default]` AWS profile in `~/.aws/credentials` in order for for you to run the app locally.

#### Description
This API will handle all requests to CPMS. This API is being put in place to deal with cold-start warm up times experienced when lambdas are contained on VPC's

Running NodeJS 16.16

## Run locally
- `nvm use`
- `npm i`
- `npm run start`

## Package for development
- `npm run build`

## Package for production
- `npm run build:prod`

## To run unit tests

- `npm run test`

## To Lint

- `npm run lint`

## To auto fix linting errors

- `npm run lint:fix`

## To Note

SAM is a new addition and is being used for building for running locally and for packaging for production - using the `template.yaml` file.

Serverless is being used for running locally from the built files. Ideally SAM will be used for packaging and running locally going forward and the serverless config can be removed.
