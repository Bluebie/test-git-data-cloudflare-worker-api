// uses the fetch api to communicate with github
// initialised with options:
//   user: 'string name of user account',
//   repo: 'string name of repository',
//   branch: 'string name of branch',
//   token: 'private key for this application'
const { Buffer } = require('buffer')
const fetch = require('node-fetch')

class GHDirectoryEntry {
  constructor(json) {
    this.name = json.name
    this.type = json.type
    this.size = json.size
    this.target = json.target
    this.path = json.path
    this.sha = json.sha
    this.url = json.url
    this.download_url = json.download_url
  }

  isFile() { return this.type == 'file' }
  isDirectory() { return this.type == 'dir' }
  isSymbolicLink() { return this.type == 'symlink' }
  isBlockDevice() { return false }
  isCharacterDevice() { return false }
  isFIFO() { return false }
  isSocket() { return false }
}

class GHFile {
  constructor(json) {
    this.name = json.name
    this.path = json.path
    this.sha = json.sha
    if (json.content) this.content = Buffer.from(json.content, json.encoding)
    this.download_url = json.download_url
  }

  toString(...args) {
    return this.content.toString(...args)
  }
}

class GithubFilesystem {
  constructor(settings = {}) {
    this.settings = {
      ...settings
    }

    this.defaultHeaders = {
      "user-agent": "@Bluebie github-filesystem.js",
      "accept": "application/vnd.github.v3+json",
      "authorization": `token ${this.settings.token}`
    }
  }

  // asyncronously return 
  async readdir(path, options = {}) {
    let fetchResult = await fetch(`https://api.github.com/repos/${this.settings.user}/${this.settings.repo}/contents/${path}`, {
      method: 'GET', headers: this.defaultHeaders
    })
    let jsonOutput = await fetchResult.json()
    if (options.withFileTypes) {
      return jsonOutput.map(x => new GHDirectoryEntry(x))
    } else {
      return jsonOutput.map(x => x.name)
    }
  }

  // asyncronously reads a file from the current version of the database
  // eventually returns a fetch response, which you can call .text, .json, .arrayBuffer, etc on.
  async readFile(path) {
    console.log("executing fetch...")
    let fetchResult = await fetch(`https://api.github.com/repos/${this.settings.user}/${this.settings.repo}/contents/${path}`, {
      method: 'GET', headers: this.defaultHeaders
    })
    console.log("fetch complete, requesting json object")
    let jsonText = await fetchResult.text()
    console.log("have text:", jsonText)
    return new GHFile(JSON.parse(jsonText))
  }

  async updateFile(existingFile, newData, message = "App user update") {
    let encoding = 'base64'
    let body = {
      message,
      content: Buffer.from(newData).toString(encoding),
      committer: this.settings.committer,
      sha: existingFile.sha
    }
    let fetchResult = await fetch(`https://api.github.com/repos/${this.settings.user}/${this.settings.repo}/contents/${existingFile.path}`, {
      method: 'PUT', headers: {
        ... this.defaultHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify(body)
    })
    return new GHFile({
      encoding,
      ...body,
      ...(await fetchResult.json()).content
    })
  }

  async createFile(path, data, message = "App user create") {
    return this.updateFile({ path, sha: undefined }, data, message)
  }

  async deleteFile(existingFile, message = "App user delete") {
    let body = {
      message,
      committer: this.settings.committer,
      sha: existingFile.sha
    }
    let fetchResult = await fetch(`https://api.github.com/repos/${this.settings.user}/${this.settings.repo}/contents/${existingFile.path}`, {
      method: 'DELETE', headers: {
        ... this.defaultHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify(body)
    })
    return (fetchResult.status == 200)
  }
}

module.exports = GithubFilesystem