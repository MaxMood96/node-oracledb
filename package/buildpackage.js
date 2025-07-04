/* Copyright (c) 2018, 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   buildpackage.js
 *
 * DESCRIPTION
 *   Used by maintainers to create the npm package of node-oracledb.
 *   See README.md for details.
 *
 * USAGE
 *   Run this with 'npm run buildpackage'
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const execSync = require('child_process').execSync;
const nodbUtil = require('../lib/util.js');
const packageJSON = require("../package.json");

const jsStagingInfoFile = nodbUtil.RELEASE_DIR + '/oracledb-' + nodbUtil.PACKAGE_JSON_VERSION + '-js-buildinfo.txt';
let areBinariesAvailable = true;

let njsGitSha;
try {
  njsGitSha = execSync('git --git-dir=./.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
} catch (err) {
  njsGitSha = 'unknown NJS SHA';
}

// Save files that get overwritten
const origPackageJson = fs.readFileSync('package.json');
let origNpmignore;
if (fs.existsSync('.npmignore')) {
  origNpmignore = fs.readFileSync('.npmignore');
}

// Create the npm package
function packageUp() {
  console.log('Creating the npm package for node-oracledb ' + packageJSON.version);
  try {

    if (!fs.existsSync(nodbUtil.STAGING_DIR)) {
      areBinariesAvailable = false;
      console.warn("Directory '" + nodbUtil.STAGING_DIR + "' not found. Binaries for the thick mode will not be packaged.");
    }

    // Update package.json by setting an install script target to call
    // package/install.js and one that deletes unneeded binaries
    delete packageJSON.dependencies;
    delete packageJSON.devDependencies;
    packageJSON.scripts = {};
    packageJSON.scripts.install = 'node package/install.js';
    packageJSON.scripts.prune = 'node package/prunebinaries.js';
    fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, 2) + '\n');

    // Remove the directory & its contents
    try {
      fs.rmSync(nodbUtil.RELEASE_DIR, { recursive: true, force: true });
    } catch (err) {
      if (err && !err.message.match(/ENOENT/))
        console.error(err.message);
    }
    fs.mkdirSync(nodbUtil.RELEASE_DIR, { recursive: true, mode: 0o755 });
    // Copy all the staged files to the Release directory,
    // if the 'thick mode' binaries are needed
    if (areBinariesAvailable) {
      copyDir(nodbUtil.STAGING_DIR, nodbUtil.RELEASE_DIR);
    }

    // Record the SHA of the bundle's non-binary files
    fs.appendFileSync(jsStagingInfoFile, njsGitSha + "\n");

    // Don't include source code etc. in the npm package.  This is
    // done dynamically because .npmignore cannot exclude source code
    // by default otherwise compiling from a GitHub tag or branch
    // won't work.
    // Some of the entries already exist in the GitHub clone .npmignore file,
    // but they make building from a source bundle cleaner, because the source bundles
    // in GitHub releases don't contain .npmignore.
    fs.appendFileSync('.npmignore', '\n/odpi\n/src\nbinding.gyp\n/package/buildbinary.js\n/package/buildpackage.js\n/package/Staging\n/build/Makefile\n/build/oracledb.target.mk\n/build/Release/obj.target\n/build/binding.Makefile\n.gitattributes\n*.tgz\n');
    // Build the package
    execSync('npm pack');

  } catch (err) {
    console.error(err);
  } finally {
    // Undo changes to the repo
    fs.writeFileSync('package.json', origPackageJson);
    if (origNpmignore) {
      fs.writeFileSync('.npmignore', origNpmignore);
    } else {
      fs.unlinkSync('.npmignore');
    }
  }
}

// Copy a directory
function copyDir(srcDir, destDir) {
  try {
    const f = fs.readdirSync(srcDir);
    for (let i = 0; i < f.length; i++) {
      fs.copyFileSync(srcDir + '/' + f[i], destDir + '/' + f[i]);
      const mode = f[i].match(/\.txt$/) ? 0o644 : 0o755;
      fs.chmodSync(destDir + '/' + f[i], mode);
    }
  } catch (err) {
    console.error(err.message);
  }
}

//
// Main
//

packageUp();
