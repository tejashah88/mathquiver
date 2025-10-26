#### Quick Start
1. Enter your desired equations in the 'Equations' section.
   - You can type equations like functions (eg. `f(x)=Ax+b`), but only RHS is converted.
   - You can also add domain limits with a comma at the end (eg. `x, x < 0`).
   - Any ***orange*** borders indicate an incomplete or unparsable equation.
   - Any ***red*** borders indicate an unsupported equation for conversion.
2. Enter your desired variables in the 'Variables' section.
   - Add units in square brackets (eg. `[N/m^2]`) for clarity.
   - 'Excel Ref' contains the starting cell reference. Use **F4** to cycle through anchors ($).
   - Any ***orange*** borders indicate a missing cell reference.
   - Any ***red*** borders indicate an invalid cell reference.
3. Click the Excel file icon to copy the corresponding Excel formula (includes **=**).

#### Tips & Tricks
- **Only a limited subset of Excel functions are supported.** See [this list for details](https://github.com/tejashah88/mathquiver/blob/main/docs/supported-excel-functions.md).
- Drag and drop equations and variables with dots handle on left side.
- Snap this window to either side for a side-by-side workflow with Excel.
- Activate "Focus Mode" to hide missing variables & validation highlighting.
- To add text, type **"** (double quotes) in an empty box to enter text mode.
- To add a LaTeX expression, type **\\** (backslash) to enter LaTeX mode.
- Use the Import/Export buttons to save your workspace for later.

#### What's not supported?
- Array-based formulas like `SUM()` are not supported.
- Ranges for variable substitution like `A1:A10` are not supported.

#### Known Bugs
- Variables with complex subscripts are not fully supported (`a_{n+1}+b`, `x_{y+1}^{z}`).
