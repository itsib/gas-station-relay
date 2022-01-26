export function stringToBool(val: string): boolean {
  if (val === 'true') {
    return true;
  }
  if (val === 'false') {
    return false;
  }
  const numValue = Number(val);
  if (!isNaN(numValue)) {
    return !!numValue;
  }
  return !!val;
}
