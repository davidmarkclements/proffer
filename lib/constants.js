'use strict'

const KIND = Symbol('kind')
const START = Symbol('start')
const SIZE = Symbol('size')
const FUNC = Symbol('func')

const PROCESSED = Symbol('processed')

const PC = Symbol('pc')
const IS_EXT_CB = Symbol('is-ext-cb')
const EXT_CB_OR_TOS = Symbol('ext-cb-or-tos')
const VM_STATE = Symbol('vm-state')

module.exports = {
  KIND,
  START,
  SIZE,
  FUNC,
  PROCESSED,
  PC,
  IS_EXT_CB,
  EXT_CB_OR_TOS
}