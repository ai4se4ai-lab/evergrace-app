/** Drops empty query params so Zod's `.optional()` fields stay optional. */
export function stripEmpty(
  input: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single !== undefined && single !== "") output[key] = single;
  }

  return output;
}
