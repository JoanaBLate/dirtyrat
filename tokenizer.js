// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"

// converts single line remark to <EOL>

import { createToken, tokenToString } from "./token.js"

import { keywords, error } from "./helper.js"

var rat
var lines
var tokens
var line
var row
var col
var lastKind

export function tokenize(r) {
//  console.log(" ROW:COL               KIND VALUE\n")
    rat = r
    lines = [ ]
    for (let n = 0; n < rat.lines.length; n++) { lines.push(rat.lines[n]) } // already right trimmed
    tokens = [ ]
    line = null
    row = 0
    col = 0
    eatTokens()
    return tokens
}

function eatTokens() {
    lastKind = "end-of-line"
    while (true) {
        const token = eatGoodToken()
        if (token == null) { continue }
//      console.log(tokenToString(token))
        tokens.push(token)
        lastKind = token.kind
        if (token.kind == "end-of-file") { break }
    }
}

function eatGoodToken() {
    const token = eatToken()
    token.rat = rat
//  console.log(tokenToString(token))
    const kind = token.kind
    if (kind == "white-space") { return null }
    if (kind == "long-remark") { return null }
    if (kind == ";") {
        if (lastKind == ";") { return null }
        if (lastKind == "end-of-line") { return null }
        return token
    }
    if (kind == "end-of-line") {
        if (lastKind == ";") { return null }
        if (lastKind == "end-of-line") { return null }
        if (lineExpectsContinuation()) { return null }
        return token
    }
    return token
}

function lineExpectsContinuation() {
    if (lastKind == "+") { return true }
    if (lastKind == "+") { return true }
    if (lastKind == "=") { return true }
    if (lastKind == "<") { return true }
    if (lastKind == "(") { return true }
    if (lastKind == "[") { return true }
    if (lastKind == "{") { return true }
    if (lastKind == ",") { return true }
    if (lastKind == ".") { return true }
    if (lastKind == ":") { return true }
    if (lastKind == "&") { return true }
    return false
}

// core ///////////////////////////////////////////////////////////////////////

function eatToken() {

    const single = eatChar()

    if (single == "") { return eatEndOfFile() }

    if (single == "\n") { return eatEndOfLine(single) }

    if (single == " ") { return eatWhiteSpace(single) }

    if (single == '"') { return eatString(single) }

    if (single == "'") { return eatString(single) }

    if (single == "`") { return eatLongString(single) }

    if (isNameStart(single)) { return eatNameOrKeyword(single) }

    if (isDigit(single)) { return eatNumber(single) }

    let pair = single
    if (line != "") { pair += line[0] }

    if (pair == "//") { return eatRemark(single) }

    if (pair == "/*") { return eatLongRemark(single) }

    if (pair == "==") { return eatDoubleCharacter(single, "<") }

    if (pair == "!=") { return eatDoubleCharacter(single, "<") }

    if (pair == "||") { return eatDoubleCharacter(single, "&") }

    if (pair == "&&") { return eatDoubleCharacter(single, "&") }

    if (pair == "<=") { return eatDoubleCharacter(single, "<") }

    if (pair == ">=") { return eatDoubleCharacter(single, "<") }

    if (pair == "+=") { return eatDoubleCharacter(single, "=") }

    if (pair == "-=") { return eatDoubleCharacter(single, "=") }

    if (pair == "*=") { return eatDoubleCharacter(single, "=") }

    if (pair == "/=") { return eatDoubleCharacter(single, "=") }

    if (pair == "%=") { return eatDoubleCharacter(single, "=") }

    if (pair == "++") { return eatDoubleCharacter(single, "++") }

    if (pair == "--") { return eatDoubleCharacter(single, "++") }

    if (single == "=") { return eatSingleCharacter(single, "=") }

    if (".,;?:(){}[]!".indexOf(single) != -1) { return eatSingleCharacter(single) }

    if ("+-*/%".indexOf(single) != -1) { return eatSingleCharacter(single, "+") }

    if ("<>".indexOf(single) != -1) { return eatSingleCharacter(single, "<") }

    eatInvalidCharacter(single)
}

// eats ///////////////////////////////////////////////////////////////////////

