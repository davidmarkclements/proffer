'use strict'

const { spawn } = require('child_process')
const { normalize } = require('path')
const split = require('split2')
const through = require('through2')
const pump = require('pump')

module.exports = function createLoader (opts) {
  return function load (lib) {
    const dynamics = spawn(opts.nm, ['-C', '-n', '-D', normalize(lib.name)])
    const statics = spawn(opts.nm, ['-C', '-n', normalize(lib.name)])
    const output = through((line, _, cb) => {
      line = line.toString()
      const [
        addr, /* type */, ...rest
      ] = line.split(' ')
      const name = rest.join(' ')
      cb(null, {addr, name})
    })
    output._readableState.objectMode = true
    const splitter = split()
    pump(statics.stdout, splitter, output)
    pump(dynamics.stdout, splitter, output)
    return output
  }
}
