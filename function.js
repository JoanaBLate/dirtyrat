// # Copyright (c) 2014-2021 Feudal Code Limitada - MIT license #

"use strict"

import { eatExpression } from "./expression.js"

import { err, unexpected } from "./helper.js"

import { registerAnonymousFunction, registerInnerFunction, registerLocalVariable, registerParameter, markUsed, endGlobalFunction } from "./register.js"

import { see, eat, eatValue, eatKind, eatName, eatConstOrLet, seeEndOfBlockOrEndOfLine, seeEndOfBlockOrTrueEndOfLine } from "./scan.js"


var rat

var blocks = [ ]
var lastClosedBlock = "" // keeps obsolet value when function ends!!

var currentBranch = ""
var closedBranches = [ ] // MUST BE RESET at start of new function


export function init(r) {
    rat = r
}

export function eatGlobalFunction() {
    // name already registered in parser.js
    closedBranches = [ ] // erasing old values
    eatFunctionCore()
    endGlobalFunction()
}

export function eatAnonymousFunction() {
    registerAnonymousFunction() // no token needed
    eatFunctionCore()
}

function eatInnerFunction() {
    registerInnerFunction(eatName())
    eatFunctionCore()
}

export function getCurrentBranch() {
    return currentBranch
}

///////////////////////////////////////////////////////////////////////////////

function eatFunctionCore() { // recursive code!
    openBranch()
    eatFunctionParams()
    eatFunctionBody()
}

function eatFunctionParams() {
    eatValue("(")
    if (see().value == ")") { eat(); return }
    while (true) {
        let token = eatName()
        registerParameter(token)
        token = eat()
        if (token.value == ")") { return }
        if (token.value != ",") { unexpected(token) }
    }
}

// branches ///////////////////////////////////////////////////////////////////

function openBranch() {
    currentBranch = valueForNewBranch()
}

function valueForNewBranch() {
    if (currentBranch == "") { return "1" }
    //
    let n = 0
    while (true) {
        n += 1
        const candidate = currentBranch + "." + n
        if (closedBranches.indexOf(candidate) == -1) { return candidate }
    }
}

function closeBranch() {
    closedBranches.push(currentBranch)
    //
    const parts = currentBranch.split(".")
    parts.pop()
    currentBranch = parts.join(".")
}

// body main loop /////////////////////////////////////////////////////////////

function eatFunctionBody() {
    eatOpenBlock("body")
    //
    while (true) {
        const token = see()
        const kind  = token.kind
        const value = token.value

        if (value == "}") {
            eatCloseBlock()
             // check must be on "body" closed
             // because this function is recursive!!!
            if (lastClosedBlock == "body") { return }
        }
        else if (value == "if") {
            eatIf()
        }
        else if (value == "else") {
            eatElse()
        }
        else if (value == "while") {
            eatWhile()
        }
        else if (value == "break") {
            eatBreak()
        }
        else if (value == "continue") {
            eatContinue()
        }
        else if (value == "for") {
            eatFor()
        }
        else if (value == "return") {
            eatReturn()
        }
        else if (value == "const") {
            eatConstOrLetStatement(true)
        }
        else if (value == "let") {
            eatConstOrLetStatement(false)
        }
        else if (value == "this") {
            eatCallOrAssign()
        }
        else if (value == "delete") {
            eatDelete()
        }
        else if (value == "throw") {
            eatThrow()
        }
        else if (value == "try") {
            eatTry()
        }
        else if (value == "catch") {
            // using forceEatCatch instead of eatCatch
            misplacedCatch()
        }
        else if (value == "finally") {
            eatFinally()
        }
        else if (kind == "name") {
            eatCallOrAssign()
        }
        else if (kind == ";") {
            eat()
        }
        else if (kind == "end-of-line") {
            eat()
        }
        else if (value == "function") {
            eat()
            eatInnerFunction()
        }
        else {
            unexpected(token)
        }
    }
}

function eatOpenBlock(val) {
    blocks.push(val)
    eatValue("{")
}

function eatCloseBlock() {
    closeBranch()
    eat()
    lastClosedBlock = blocks.pop()
    if (lastClosedBlock == "try") { forceEatCatch() }
}

///////////////////////////////////////////////////////////////////////////////

function eatReturn() {
    eat()
    const kind = see().kind
    if (kind == "}"  ||  kind == ";"  ||  kind == "end-of-line") { return }
    eatExpression()
    seeEndOfBlockOrTrueEndOfLine()
}

///////////////////////////////////////////////////////////////////////////////

function eatDelete() {
    eat()
    eatExpression()
    seeEndOfBlockOrEndOfLine()
}

///////////////////////////////////////////////////////////////////////////////

function eatThrow() {
    eat()
    eatValue("new")
    eatValue("Error")
    eatValue("(")
    eatExpression()
    eatValue(")")
    seeEndOfBlockOrEndOfLine()
}

///////////////////////////////////////////////////////////////////////////////

function eatConstOrLetStatement(isConstant) {
    eat() // const, let or comma
    let token = eatName()
    registerLocalVariable(token, isConstant)
    token = see()
    if (token.value == ",") { eatConstOrLetStatement(isConstant) }
    if (token.value == "=") {
        eat()
        eatExpression()
    }
    seeEndOfBlockOrEndOfLine()
}

///////////////////////////////////////////////////////////////////////////////

function eatIf() {
    eat()
    eatValue("(")
    eatExpression()
    eatValue(")")
    eatOpenBlock("if")
    openBranch()
}

