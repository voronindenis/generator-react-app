/* eslint-disable no-console */
'use strict';

const { spawnSync } = require('child_process');
const semver = require('semver');
const extend = require('lodash.merge');
const Generator = require('yeoman-generator');
const parseAuthor = require('parse-author');
const path = require('path');
const validatePackageName = require('validate-npm-package-name');
const localPackageJson = require('../../package.json');

module.exports = class extends Generator {
  _askFor() {
    const prompts = [
      {
        name: 'name',
        message: 'Enter app name',
        when: !this.props.name,
        default: process.cwd().split(path.sep).pop()
      },
      {
        name: 'description',
        message: 'Enter description',
        when: !this.props.description
      },
      {
        name: 'authorName',
        message: 'Enter author\'s name',
        when: !this.props.authorName,
        default: this.user.git.name(),
        store: true
      },
      {
        name: 'authorEmail',
        message: 'Enter author\'s email',
        when: !this.props.authorEmail,
        default: this.user.git.email(),
        store: true
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = extend(this.props, props);
      const packageNameValidity = validatePackageName(this.props.name);
      if (!packageNameValidity.validForNewPackages) {
        const error = packageNameValidity.errors && packageNameValidity.errors[0] ||
          'The name option is not a valid npm package name.';
        console.log(error);
        process.exit(1);
      }
    });
  }

  initializing() {
    this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    const show = spawnSync('npm', ['show', '@denis_voronin/generator-react-app', 'version']);
    const genVersionFromNpm = show.stdout.toString().trim();
    if (semver.gt(genVersionFromNpm, localPackageJson.version)) {
      console.log(`There's an updated version of @denis_voronin/generator-react-app v${genVersionFromNpm} ` +
        `(you have ${localPackageJson.version}), please run "npm i -g @denis_voronin/generator-react-app" to upgrade`);
      process.exit(1);
    }

    // Pre set the default props from the information we have at this point
    this.props = {
      name: this.pkg.name,
      description: this.pkg.description,
      version: this.pkg.version,
      homepage: this.pkg.homepage,
      repositoryName: this.options.repositoryName
    };

    if (typeof this.pkg.author === 'object') {
      this.props.authorName = this.pkg.author.name;
      this.props.authorEmail = this.pkg.author.email;
      this.props.authorUrl = this.pkg.author.url;
    } else if (typeof this.pkg.author === 'string') {
      const info = parseAuthor(this.pkg.author);
      this.props.authorName = info.name;
      this.props.authorEmail = info.email;
      this.props.authorUrl = info.url;
    }
  }

  prompting() {
    return this._askFor();
  }

  writing() {
    this.fs.copy(
      this.templatePath('react-app-template/**'),
      this.destinationRoot(),
      { globOptions: { dot: true } }
    );

    const currentPkg = this.fs.readJSON(this.destinationPath('package.json'), {});

    const pkg = extend(
      {
        name: this.props.name,
        version: '0.0.1',
        description: this.props.description,
        homepage: this.props.homepage,
        author: {
          name: this.props.authorName,
          email: this.props.authorEmail
        },
        files: ['lib'],
        keywords: [],
        engines: {
          npm: '>= 10.0.0'
        }
      },
      currentPkg
    );

    this.fs.writeJSON(this.destinationPath('package.json'), pkg);
  }

  installing() {
    this.npmInstall();
  }
};
