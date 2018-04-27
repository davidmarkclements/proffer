'use strict'

const { spawn } = require('child_process')
const { normalize } = require('path')
const { demangle } = require('demangle')
const split = require('split2')
const through = require('through2')
const pump = require('pump')

module.exports = function createLoader (opts) {
  return function load (lib) {
    const { stdout } = spawn(opts.nm, ['-n', normalize(lib.name)])
    const splitter = split()
    const output = through((line, _, cb) => {
      line = line.toString()
      const [ 
        addr, type, name
      ] = line.split(' ')
      
      cb(null, {addr, name: demangle(name) || name})
    })
    output._readableState.objectMode = true
    pump(stdout, split(), output)
    return output
  }
}
