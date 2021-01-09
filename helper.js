// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"

export const keywords = [ "break", "case", "const", "continue", "debugger", "default", "delete",
                     "do", "else", "false", "for", "function", "if", "in", "let", "new", "null",
                     "return", "switch", "this", "throw", "true", "typeof", "undefined", "var",
                     "while", "with", "yeld", "try", "catch", "finally", "export", "import" ]


export const builtins = [ "document", "window", "console", "setTimeout", "setInterval", "parseInt",
                     "parseFloat", "Math", "this", "localStorage", "Image", "XMLHttpRequest",
                     "prototype", "require", "module", "Date", "alert", "confirm",
                     "prompt", "screen", "Object", "Function", "isNaN", "Int8Array", "navigator",
                     "FileReader", "encodeURIComponent", "Option", "String", "AudioContext", "Array",
                     "CanvasGradient", "__dirname", "__filename", "requestAnimationFrame", "JSON",
                     "getComputedStyle", "Deno" ]



export function expecting(token, msg) {
    msg = makeUnexpectedMessage(token) + " (expecting " + msg +")"
    error(token.rat, token.row, token.col, msg)
}

export function unexpected(token) {
    const msg = makeUnexpectedMessage(token)
    error(token.rat, token.row, token.col, msg)
}

export function err(token, msg) {
    error(token.rat, token.row, token.col, msg)
}

export function error(rat, row, col, msg) {
    console.log("\n" + rat.path + "   (" + row + ":" + col +")")
    console.log("ERROR: " + msg)
    const line = rat.lines[row - 1]
    console.log(line.replace("\r", ""))
    printDots(col)
    Deno.exit(1)
}

///////////////////////////////////////////////////////////////////////////////

function makeUnexpectedMessage(token) {
    let msg = "unexpected token"
    if (token.kind == "end-of-line") { msg = "unexpected end of line" }
    if (token.kind == "end-of-file") { msg = "unexpected end of file" }
    return msg
}

function printDots(col) {
    let cursor = ""
    for (let i = 0; i < col - 1; i += 1) { cursor += "." }
    console.log(cursor + "^")
}

//
