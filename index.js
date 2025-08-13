import { createWriteStream, openAsBlob } from 'node:fs';
import { mkdtemp, readdir, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import core from '@actions/core';
import archiver from 'archiver';

const token = core.getInput('token', { required: true });
const folder = core.getInput('folder') || 'dist';

await checkFolder();
const packageJson = await getPackageJson();
const version = core.getInput('version') || packageJson.version;
const name = core.getInput('name') || packageJson.name;
core.info('Package name: ' + name);

// Create .zip archive to send
const releaseDir = await mkdtemp('lactame-release-');
const releaseZip = `${releaseDir}.zip`;
await rename(folder, join(releaseDir, version));
const archive = archiver('zip', { zlib: { level: 9 } });
archive.directory(releaseDir + '/', name);
archive.finalize();
await pipeline(archive, createWriteStream(releaseZip));

// Send .zip archive
const form = new FormData();
const releaseZipBlob = await openAsBlob(releaseZip);
form.append('upfile', releaseZipBlob, `${releaseDir}.zip`);
form.append('token', token);

const res = await fetch(`https://direct.lactame.com/lib/upload.php`, {
  method: 'POST',
  body: form,
});

if (res.ok) {
  core.info(
    `Release published to https://www.lactame.com/lib/${name}/${version}/`,
  );
} else {
  const text = await res.text();
  core.setFailed('Upload failed: ' + text);
}

async function checkFolder() {
  try {
    const contents = await readdir(folder);
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
  return JSON.parse(await readFile('package.json', 'utf-8'));
}
