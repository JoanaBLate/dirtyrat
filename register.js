// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"

import { builtins, err } from "./helper.js"

import { getCurrentBranch } from "./function.js"


var rat

var currentFunction = "" // for global functions only

export function init(r) {
    rat = r
}

// imports ////////////////////////////////////////////////////////////////////

export function registerImport(pathToken, nameTokens) {
    const tokens = [ ]
    // import { first as second, } from ...
    while (nameTokens.length > 0) {
        const token = nameTokens.shift()  // the true import
        const nickToken = nameTokens.shift() // the optional nickname
        //
        tokens.push(token)
        //
        const nameToken = (nickToken == null) ? token : nickToken
        register(nameToken.value, nameToken)
        nameToken.isImport = true
    }
    //
    createAndRegisterImportObj(pathToken, tokens)
}

function createAndRegisterImportObj(pathToken, importTokens) {
    const path = makeImportPath(pathToken)
    const obj = { "path-token": pathToken, "import-tokens": importTokens }
    //
    const first = rat.imports[path]
    if (first == undefined) { rat.imports[path] = obj; return }
    //
    const msg = "js file already imported at row " + first["path-token"].row
    err(pathToken, msg)
}

function makeImportPath(token) {
    const path = (token.value).replace('"',"").replace('"',"")
    //
    if (path.startsWith("https://")) { return path }
    //
    if (path.startsWith("/")) { return Deno.cwd() + path }
    //
    if (path.startsWith("./")) { return Deno.cwd() + path.replace(".", "") }
    //
    err(token, "invalid file path: " + path)
}

// global variables ///////////////////////////////////////////////////////////

export function registerPublicVariable(token, isConstant) {
    if (isConstant) { token.isConstant = isConstant }
    const name = token.value
    register(name, token)
    rat.exports[name] = token
}

export function registerPrivateVariable(token, isConstant) {
    if (isConstant) { token.isConstant = isConstant }
    const name = token.value
    register(name, token)
}

// functions //////////////////////////////////////////////////////////////////

export function registerPublicFunction(token) {
    const name = token.value
    register(name, token)
    currentFunction = name
    rat.exports[name] = token
}

export function registerPrivateFunction(token) {
    const name = token.value
    register(name, token)
    currentFunction = name
}

export function registerInnerFunction(token) {
    const fullname = branchedName(token.value)
    register(fullname, token)
}

export function registerAnonymousFunction() {
    // pass
}

// parameters and local variables /////////////////////////////////////////////

export function registerParameter(token) {
    const fullname = branchedName(token.value)
    register(fullname, token)
}

export function registerLocalVariable(token, isConstant) {
    if (isConstant) { token.isConstant = isConstant }
    const fullname = branchedName(token.value)
    register(fullname, token)
}

//////////////////////////////////////////////////////////////////////////////

export function endGlobalFunction() { // good for main and init
    currentFunction = ""
}

///////////////////////////////////////////////////////////////////////////////

function register(fullname, token) {
    const first = rat.declareds[fullname]
    if (first == undefined) { rat.declareds[fullname] = token; return }
    //
    const msg = "name already declared at row " + first.row
    err(token, msg)
    return
}

///////////////////////////////////////////////////////////////////////////////

export function markUsed(token) { // not really marking the token
    const name = token.value
    if (builtins.indexOf(name) != -1) { return }
    //
    const fullname = branchedName(name)
    if (rat.useds[fullname] == undefined) { rat.useds[fullname] = token }
}

///////////////////////////////////////////////////////////////////////////////

function branchedName(name) {
    const branch = getCurrentBranch()
    if (branch == "") { return name }
    //
    return currentFunction + "." + branch + "." + name
}
