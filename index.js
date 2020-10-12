'use strict';

const { createReadStream, createWriteStream } = require('fs');
const fs = require('fs').promises;
const path = require('path');
const pipeline = require('util').promisify(require('stream').pipeline);

const core = require('@actions/core');
const archiver = require('archiver');
const got = require('got');
const FormData = require('form-data');

const token = core.getInput('token', { required: true });
const name = core.getInput('name', { required: true });
const folder = core.getInput('folder') || 'dist';

(async () => {
  await checkFolder();
  const packageJson = await getPackageJson();
  const version = packageJson.version;

  // Create .zip archive to send
  const releaseDir = await fs.mkdtemp('lactame-release-');
  const releaseZip = `${releaseDir}.zip`;
  await fs.rename(folder, path.join(releaseDir, version));
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.directory(releaseDir + '/', name);
  archive.finalize();
  await pipeline(archive, createWriteStream(releaseZip));

  // Send .zip archive
  const form = new FormData();
  form.append('upfile', createReadStream(releaseZip), {
    filename: `${releaseDir}.zip`,
    contentType: 'application/zip',
  });
  form.append('token', token);
  try {
    await got.post(`https://direct.lactame.com/lib/upload.php`, {
      body: form,
    });
  } catch (e) {
    return core.setFailed(
      `Post error (${error.response.statusCode} - ${error.response.statusMessage}): ${error.response.body}`,
    );
  }

  core.info(
    `Release published to https://www.lactame.com/lib/${name}/${version}/`,
  );
})().catch((error) => {
  core.setFailed(error);
});

async function checkFolder() {
  try {
    const contents = await fs.readdir(folder);
    if (contents.length === 0) {
      throw new Error(`Folder "${folder}" is empty`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Folder "${folder}" does not exist`);
    }
    throw err;
  }
}

async function getPackageJson() {
  return JSON.parse(await fs.readFile('package.json', 'utf-8'));
}
