// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"


import { err } from "./helper.js"

var isSingleJs = true

var rats

var missingFiles = { } // path: token

var internalUnuseds = [ ]
var internalUnknowns = { } // fullname: token

var unusedExports = [ ]
var unknownImports = [ ]


export function checkNames(rs, singleJs) {
    isSingleJs = singleJs
    rats = rs
    const paths = Object.keys(rats)
    //
    for (const path of paths) {
        const rat = rats[path]
        //
        markUseOnDeclareds(rat) // fills internalUnknowns and checks forbidden assignments
        checkImports(rat) // fills unknownImports; also marks exporteds elsewhere
    }
    //
    for (const path of paths) {
        const rat = rats[path]
        fillUnusedExports(rat) // must come before fillUnuseds
        fillUnuseds(rat)
    }
    //
    warnMissingFiles()
    warnUnusedExports()
    warnUnknownImports()
    warnInternalUnuseds()
    warnInternalUnknowns()
}

// mark useds /////////////////////////////////////////////////////////////////

function markUseOnDeclareds(rat) { // fills internalUnknowns and checks forbidden assignments
    for (const [fullname, token] of Object.entries(rat.useds)) {
        markUseOnDeclared(rat.declareds, fullname, token)
    }
}

function markUseOnDeclared(declareds, fullname, usedToken) {
    let name = fullname
    //
    while (true) {
        const declarToken = declareds[name]
        if (declarToken != undefined) { markUseOnDeclaredNow(declarToken, usedToken); return }
        // searching declared in outer scope:
        if (name.indexOf(".") == -1) { break }
        name = shiftName(name)
    }
    // declared not found
    if (internalUnknowns[name] != undefined) { return }
    internalUnknowns[name] = usedToken
}

function shiftName(name) {
    const parts = name.split(".")
    const tail = parts.pop()
    parts.pop()
    parts.push(tail)
    return parts.join(".")
}

function markUseOnDeclaredNow(declarToken, usedToken) {
    declarToken.wasUsed = true
    if (! usedToken.wasAssigned) { return }
    //
    let msg = ""
    if (declarToken.isImport) { msg = "can not assign to imported element" }
    if (declarToken.isConstant) { msg = "can not assign to constant" }
    if (msg == "") { return }
    err(usedToken, msg)
}

// check imports //////////////////////////////////////////////////////////////

function checkImports(rat) { // fills unknownImports; also marks exporteds elsewhere
    for (const [path, importObj] of Object.entries(rat.imports)) {
        checkImports2(path, importObj)
    }
}

function checkImports2(importPath, importObj) {
    if (importPath.startsWith("https://")) { return }
    //
    const exporter = rats[importPath]
    if (exporter == undefined) {
        const token = importObj["path-token"]
        missingFiles[importPath] = token
        return
    }
    //
    const imports = importObj["import-tokens"]
    const exports = Object.values(exporter.exports)
    for (const token of imports) { checkImports3(token, exports) }
}

function checkImports3(importToken, exports) {
    for (const token of exports) {
        if (token.value == importToken.value) { token.wasExported = true; return }
    }
    unknownImports.push(importToken)
}

///////////////////////////////////////////////////////////////////////////////

function fillUnusedExports(rat) {
    for (const token of Object.values(rat.exports)) {
        if (token.wasExported) { continue }
        unusedExports.push(token)
    }
}

///////////////////////////////////////////////////////////////////////////////

function fillUnuseds(rat) {
    for (const token of Object.values(rat.declareds)) {
        if (token.wasUsed) { continue }
        if (token.wasExported) { continue }
        if (unusedExports.indexOf(token) != -1) { continue } // avoiding double warning
        internalUnuseds.push(token) // includes exported names
    }
}

///////////////////////////////////////////////////////////////////////////////

function warnMissingFiles() {
    for (const [path, token] of Object.entries(missingFiles)) {
        console.log("\n" + token.rat.path + "   (" + token.row + ":" + token.col + ")")
        const msg = isSingleJs ? "not checking" : "could not find"
        console.log("Warning: "  + msg  + " module: " + path)
    }
}

///////////////////////////////////////////////////////////////////////////////

function warnUnusedExports() {
    for (const token of unusedExports) {
        console.log("\n" + token.rat.path + "   (" + token.row + ":" + token.col + ")")
        console.log("Warning: unused export: " + token.value)
    }
}

///////////////////////////////////////////////////////////////////////////////

function warnUnknownImports() {
    for (const token of unknownImports) {
        console.log("\n" + token.rat.path + "   (" + token.row + ":" + token.col + ")")
        console.log("Warning: UNKNOWN IMPORT: " + token.value)
    }
}

///////////////////////////////////////////////////////////////////////////////

function warnInternalUnuseds() {
    for (const token of internalUnuseds) {
        if (token.value.startsWith("__")) { continue }
        console.log("\n" + token.rat.path + "   (" + token.row + ":" + token.col + ")")
        console.log("Warning: unused element: " + token.value)
    }
}

///////////////////////////////////////////////////////////////////////////////

function warnInternalUnknowns() {
    for (const token of Object.values(internalUnknowns)) {
        console.log("\n" + token.rat.path + "   (" + token.row + ":" + token.col + ")")
        console.log("*** UNKNOWN NAME WARNING ***: " + token.value)
    }
}

//
