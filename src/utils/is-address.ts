import { getAddress } from 'ethers/lib/utils';

/**
 * Returns the checksummed address if the address is valid, otherwise returns false
 * @param value
 */
export function isAddress(value?: string): string | false {
  try {
    return value ? getAddress(value) : false;
  } catch {
    return false;
  }
}
