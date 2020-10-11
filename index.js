'use strict';

const fs = require('fs').promises;
const path = require('path');

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
  await fs.rename(folder, path.join(releaseDir, version));
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.directory(releaseDir + '/', name);
  archive.finalize();

  // Send .zip archive
  const form = new FormData();
  form.append('upfile', archive, {
    filename: `${releaseDir}.zip`,
    contentType: 'application/zip',
  });
  form.append('token', token);
  const response = await got.post(`https://direct.lactame.com/lib/upload.php`, {
    body: form,
  });
  console.log(response.body);
  console.log(response.headers);

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
