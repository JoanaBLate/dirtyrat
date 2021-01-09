// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"


import { markUsed } from "./register.js"

import { eatAnonymousFunction } from "./function.js"

import { see, eat, eatValue, eatName } from "./scan.js"

import { unexpected } from "./helper.js"


var rat

export function init(r) {
    rat = r
}

export function eatExpression() {
    const token = see()
    const value = token.value
    const kind = token.kind

    if (value == "undefined") {
        eat()
    }
    else if (value == "null")  {
        eat()
    }
    else if (value == "true")  {
        eat()
    }
    else if (value == "false") {
        eat()
    }
    else if (value == "!") {
        eatNot()
    }
    else if (value == "-") {
        eatMinusOrPlus()
    }
    else if(value == "+") {
        eatMinusOrPlus()
    }
    else if (kind == "number") {
        eatNumber()
    }
    else if (kind == "string") {
        eatString()
    }
    else if (kind == "name") {
        eatNameExpression()
    }
    else if (value == "(") {
        eatParenExp()
    }
    else if (value == "[") {
        eatArray()
    }
    else if (value == "{") {
        eatDict()
    }
    else if (value == "typeof") {
        eatTypeof()
    }
    else if (value == "new") {
        eatNew()
    }
    else if (value == "this") {
        eatThis()
    }
    else if (value == "function") {
        eat()
        eatAnonymousFunction()
    }
    else {
        unexpected(token)
    }

    // after some operation above
    const kind2 = see().kind
    if (kind2 == "+") { eat(); eatExpression() }
    if (kind2 == "<") { eat(); eatExpression() }
    if (kind2 == "&") { eat(); eatExpression() }
    if (kind2 == "?") { eat(); eatExpression(); eatValue(":"); eatExpression() }
}

// head ///////////////////////////////////////////////////////////////////////

function eatNot() {
    eat()
    const kind = see().kind
    if (kind == "!"  ||  kind == "+") { unexpected(eat()) }
    eatExpression()
}

function eatMinusOrPlus() {
    eat()
    const kind = see().kind
    if (kind == "!"  ||  kind == "+") { unexpected(eat()) }
    eatExpression()
}

function eatNumber() {
    eat()
}

function eatString() {
    eat()
    const value = see().value
    if (value == "[") { eatIndexer(); return }
    if (value == ".") { eatDot(); return }
}

function eatParenExp() {
    // expression must not start with ()
    eat()
    eatExpression()
    if (see().kind == "end-of-line") { eat() }
    eatValue(")")
    const value = see().value
    if (value == "[") { eatIndexer(); return }
    if (value == ".") { eatDot(); return }
}

function eatArray() {
    // [1,,2] is invalid
    core()
    const value = see().value
    if (value == "[") { eatIndexer(); return }
    if (value == ".") { eatDot(); return }
    //
    function core() {
        eat()
        if (see().kind == "]") { eat(); return }
        while (true) {
            eatExpression()
            const token = eat()
            if (token.kind == "end-of-line") { eatValue("]"); return }
            if (token.kind == "]") { return }
            if (token.kind != ",") { unexpected(token) }
        }
    }
}

function eatDict() {
    core()
    if (see().value == ".") { eatDot(); return }
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
        const token = eat()
        if (token.kind != "string") { unexpected(token) }
        const token2 = eat()
        if (token2.kind != ":") { unexpected(token2) }
        eatExpression()
    }
}

function eatNameExpression() {
    markUsed(eat())
    eatNameExpression2()
}

function eatNameExpressionAfterDot() {
    eat()
    eatNameExpression2()
}

function eatNameExpression2() {
    const value = see().value
    if (value == "[") { eatIndexer();   return }
    if (value == ".") { eatDot();       return }
    if (value == "(") { eatParenCall(); return }
}

function eatNew() {
    eat()
    const token = eatName()
    markUsed(token)
    if (see().value != "(") { unexpected(eat()) }
    eatParenCall()
}

function eatTypeof() {
    eat()
    eatExpression()
}

function eatThis() {
    eat()
    const value = see().value
    if (value == ".") { eatDot();     return }
    if (value == "[") { eatIndexer(); return }
}

// tail ///////////////////////////////////////////////////////////////////////

function eatParenCall() {
    core()
    const value = see().value
    if (value == "[") { eatIndexer();   return }
    if (value == ".") { eatDot();       return }
    if (value == "(") { eatParenCall(); return }
    //
    function core() {
        eat()
        if (see().kind == ")") { eat(); return }
        while (true) {
            eatExpression()
            const token = eat()
            if (token.kind == ")") { return }
            if (token.kind == ",") { continue }
            if (token.kind == "end-of-line") { eatValue(")"); return }
            unexpected(token)
        }
    }
}

function eatIndexer() {
    eat()
    eatExpression()
    const token = eat()
    if (token.value != "]") { unexpected(token) }
    const value = see().value
    if (value == "[") { eatIndexer(); return }
    if (value == ".") { eatDot(); return }
    // when indexing array of functions
    // if (value == "(") { eatParenCall(); return }
}

function eatDot() {
    eat()
    eatNameExpressionAfterDot()
    const kind = see().kind
    if (kind == ".") { eatDot(); return }
    if (kind == "(") { eatParenCall(); return }
    if (kind == "[") { eatIndexer(); return }
}

//
