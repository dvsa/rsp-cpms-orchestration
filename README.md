# RSP CPMS Orchestration API
#### The below environment variables should be acquired and set locally for the API to run correctly

#### Pre-requisites
Although Serverless Framework is being used solely for local development purposes, you still need a `[default]` AWS profile in `~/.aws/credentials` in order for for you to run the app locally.

#### Description
This API will handle all requests to CPMS. This API is being put in place to deal with cold-start warm up times experienced when lambdas are contained on VPC's
