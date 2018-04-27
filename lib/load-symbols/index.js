'use strict'

const { spawn } = require('child_process')

const sorted = require('sorted-array-functions')
const pump = require('pump')
const split = require('split2')
const through = require('through2').obj
const createLoader = require('./' + process.platform)
const { normalize } = require('path')
const { PROCESSED } = require('../constants')


module.exports = createLoadSymbols 

function createLoadSymbols (state) {
    
    const { opts } = state
    const load = createLoader(opts)

    return loadSymbols

    function loadSymbols (lib, cb) {
      if (lib[PROCESSED] === true) {
        cb()
        return
      }
      const { start, end, slide } = lib
      const startn = parseInt(start, 16)
      const endn = parseInt(end, 16)
      const sliden = parseInt(slide, 10)
      
      pump(load(lib), through(({addr, name}, _, next) => {
        
        // undefined symbols:
        if (!addr) {
          next()
          return
        }

        var addrn = parseInt(addr, 16)

        if (addrn === 0) {
          next()
          return
        }

        addrn += (
          (addrn < startn - sliden && addrn < endn - startn) ? 
            startn : 
            sliden
        )

        // duplicates (names may differ slightly...)
        if (addrn in state.code && state.code[addrn].name.length >= name.length) {
          next()
          return
        }

        state.code[addrn] = { 
          name: name,
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