'use strict'

const sorted = require('sorted-array-functions')

module.exports = sharedLibrary

// [0] event (shared-library)
// [1] library path (/usr/lib/libc++.1.dylib)
// [2] start address (0x7fff90cfb5a0)
// [3] end address (0x7fff90d42f87)
// [4] aslr slide (129732608)

function sharedLibrary (state) {
  return function (line, cb) {
    const [ 
      event, lib, start, end, slide 
    ] = line.split(',')
    const name = lib[0] === '"' ? lib.substr(1, lib.length - 2) : lib
    const type = 'LIB'
    const startn = parseInt(start, 16)
    state.code[startn] = { name, start, end, slide, type }
    sorted.add(state.addresses, startn)
    cb()
  }
}