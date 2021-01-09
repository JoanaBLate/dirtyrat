# dirtyrat
A linter for a small subset of JavaScript


That small subset of JavaScript
-------------------------------

Dirtyrat does not recognize arrow functions, async/await/then, classes or methods (prototype), destructuring syntax or import syntax with wildcard or default. It lacks support for other syntaxes recently added to JavaScript.

Each file must be a module (the keyword module is not allowed) and start with "use strict". Then it accepts (the order must be this) declarations of imports, global variables and functions and one call to function main (or init ).

Global variables can only be declared with var or const. And can only be initialized with a literal expression.
        
Local variables can only be declared with let or const.
        
An example of code that conforms to dirtyrat is the dirtyrat source code itself.



Running dirtyrat
----------------        

Dirtyrat expects to be ran with Deno in a Linux system. Copy the source code into a folder called dirtyrat in your home folder. 

Place bash script below in your environment path and name it "rat".


#!/bin/bash

deno run --allow-read --allow-env ~/dirtyrat/main.js "$@"


There are 3 modes to use dirtyrat.
            
1) Inside the target folder, enter "rat". Dirtyrat will lint all JS files, including subfolders recursively, except when the name of the folder is IGNORE.

2) Enter "rat example.js". Dirtyrat will lint just example.js.

3) Enter "rat example.html". Dirtyrat will lint all JS files that are linked by example.html as long as the links follow exactly the syntax shown below (whitespaces are meaningful). Any linked script that is not supposed to be linted like (Google Analytics, for example) must have its link written in a slightly different syntax, like inserting an excedent whitespace.

        
<script type="module" src="/example.js"></script>



        
Dirtyrat issues errors and warnings. In case of error it exits when finds the first one or else it could point tens of errors that really don't exist, just because the first error breaks the structure of the following lines of code.
        
WARNING: dirtyrat erases the content of your terminal (the history of shell remains intact). If you don't want this just comment the first line of the function showOpenMessage in the file main.js.

