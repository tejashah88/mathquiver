# Supported Excel Functions

This features the list of Excel functions implemented for the LaTeX expression to Excel formula conversion.

## Constants

The following mathematical constants are converted to Excel function calls or literal values:

```
PI()                    - Pi (approx. 3.14159)
EXP(1)                  - Euler's number e (approx. 2.71828)
SQRT(5)                 - Square root of 5 (used in golden ratio calculation)
COMPLEX(0,1)            - Imaginary unit i
```

Note: Catalan's constant (0.915965594177219), Euler-Mascheroni constant (0.577215664901533), positive infinity (1E+307), and negative infinity (-1E+307) are represented as literal numeric values, not function calls.

## Trigonometric Functions

### Standard Trigonometric Functions

```
SIN(x)                  - Sine
COS(x)                  - Cosine
TAN(x)                  - Tangent
CSC(x)                  - Cosecant
SEC(x)                  - Secant
COT(x)                  - Cotangent
```

### Inverse Trigonometric Functions

```
ASIN(x)                 - Arcsine
ACOS(x)                 - Arccosine
ATAN(x)                 - Arctangent
ACSC(x)                 - Arccosecant
ASEC(x)                 - Arcsecant
ACOT(x)                 - Arccotangent
```

## Hyperbolic Functions

### Standard Hyperbolic Functions

```
SINH(x)                 - Hyperbolic sine
COSH(x)                 - Hyperbolic cosine
TANH(x)                 - Hyperbolic tangent
CSCH(x)                 - Hyperbolic cosecant
SECH(x)                 - Hyperbolic secant
COTH(x)                 - Hyperbolic cotangent
```

### Inverse Hyperbolic Functions

```
ASINH(x)                - Inverse hyperbolic sine
ACOSH(x)                - Inverse hyperbolic cosine
ATANH(x)                - Inverse hyperbolic tangent
ACSCH(x)                - Inverse hyperbolic cosecant
ASECH(x)                - Inverse hyperbolic secant
ACOTH(x)                - Inverse hyperbolic cotangent
```

## Logarithmic and Exponential Functions

```
EXP(x)                  - Exponential function (e^x)
LN(x)                   - Natural logarithm (base e)
LOG(x)                  - Logarithm (base 10 by default)
LOG(x,2)                - Logarithm with custom base (e.g., binary logarithm)
```

Note: Natural logarithm of (x+1) is computed as `LN(x+1)` using parenthesized expression.

## Root and Power Functions

```
SQRT(x)                 - Square root
```

Note: nth roots are computed using power notation: `(x^(1/n))`. Powers and squares use the exponentiation operator `^`.

## Special Mathematical Functions

### Factorial and Gamma Functions

```
FACT(x)                 - Factorial
FACTDOUBLE(x)           - Double factorial
GAMMA(x)                - Gamma function
```

### Rounding and Mathematical Operations

```
ABS(x)                  - Absolute value
CEILING.MATH(x,1)       - Ceiling function
FLOOR(x,1)              - Floor function
MOD(x,y)                - Modulo operation
LCM(x,y,...)            - Least common multiple (accepts multiple arguments)
```

## Complex Number Functions

```
COMPLEX(a,b)            - Create complex number from real and imaginary parts
IMREAL(z)               - Extract real part
IMAGINARY(z)            - Extract imaginary part
IMCONJUGATE(z)          - Complex conjugate
IMARGUMENT(z)           - Argument (phase angle)
IMABS(z)                - Magnitude (absolute value)
```

## Unsupported Operations

The following are NOT supported:
- Array-based functions (AVERAGE, MEDIAN, STDEV, etc.)
- Logical functions (IF, AND, OR, NOT)
- Comparison operators (as functions)
- Matrix operations
- Calculus operations (derivatives, integrals)
