# Push release artifacts to lactame.com

## Inputs

### `token`

**Required** Authentication token for the upload.

### `name`

Name of the published library.

Defaults to `'name'` that is defined in `package.json`.

### `folder`

Folder that contains the artifacts to push.

Defaults to `'dist'`.

### `version`

Version to use for this publication.

Defaults to `'version'` that is defined in `package.json`. Allows to specify `HEAD` for example to deploy on each commit.

## Release

Release is done using github actions.
