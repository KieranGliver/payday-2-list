# Infrastructure

The AWS resources were created by hand in the console, not by IaC. This file is
therefore the only record of what exists and how it fits together — if the
stack were lost, this is what you would rebuild from.

Everything lives in **`us-east-2`**, account **`227415629009`**, except where
noted.

## What exists

| Resource              | Name / id                                            |
| --------------------- | ---------------------------------------------------- |
| S3 bucket             | `pd2-tracker-dev-227415629009-us-east-2-an`          |
| CloudFront            | `EG8NVRFZ6H85A` → `d2w66v72qyi29x.cloudfront.net`    |
| Lambda                | `get-pd2-results` — `nodejs24.x`, arm64, 10s timeout |
| Lambda execution role | `get-pd2-results-role-p8mry7nr`                      |
| SSM parameter         | `/pd2-tracker/dev/steam-api-key` (SecureString)      |
| Deploy role           | `pd2-tracker-github-deploy`                          |
| OIDC provider         | `token.actions.githubusercontent.com`                |

```
browser ──► CloudFront EG8NVRFZ6H85A
              ├── default  ──► S3 bucket      (OAC, bucket stays private)
              └── /api/*   ──► Lambda URL     (OAC, AWS_IAM auth)
                                 └──► Steam Web API (key from SSM)
```

## The parts that are easy to get wrong

**The bucket is private.** It is reachable only through CloudFront's Origin
Access Control; all four Block Public Access flags stay on. Do not enable S3
static website hosting — that is the legacy path and requires a public bucket.

**Default root object is `index.html`.** Without it, `/` returns
`AccessDenied`, because CloudFront asks S3 for an empty key and a private
bucket will not admit the object does not exist. It looks exactly like a
permissions fault and is not one.

**The `/api/*` behaviour must not use `CachingOptimized`.** It uses
`CachingDisabled` plus the `AllViewerExceptHostHeader` origin request policy.
`CachingOptimized` strips query strings and caches responses, which would serve
stale achievement data. Lambda function URLs also reject a forwarded `Host`
header, which is why it is the _ExceptHostHeader_ variant.

**The Lambda function URL needs two permissions, not one.** OAC requires both
`lambda:InvokeFunctionUrl` _and_ `lambda:InvokeFunction` granted to
`cloudfront.amazonaws.com`. With only the first, every request returns 403 and
the function is never invoked.

```bash
aws lambda add-permission --function-name get-pd2-results \
  --statement-id AllowCloudFrontInvoke --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn arn:aws:cloudfront::227415629009:distribution/EG8NVRFZ6H85A \
  --function-url-auth-type AWS_IAM

aws lambda add-permission --function-name get-pd2-results \
  --statement-id AllowCloudFrontServicePrincipalInvokeFunction \
  --action lambda:InvokeFunction --principal cloudfront.amazonaws.com \
  --source-arn arn:aws:cloudfront::227415629009:distribution/EG8NVRFZ6H85A
```

**The OIDC subject carries numeric ids.** GitHub issues it as
`repo:OWNER@<owner_id>/REPO@<repo_id>:ref:refs/heads/BRANCH`, _not_ the
documented `repo:OWNER/REPO:ref:…` form that appears in every tutorial. A trust
policy using the documented shape is silently rejected with "Not authorized to
perform sts:AssumeRoleWithWebIdentity". The working value is in
[`iam/github-actions-trust-policy.json`](iam/github-actions-trust-policy.json).

## IAM policies

Applied by hand; kept here so the live state is at least documented.

```bash
# deploy role (S3 write, CloudFront invalidation, Lambda code update)
aws iam put-role-policy --role-name pd2-tracker-github-deploy \
  --policy-name pd2-tracker-deploy \
  --policy-document file://infra/iam/github-actions-permissions-policy.json

# lambda execution role (read the Steam key)
aws iam put-role-policy --role-name get-pd2-results-role-p8mry7nr \
  --policy-name pd2-read-steam-key \
  --policy-document file://infra/iam/lambda-execution-policy.json
```

Both are least-privilege: scoped to the one bucket, the one distribution, the
one function and the one SSM parameter.

## Configuration

**Lambda environment:**

|                       |                                     |
| --------------------- | ----------------------------------- |
| `STEAM_API_KEY_PARAM` | `/pd2-tracker/dev/steam-api-key`    |
| `PD2_PLAYERS`         | `<steamid>:<name>,<steamid>:<name>` |

The API key itself is only ever in SSM — never in the function config, never in
the repo, never in GitHub.

**GitHub Actions variables** (not secrets — none of these are credentials):
`AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`,
`LAMBDA_FUNCTION_NAME`.

There are no long-lived AWS credentials. GitHub mints a short-lived OIDC token
per run and AWS exchanges it for ~1 hour of access, limited to that repo on
`master` by the trust policy.

## Deploy

`deploy.yml` triggers on CI completing successfully, never on push directly —
otherwise the two race and a broken commit can ship while CI is still going
red. It assumes the deploy role, then:

1. syncs hashed assets with `max-age=31536000,immutable`
2. uploads `index.html` separately with `no-cache`
3. updates the Lambda code
4. invalidates `/` and `/index.html`

Step 2 is not optional. S3 sends no `Cache-Control`, so CloudFront would apply
a one-day default TTL to `index.html` and deploys would appear to do nothing
for a day.

## Cost

Effectively nothing: CloudFront's free tier, a Lambda invoked a few times an
hour, ~300 kB in S3 and one standard SSM parameter.

## If you ever want IaC

Nothing here depends on being hand-made. The awkward parts are the OAC wiring
and the OIDC trust subject, both documented above. CDK would be the natural
choice given the repo is already TypeScript.