function eatElse() {
    const token = eat()
    if (lastClosedBlock != "if") { err(token, "'else' does not match 'if'") }
    if (see().value == "if") { eatIf(); return }
    eatOpenBlock("else")
    openBranch()
}

///////////////////////////////////////////////////////////////////////////////

function eatTry() {
    const token = eat()
    const tcf = blockTryCatchOrFinally()
    if (tcf != "") { err(token, "'try' inside block '" + tcf + "'") }
    eatOpenBlock("try")
    openBranch()
}

function forceEatCatch() {
    if (see().kind == "end-of-line") { eat() }
    eatValue("catch")
    eatValue("(")
    const token = eatName()
    registerLocalVariable(token)
    eatValue(")")
    eatOpenBlock("catch")
    openBranch()
}

function misplacedCatch() {
    const token = eat()
    const tcf = blockTryCatchOrFinally()
    if (tcf != "") { err(token, "'catch' inside block '" + tcf + "'") }
    if (lastClosedBlock != "catch") { err(token, "'catch' not after block 'try'") }
}

function eatFinally() {
    const token = eat()
    const tcf = blockTryCatchOrFinally()
    if (tcf != "") { err(token, "'finally' inside block '" + tcf + "'") }
    if (lastClosedBlock != "catch") { err(token, "'finally' not after block 'catch'") }
    eatOpenBlock("finally")
    openBranch()
}

///////////////////////////////////////////////////////////////////////////////

function eatWhile() {
    eat()
    eatValue("(")
    eatExpression()
    eatValue(")")
    eatOpenBlock("while")
    openBranch()
}

function eatBreak() {
    const token = eat()
    if (! isInLoop()) { err(token, "'break' not inside loop") }
    seeEndOfBlockOrTrueEndOfLine()
}

function eatContinue() {
    const token = eat()
    if (! isInLoop()) { err(token, "'continue' not inside loop") }
    seeEndOfBlockOrTrueEndOfLine()
}

///////////////////////////////////////////////////////////////////////////////

function eatFor() {
    openBranch()
    eat()
    eatValue("(")
    const token = eatConstOrLet() // const or let
    //
    const token2 = eat() //  [  or name
    if (token2.value == "[") { eatForKeyValue(token); return }
    if (token2.kind != "name") { unexpected(token2) }
    //
    const token3 = see() // symbol
    if (token3.value == "=")  { eatForCounter(token, token2); return }
    if (token3.value == "of") { eatForOf(token, token2); return }
    if (token3.value == "in") { eatForOf(token, token2); return } // 'for in' ==  'for of'
    unexpected(token3)
}

function eatForOf(token, token2) {
    if (token.value != "const") { err(token, "this kind of loop wants 'const'") }
    //
    registerLocalVariable(token2, true)
    eat() // of or in
    eatExpression()
    eatValue(")")
    eatOpenBlock("for")
}

function eatForKeyValue(token) {
    if (token.value != "const") { err(token, "this kind of loop wants 'const'") }
    //
    const token2 = eatName()
    registerLocalVariable(token2, true)
    //
    eatValue(",")
    //
    const token3 = eatName()
    registerLocalVariable(token3)
    //
    eatValue("]")
    eatValue("of")
    eatExpression()
    eatValue(")")
    eatOpenBlock("for")
}

function eatForCounter(token, token2) {
    // accepts only the complete traditional style //
    if (token.value != "let") { err(token, "this kind of loop wants 'let'") }
    //
    registerLocalVariable(token2)
    markUsed(token2)
    const name = token2.value
    eat() // =
    eatExpression()
    eatValue(";")
    //
    eatValue(name)
    eatKind("<")
    eatExpression()
    eatValue(";")
    //
    eatValue(name)
    const token3 = eat()
    if (token3.kind == "=") {
        eatExpression()
    }
    else if (token3.kind != "++") {
        unexpected(token3)
    }
    eatValue(")")
    eatOpenBlock("for")
}

///////////////////////////////////////////////////////////////////////////////

function eatCallOrAssign() {
    const token = eat() // name
    markUsed(token)
    const assigns = eatCallOrAssign2()
    if (assigns) { token.wasAssigned = true }
}

function eatCallOrAssign2() {
    const token = eat()
    if (token.value == ".") {
        eatName()
        eatCallOrAssign2()
        return false
    }
    if (token.value == "[") {
        eatExpression()
        if (see().kind == "end-of-line") { eat() }
        eatValue("]")
        eatCallOrAssign2()
        return false
    }
    if (token.value == "(") {
        eatArguments()
        eatValue(")")
        const kind = see().kind
        if (kind == "}") { return }
        if (kind == ";") { return }
        if (kind == "end-of-line") { return }
        eatCallOrAssign2()
        return false
    }
    if (token.kind == "=") {
        eatExpression()
        seeEndOfBlockOrEndOfLine()
        return true
    }
    unexpected(token)
}

///////////////////////////////////////////////////////////////////////////////

function isInLoop() {
    if (blocks.indexOf("while") != -1) { return true }
    if (blocks.indexOf("for")   != -1) { return true }
    return false
}

function blockTryCatchOrFinally() {
    if (blocks.indexOf("try")     != -1) { return "try" }
    if (blocks.indexOf("catch")   != -1) { return "catch" }
    if (blocks.indexOf("finally") != -1) { return "finally" }
    return ""
}

///////////////////////////////////////////////////////////////////////////////

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

//
