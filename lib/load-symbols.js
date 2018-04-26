'use strict'

const { spawn } = require('child_process')
const { demangle } = require('demangle')
const sorted = require('sorted-array-functions')
const pump = require('pump')
const split = require('split2')
const through = require('through2')
const { normalize } = require('path')
const { PROCESSED, MANGLED_NAME } = require('./constants')

module.exports = createLoadSymbols 

function createLoadSymbols (state) {
    
    const { opts } = state

    return loadSymbols

    function loadSymbols (lib, cb) {
      if (lib[PROCESSED] === true) {
        cb()
        return
      }
      const { start, end, slide } = lib
      const { stdout } = spawn(opts.nm, ['-n', normalize(lib.name)])
      pump(stdout, split(), through((line, _, next) => {
        line = line.toString()

        const [ 
          addr, type, name
        ] = line.split(' ')
        
        // undefined symbols:
        if (!addr) {
          next()
          return
        }

        // avoid overwriting lib with lib start address
        if (name === 'start') {
          next() 
          return
        }
        
        const startn = parseInt(start, 16)
        const endn = parseInt(end, 16)
        const sliden = parseInt(slide, 10)

        var addrn = parseInt(addr, 16)

        addrn += (
          (addrn < startn - sliden && addrn < endn - startn) ? 
            startn : 
            sliden
        )

        // duplicates (names may differ slightly...)
        if (addrn in state.code && state.code[addrn][MANGLED_NAME].length >= name.length) {
          next()
          return
        }

        state.code[addrn] = { 
          name: demangle(name) || name,
          [MANGLED_NAME]: name,
          lib: lib,
          start: '0x' + addrn.toString(16), 
          type: 'CPP' 
        }

        sorted.add(state.addresses, addrn)

        next()
      }), (err) => {
        lib[PROCESSED] = true
        cb(err)
      })
  }
}




  // function win (line, cb) {
  //   // todo - read mapfile

  //   cb()
  // }

  // function unix (line, cb) {
  //   // todo
    
  //   // const [ 
  //   //   event, lib, start, end, aslrSlide 
  //   // ] = line.split(',')
    
  //   // const { stdout } = spawn('nm', ['-C', '-n', '-S', libName])
  //   // spawn('nm', ['-C', '-n', '-S', '-D', libName])

  //   cb()
  // }