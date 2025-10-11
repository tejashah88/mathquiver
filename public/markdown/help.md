### Quick Start
1. Enter your desired equations in the 'Equations' section.
   - You can type equations like f(x)=Ax+b, but only the RHS is converted.
   - Any ***orange*** borders indicate an incomplete or unparsable equation.
   - Any ***red*** borders indicate an unsupported equation.
2. Enter your desired variables in the 'Variables' section.
   - Add units in square brackets for clarity. They will not appear in the Excel formula.
   - 'Excel Ref' contains the **starting** cell reference. Use **F4** to cycle through anchors ($).
   - Any ***orange*** borders indicate a missing cell reference.
   - Any ***red*** borders indicate an invalid cell reference.
3. Click the Excel file icon to copy the corresponding Excel formula.

### Tips
- **Only a limited subset of Excel functions are supported.**
- Snap this window to either side for a side-by-side workflow with Excel.
- To add text, type **"** (double quotes) in an empty box to enter text mode.
- To add a LaTeX expression, type **\\** (backslash) to enter LaTeX mode.
- Use the equation menu (≡) to copy/paste the LaTeX expression or an image render.
- You can directly copy-paste LaTeX expressions into the equations boxes.
- Use the Import/Export buttons to save your workspace for later.

### Known Bugs
- Variables with complex subscripts are not supported like `a_{n+1}+b` or `x_{y+1}^{z}`.
