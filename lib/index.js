'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');
const _ = require('underscore');
const request = require('request');

class CrashReport {
  constructor(opts) {
    this.opts = opts;
    this.action = opts.action || [];

    // exit on crash
    this.exitOnCrash = opts.exitOnCrash || false;
    this.exitCode = opts.customExitCode === undefined || null ? 1: opts.customExitCode;

    // get the uncaught exception
    process.on('uncaughtException', this.handleCrash.bind(this));
  }

  /**
   * Endpoint: When a crash comes, it comes to this.
   */
  handleCrash(error) {
    const self = this;

    this.error = error.stack || error;
    this.crashInfo = {
      date: new Date(),
      execPath: process.execPath,
      argv: process.argv.join(', '),
      currentDirectory: process.cwd(),
      env: util.inspect(process.env),
      processTitle: process.title,
      uptime: process.uptime(),
      versions: util.inspect(process.versions),
      memoryUsage: util.inspect(process.memoryUsage()),
      error: this.error
    };

    this.doActions(() => {
      self.exit();
    });
  }

  doActions(fn) {
    // send http for now
    return this.actionSendHTTPRequest(fn);
  }

  exit() {
    const self = this;
    if (this.exitOnCrash) {
      process.nextTick(() => {
        process.exit(self.exitCode);
      });
    }
  }

  /////////////////////////////////////////////////////
  ////////// Built-in actions                  ////////
  ////////////////////////////////////////////////////

  /**
   * Send email when crash happens
   */
  actionSendMail() {
    // check before send mail
    if (this.action.indexOf('email') >= 0) {
      // TODO
    }
  }

  // to file to hard disk
  actionSaveFile() {
    const now = new Date();

    // out dir
    this.fileOutDir = path.normalize(this.opts.fileOutDir || process.cwd());
    const filename = path.resolve(
      util.format('%s/crash_%s-%s-%s_%s-%s-%s_%s_UTC.txt',
      this.fileOutDir,
      now.getUTCFullYear(),
      ('0' + (now.getUTCMonth() + 1)).slice(-2),
      ('0' + (now.getUTCDate())).slice(-2),
      ('0' + now.getUTCHours()).slice(-2),
      ('0' + now.getUTCMinutes()).slice(-2),
      ('0' + now.getUTCSeconds()).slice(-2),
      ('00' + now.getUTCMilliseconds()).slice(-3)
    ));

    if (this.action.indexOf('file') >= 0) {
      let content = [];
      const seperationLine = '\n-----------------------------\n';
      let data;

      _.each(this.crashInfo, (value, key) => {
        content.push(key + ':\n' + value);
      });

      data = content.join(seperationLine);

      if (fs.writeFileSync(filename, data) === undefined) {
        console.log('Crash file written at:', filename);
      } else {
        console.log('Failed to write file:', filename);
      }
    }
  }

  // send to ELK
  actionSendHTTPRequest(fn) {
    const actionHttpUrl = this.opts.actionHttpUrl;
    const actionHttpMethod = this.opts.actionHttpMethod || 'GET';
    const actionHttpTags = this.opts.actionHttpTags || [];
    const actionHttpNameId = this.opts.actionHttpNameId;

    if (this.action.indexOf('http') >= 0 && actionHttpUrl && actionHttpNameId) {
      const body = {
        data: _.extend(this.crashInfo, { nameId: actionHttpNameId }),
        tags: actionHttpTags
      };
      const requestOptions = {
        method: actionHttpMethod,
        url: actionHttpUrl,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      };

      // send request
      request(requestOptions, (error, response) => {
        if (response && response.statusCode < 300) {
          console.log('Action send http request success:', actionHttpUrl, actionHttpNameId);
        } else {
          console.log('Failed action send http request:', actionHttpUrl, actionHttpNameId);
        }

        return fn && fn();
      });
    }
  }
}

module.exports = CrashReport;
