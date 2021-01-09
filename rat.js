// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"


export function createRat(path, lines) {
    const rat = new Rat(path, lines)
    Object.seal(rat)
    return rat
}

// constructor ////////////////////////////////////////////////////////////////

function Rat(path, lines) {
    this.path = path
    this.lines = lines // already right trimmed
    this.tokens = null
    //
    this.imports = { } // fullpath: importObj
    this.exports = { } // fullname: token
    //
    this.declareds = { } // fullname: token // includes standard, import, export and constant
    this.useds = { } // fullname: token
}

//
