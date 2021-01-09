// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"


// extern import
import { existsSync } from "https://deno.land/std@0.81.0/fs/exists.ts"

// modules
import { createRat } from "./rat.js"
import { parse } from "./parser.js"
import { checkNames } from "./check-names.js"

// general
var root = ""
var rats = { } // { fullpath: rat }

// html mode
var htmlPath = ""
var htmlLines = [ ] // only the processed ones

// folder mode
var foldersToRead = [ ]


// main ///////////////////////////////////////////////////////////////////////

function main() {
    root = Deno.cwd() + "/"

    showOpenMessage()

    const home = Deno.env.get("HOME")
    if (root.length <= home.length) {
        console.log("ERROR: you must be in a subdirectory of your home directory")
        Deno.exit(1)
    }

    const options = Deno.args.slice(0, Deno.args.length) // cloning

    if (options.length == 0) { // read directory (deno)
        mainForFolder()
        return
    }

    const filename = options.shift() // extract and check filename
    if (! existsSync(filename)) {
        console.log("ERROR: file not found:", filename)
        Deno.exit(1)
    }

    if (options.length != 0) { // check option
        console.log("ERROR: not expecting option:", options[0])
        Deno.exit(1)
    }

    if (filename.endsWith(".js")) { mainForSingleJs (filename); return }

    if (filename.endsWith(".html")) { mainForHtml(filename); return }

    console.log("ERROR: file name must end with '.js' or '.html':", filename)
    Deno.exit(1)
}

function showOpenMessage() {
    console.log("\u001Bc") // *clears console perfectly* //
    console.log("running dirtyrat")
    console.log("   -- root is ", root)
    console.log("   -- accepts html file, js file or blank (current directory, recursively)")
    console.log("")
}

// single js mode /////////////////////////////////////////////////////////////

function mainForSingleJs (filename) {
    processJsFile(root + filename, true)
    checkNames(rats, true)
}

// folder mode ////////////////////////////////////////////////////////////////

function mainForFolder() {
    foldersToRead = [ root ]
    while (foldersToRead.length > 0) { readFolder() }
    checkNames(rats, false)
}

function readFolder() {
    const path = foldersToRead.shift()
    if (path.endsWith("/IGNORE/")) { return }
    console.log("reading folder:", path)
    const elements = Deno.readDirSync(path)
    for (const element of elements) { readElementInFolder(path + element.name) }
}

function readElementInFolder(path) {
    const stats = Deno.statSync(path)
    if (stats.isDirectory) { foldersToRead.push(path + "/"); return }
    //
    if (! stats.isFile) { return }
    //
    if (! path.toLowerCase().endsWith(".js")) { return }
    //
    processJsFile(path, false)
}

// html mode //////////////////////////////////////////////////////////////////

function mainForHtml(filename) {
    htmlPath = root + filename
    console.log("reading", htmlPath)
    const htmlText = Deno.readTextFileSync(htmlPath)
    fillRatsHtml(htmlText) // also parses
    checkNames(rats, false)
}

function fillRatsHtml(htmlText) {
    const lines = htmlText.split("\n")
    while (lines.length != 0) {
        const line = lines.shift()
        htmlLines.push(line)
        const trim = line.trim()
        if (! trim.startsWith("<script type=\"module\" src=")) { continue }
        fillRatsOnceHtml(trim)
    }
}

function fillRatsOnceHtml(trim) {
    // if there is content after "</script>", path will raise error
    let path = trim.replace('<script type=\"module\" src="', "").replace('"></script>', "")
    if (path[0] == "/") { path = path.substr(1) }
    path = root + path
    //
    if (! existsSync(path)) {
        console.log("ERROR: link path not found:", path)
        Deno.exit(1)
    }
    //
    if (! path.toLowerCase().endsWith(".js")) {
        console.log("ERROR: bad file name extension:", path)
        Deno.exit(1)
    }
    //
    processJsFile(path, false)
}

// processing /////////////////////////////////////////////////////////////////

function processJsFile(path, verbose) { // existence already checked
    //
    if (! path.endsWith(".js")) {
        console.log("ERROR: bad casing for extension:", path)
        Deno.exit(1)
    }
    //
    // trimRight exlcudes dirty EOF and despisable blank lines //
    const text = Deno.readTextFileSync(path).trimRight()
    //
    if (verbose) { console.log("reading file:", path) }
    //
    if (rats[path] != undefined) {
        console.log("ERROR: duplicated path:", path)
        Deno.exit(1)
    }
    //
    const lines = text.split("\n")
    for (let n = 0; n < lines.length; n++) { lines[n] = lines[n].trimRight() }
    const rat = createRat(path, lines)
    parse(rat)
    rats[path] = rat
}

// boot ///////////////////////////////////////////////////////////////////////

main()

//
