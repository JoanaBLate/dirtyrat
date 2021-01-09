// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"

import { tokenize } from "./tokenizer.js"

import { init as initExpression, eatExpression } from "./expression.js"

import { init as initFunction, eatGlobalFunction } from "./function.js"

import { err, unexpected } from "./helper.js"

import { init as initLitExpression, eatLiteralExpression } from "./expression-literal.js"

import { init as initScan, see, eat, eatValue, eatKind, eatName, eatString, eatTrueEndOfLine } from "./scan.js"

import { init as initRegister, registerImport, registerPrivateVariable, registerPublicVariable, registerPrivateFunction, registerPublicFunction, markUsed } from "./register.js"

var rat
var mayHaveGlobal

export function parse(r) {
    rat = r
    rat.tokens = tokenize(rat)
    initScan(rat)
    initFunction(rat)
    initRegister(rat)
    initExpression(rat)
    initLitExpression(rat)
    mayHaveGlobal = true
    eatUseStrict()
    eatImports()
    mainLoop()
}

// use strict /////////////////////////////////////////////////////////////////

function eatUseStrict() {
    const token = eat()
    if (token.value != '"use strict"') { err(token, 'missing "use strict"') }
    eatTrueEndOfLine()
}

// imports ////////////////////////////////////////////////////////////////////

function eatImports() {
    while (see().value == "import") { eatImport() }
}

function eatImport() {
    eat() // import
    eatValue("{")
    const nameTokens = eatImportNames() // also eats '}'
    eatValue("from")
    const fileToken = eatString()
    registerImport(fileToken, nameTokens)
    eatTrueEndOfLine()
}

function eatImportNames() {
    //
    // ASSUMES ALL NAMES HAVE NICKNAMES (name 'as' nickname)
    // INSERTS 'null' AS PLACEHOLDER FOR NICKNAME IF NEEDED
    //
    if (see().value == "}") { eat(); return [ ] }
    //
    const nameTokens = [ ]
    while (true) {
        nameTokens.push(eatName())
        if (see().value == "as") {
            eat()
            nameTokens.push(eatName())
        }
        else {
            nameTokens.push(null)
        }
        //
        const token = eat()
        if (token.value == ",") { continue }
        if (token.value == "}") { return nameTokens }
        //
        unexpected(token)
    }
}

// mainLoop ///////////////////////////////////////////////////////////////////

function mainLoop() {
    while (true) {
        const token = eat()
        if (token.value == "init")  { eatInitOrMain(token); break } // function demands end of file
        if (token.value == "main")  { eatInitOrMain(token); break } // function demands end of file
        if (token.value == "var")   { eatGlobal(token, false, false); continue }
        if (token.value == "const") { eatGlobal(token, false, true); continue }
        if (token.value == "function") { eatFunction(false); continue }
        if (token.value == "export")   { eatExport(); continue }
        if (token.kind == "end-of-file") { break }
        unexpected(token)
    }
}

// export /////////////////////////////////////////////////////////////////////

function eatExport() {
    const token = eat()
    if (token.value == "var")   { eatGlobal(token, true, false); return }
    if (token.value == "const") { eatGlobal(token, true, true); return }
    if (token.value == "function") { eatFunction(true); return }
    unexpected(token)
}

// global /////////////////////////////////////////////////////////////////////

function eatGlobal(token, isExporting, isConstant) {
    if (! mayHaveGlobal) { err(token, "can't declare global variable after function") }
    token = eatName()
    if (isExporting) {
        registerPublicVariable(token, isConstant)
    }
    else {
        registerPrivateVariable(token, isConstant)
    }
    token = eat()
    if (token.kind == "end-of-line") { return }
    if (token.value != "=") { unexpected(token) }
    eatLiteralExpression()
    eatTrueEndOfLine()
}

// function ///////////////////////////////////////////////////////////////////

function eatFunction(isExporting) {
    mayHaveGlobal = false
    if (isExporting) {
        registerPublicFunction(eatName())
    }
    else {
        registerPrivateFunction(eatName())
    }
    eatGlobalFunction()
    eatTrueEndOfLine()
}

// init or main ///////////////////////////////////////////////////////////////

function eatInitOrMain(token) {
    markUsed(token)
    //
    eatValue("(")
    eatArguments()
    eatValue(")")
    eatTrueEndOfLine()
    eatKind("end-of-file")

    function eatArguments() {
        if (see().value == ")") { return }
        eatArgument()
    }

    function eatArgument() {
        eatExpression()
        const kind = see().kind
        if (kind == ")") { return }
        if (kind == "end-of-line") {
            eat()
            if (see().kind == ")") { return }
            unexpected(eat())
        }
        const token = eat()
        if (token.value != ",") { unexpected(token) }
        eatArgument()
    }
}

//
