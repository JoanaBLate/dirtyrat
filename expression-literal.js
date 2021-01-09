// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"


import { see, eat, eatValue } from "./scan.js"

import { unexpected, expecting } from "./helper.js"


var rat

export function init(r) {
    rat = r
}

// main ///////////////////////////////////////////////////////////////////////

export function eatLiteralExpression() {
    const token = see()
    const kind  = token.kind
    const value = token.value

    if (value == "undefined") { eat(); return }

    if (value == "null")  { eat(); return }

    if (value == "true")  { eat(); return }

    if (value == "false") { eat(); return }

    if (value == "-") { eatLiteralMinusOrPlus(); return }

    if (value == "+") { eatLiteralMinusOrPlus(); return }

    if (kind == "number") { eatLiteralNumber(); return }

    if (kind == "string") { eatLiteralString(); return }

    if (value == "(") { eatLiteralParen(); return }

    if (value == "[") { eatLiteralArray(); return }

    if (value == "{") { eatLiteralDict(); return }

    expecting(eat(), "literal expression")
}

// head ///////////////////////////////////////////////////////////////////////

function eatLiteralMinusOrPlus() {
    eat()
    const kind = see().kind
    if (kind == "number"  ||  kind == "(") { eatLiteralExpression(); return }
    unexpected(eat())
}

function eatLiteralNumber() {
    eat()
    if (see().kind == "+") { eatLiteralNumericOperator() }
}

function eatLiteralString() {
    eat()
    if (see().value == "+") { eatLiteralStringOperator() }
}

function eatLiteralParen() {
    // content must be numeric
    eat()
    const kind = see().kind
    if (kind == "number") {
        eatLiteralNumber()
    }
    else if (kind == "(") {
        eatLiteralParen()
    }
    else {
        unexpected(eat())
    }
    eatValue(")")
    if (see().kind == "+") { eatLiteralNumericOperator() }
}

function eatLiteralArray() {
    // [1,,2] is invalid
    core()
    //
    function core() {
        eat()
        if (see().kind == "]") { eat(); return }
        while (true) {
            eatLiteralExpression()
            const token = eat()
            if (token.kind == "end-of-line") { eatValue("]"); return }
            if (token.kind == "]") { return }
            if (token.kind != ",") { unexpected(token) }
        }
    }
}

function eatLiteralDict() {
    core()
    //
    function core() {
        eat()
        if (see().kind == "}") { eat(); return }
        while (true) {
            eatpair()
            const token = eat()
            if (token.kind == "end-of-line") { eatValue("}"); return }
            if (token.kind == "}") { return }
            if (token.kind != ",") { unexpected(token) }
        }
    }
    function eatpair() {
        let token = eat()
        if (token.kind != "string") { unexpected(token) }
        token = eat()
        if (token.kind != ":") { unexpected(token) }
        eatLiteralExpression()
    }
}

// tail ///////////////////////////////////////////////////////////////////////

function eatLiteralStringOperator() {
    eat()
    if (see().kind != "string") { unexpected(eat()) }
    eatLiteralString()
}

function eatLiteralNumericOperator() {
    eat()
    const kind = see().kind
    if (kind == "number") { eatLiteralNumber(); return }
    if (kind == "(") { eatLiteralParen(); return }
    unexpected(eat())
}

//
