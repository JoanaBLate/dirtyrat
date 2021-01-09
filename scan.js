// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"

import { expecting, unexpected } from "./helper.js"

var rat

export function init(r) {
    rat = r
}

export function see() {
    return rat.tokens[0]
}

export function seeEndOfBlockOrEndOfLine() {
    const token = rat.tokens[0]
    if (token.kind == "}") { return }
    if (token.kind == ";") { return }
    if (token.kind == "end-of-line") { return }
    expecting(token, "'}', ';' or end of line")
}

export function seeEndOfBlockOrTrueEndOfLine() {
    const token = rat.tokens[0]
    if (token.kind == "}") { return }
    if (token.kind == "end-of-line") { return }
    expecting(token, "'}' or end of line")
}

/*
export function seeTrueEndOfLine() {
    const token = rat.tokens[0]
    if (token.kind == "end-of-line") { return }
    expecting(token, "end of line")
}
*/

export function eat() {
    // console.log(rat.tokens[0])
    return rat.tokens.shift()
}

export function eatValue(val) {
    const token = rat.tokens.shift()
    if (token.value == val) { return token }
    expecting(token, "'" + val + "'")
}

export function eatKind(kind) {
    const token = rat.tokens.shift()
    if (token.kind != kind) { unexpected(token) }
    return token
}

export function eatString() {
    const token = rat.tokens.shift()
    if (token.kind != "string") { expecting(token, "string") }
    return token
}

export function eatName() {
    const token = rat.tokens.shift()
    if (token.kind != "name") { expecting(token, "name") }
    return token
}

export function eatConstOrLet() {
    const token = rat.tokens.shift()
    if (token.value == "let")   { return token }
    if (token.value == "const") { return token }
    expecting(token, "'let' or 'const'")
}

export function eatTrueEndOfLine() {
    const token = rat.tokens.shift()
    if (token.kind == "end-of-line") { return token }
    expecting(token, "end of line")
}
