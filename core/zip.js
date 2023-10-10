const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const minimatch = require('minimatch');

const DEFAULT_IGNORE_LIST = [
  '.*.swp',
  '._*',
  '.DS_Store',
  '.git',
  '.hg',
  '.npmrc',
  '.lock-wscript',
  '.svn',
  '.wafpickle-*',
  'config.gypi',
  'CVS',
  'npm-debug.log',
  'package-lock.json',
  '.deployconfig',
  '.gitignore',
  '.vercel'
];

const readdir = (root, dir = null, files = {}) => {
  fs.readdirSync(`${root}${dir ? '/' + dir : ''}`).forEach(filename => {
    let fullname = [dir, filename].filter(v => !!v).join('/');
    let fullpath = [root, fullname].join('/');
    if (fs.statSync(fullpath).isDirectory()) {
      readdir(root, fullname, files);
    } else {
      let file = fs.readFileSync(fullpath);
      files[fullname] = file;
    }
  });
  return files;
};

const shouldIgnore = function (filename, ignoreList) {
  for (let i = 0; i < ignoreList.length; i++) {
    let pattern = ignoreList[i];
    if (minimatch(filename, pattern, {matchBase: true})) {
      return true;
    }
  }
  return false;
};

module.exports = {

  readdir (root, ignorePathname = '.deployignore') {
    if (typeof root === 'string') {
      root = root.replaceAll('~', os.homedir());
    }
    if (typeof ignorePathname === 'string') {
      ignorePathname = ignorePathname.replaceAll('~', os.homedir());
    }
    let files = readdir(root);
    let ignoreList = files[ignorePathname] ? files[ignorePathname].toString() : '';
    ignoreList = ignoreList
      .split('\n')
      .concat(ignorePathname)
      .map(v => v.trim())
      .filter(v => v)
      .concat(DEFAULT_IGNORE_LIST)
      .map(v => {
        v = v.replace(/^\s(.*)\s$/, '$1');
        return v.endsWith('/') ? `${v}**` : v;
      });
    for (const filename in files) {
      if (shouldIgnore(filename, ignoreList)) {
        delete files[filename];
      }
    }
    return files;
  },

  pack (files) {
    let zip = new AdmZip();
    for (const filename in files) {
      zip.addFile(filename, files[filename], '', 0o777);
    }
    let buffer = zip.toBuffer();
    return buffer;
  },

  packdir (root, ignorePathname = '.deployignore') {
    let files = this.readdir(root, ignorePathname);
    return this.pack(files);
  }

};
