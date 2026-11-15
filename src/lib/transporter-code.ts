/** Next code after the highest TR number. Other codes, such as STK, are left as they are. */
export function nextTransporterCode(codes: string[]) {
  let max = 0;
  for (const code of codes) {
    const match = /^TR(\d+)$/i.exec(code.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `TR${String(max + 1).padStart(3, "0")}`;
}
