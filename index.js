import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import core from '@actions/core';
import archiver from 'archiver';
import got from 'got';
import FormData from 'form-data';

const token = core.getInput('token', { required: true });
const folder = core.getInput('folder') || 'dist';

await checkFolder();
const packageJson = await getPackageJson();
const version = core.getInput('version') || packageJson.version;
const name = core.getInput('name') || packageJson.name;
core.info('Package name: ' + name);

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

  core.info(
    `Release published to https://www.lactame.com/lib/${name}/${version}/`,
  );
} catch (error) {
  core.setFailed(
    `Post error (${error.response.statusCode} - ${error.response.statusMessage}): ${error.response.body}`,
  );
}

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