function eatEndOfFile() {
    return createToken(row, col, "end-of-file", "")
}

function eatEndOfLine() {
    return createToken(row, col, "end-of-line", "")
}

function eatWhiteSpace(c) {
    let s = c
    const token = createToken(row, col, "white-space", "")
    while (line[0] == " ") { s += eatChar() }
    token.value = s
    return token
}

function eatString(c) {
    const start = c // ' or "
    let shallEscape = false
    const token = createToken(row, col, "string", c)
    while (true) {
        c = eatChar()
        if (c == "\n") { break }
        token.value += c
        if (c == start  &&  ! shallEscape) { return token } // closes string
        if (c == "\\") {
            shallEscape = ! shallEscape
        }
        else {
            shallEscape = false
        }
    }
    err(token.row, token.col, "incomplete string")
}

function eatLongString(c) {
    const start = c // `
    const token = createToken(row, col, "string", c)
    let shallEscape = false
    while (true) {
        c = eatChar()
        if (c == "") { break } // end of file
        token.value += c
        if (c == start  &&  ! shallEscape) { return token } // closes string
        if (c == "\\") {
            shallEscape = ! shallEscape
        }
        else {
            shallEscape = false
        }
    }
    err(token.row, token.col, "incomplete string")
}

function eatNameOrKeyword(c) {
    let s = c
    const token = createToken(row, col, "name", "")
    while (line != "") {
        if (isNameStart(line[0])) {
            s += eatChar()
        }
        else if (isDigit(line[0])) {
            s += eatChar()
        }
        else {
            break
        }
    }
    token.value = s
    if (keywords.indexOf(s) != -1) { token.kind = "keyword" }
    return token
}

function eatNumber(c) {
    let s = c
    const token = createToken(row, col, "number", "")
    let gotDot = false
    while (line != "") {
        if (isDigit(line[0])) {
            s += eatChar()
        }
        else if (line[0] == ".") {
            if (gotDot) { break }
            gotDot = true
            s += eatChar()
        }
        else {
            break
        }
    }
    token.value = s
    return token
}

function eatRemark(c) {
    // ***converts to end of line*** //
    let s = c
    const token = createToken(row, col, "end-of-line", "")
    s += eatChar() // second character
    while (line != "") {
        c = eatChar()
        if (c == "\n") { break }
        s += c
    }
    token.value = s
    return token
}

function eatLongRemark(c) {
    let s = c
    const token = createToken(row, col, "long-remark", "")
    s += eatChar() // second character
    while (true) {
        c = eatChar()
        s += c
        if (c == "") { err(token.row, token.col, "unfinished long remark"); break }
        if (c != "*") { continue }
        if (line[0] != "/") { continue }
        s += eatChar()
        token.value = s
        return token
    }
}

function eatDoubleCharacter(c, kind) {
    const token = createToken(row, col, kind, "")
    token.value = c + eatChar()
    return token
}

function eatSingleCharacter(c, kind) {
    if (kind == undefined) { kind = c }
    return createToken(row, col, kind, c)
}

function eatInvalidCharacter(c) {
    err(row, col, "invalid character: " + c)
}

// helper /////////////////////////////////////////////////////////////////////

function eatChar() {
    if (line == null) { eatLine() }
    if (line == null) { return "" } // there was no more lines
    col += 1
    if (line == "") { line = null; return "\n" }
    const c = line[0]
    line = line.substring(1)
    if (c < " ") {
        let s = "(invisible code=" + c.charCodeAt(0) + ")"
        if (c == "\t") { s = "[TAB]" }
        err(row, col, "invalid character: " + s)
    }
    return c
}

function eatLine() {
    if (lines.length == 0) { return }
    line = lines.shift()
    row += 1
    col = 0
}

function isNameStart(c) {
    const n = c.charCodeAt(0)
    if (n > 122) { return false }
    if (n >  96) { return  true } // a to z
    if (n == 95) { return  true } // _
    if (n >  90) { return false }
    if (n >  64) { return  true } // A to Z
    return false
}

function isDigit(c) {
    if (c > "9") { return false }
    if (c < "0") { return false }
    return true
}

function err(row, col, msg) {
    error(rat, row, col, msg)
}

//
