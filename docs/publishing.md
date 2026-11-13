# Publishing and package verification

## Current distribution

Install the package archive from [GitHub Releases](https://github.com/duskmoth-dev/duskmoth-sdk/releases).
A prepared GitHub workflow is not evidence of an npm publication. Verify registry state yourself:

```sh
npm view @duskmoth-dev/sdk version --registry=https://registry.npmjs.org/
```

A 404 means the package is unavailable; do not use the registry installation command yet.
Check the release checksum before installing its `.tgz` archive.

## First npm publication: owner action

The GitHub credential is not an npm credential. The npm owner must control the
`@duskmoth-dev` scope and have publication rights. No npm token belongs in this repository.

1. Sign in to your npm account on your own trusted machine with `npm login`.
2. Check out the reviewed release tag and run `npm test` and `npm run check:package`.
3. Run `npm publish --access public` and complete npm's required authentication.
4. Verify the published version and package contents. This bootstrap publish does not
   have GitHub Actions provenance; do not claim it does.
5. In the package's npm settings, add a GitHub Actions trusted publisher:
   - Owner: `duskmoth-dev`
   - Repository: `duskmoth-sdk`
   - Workflow filename: `npm-publish.yml`
   - Environment: `npm-publish`
   - Allow direct `npm publish` for this workflow.
6. In GitHub repository settings, set the Actions variable
   `NPM_TRUSTED_PUBLISHING_READY` to `true` only after setup.

Configure the trusted publisher when you are ready to publish a **new** reviewed version:
new trust configurations expire if they are not validated by a successful publish within
the period documented by npm. npm does not permit overwriting an existing version.

## Subsequent releases: no long-lived npm token

The manual [npm workflow](https://github.com/duskmoth-dev/duskmoth-sdk/actions/workflows/npm-publish.yml)
accepts an existing GitHub release tag. It verifies that the release is published, not a draft,
and checks the tag against `package.json` before testing and packing.

Run it with `publish=false` to verify the package without publishing anything.
Set `publish=true` only after owner setup and explicit release approval. The publishing job uses
the `npm-publish` GitHub environment and short-lived OIDC credentials; it never uses the GitHub
personal access token as an npm token. Maintainers can add required reviewers to the environment.

Node.js 24 and npm >=11.5.1 are required in that job. The package is published publicly
with provenance from the public GitHub repository. No cache is used in the publishing job.
The artifact checked by the publishing job is the artifact submitted to npm.

## Release checks

- Run all offline tests and package checks.
- Scan the Git diff and extracted archives for keys, bearer proofs, private data, and local configuration.
- Review dependency changes; the SDK currently has none.
- Publish a GitHub release only after CI succeeds for that exact commit.
- Verify registry availability separately. Never label a dry run as a live npm release.

Official reference: https://docs.npmjs.com/trusted-publishers
