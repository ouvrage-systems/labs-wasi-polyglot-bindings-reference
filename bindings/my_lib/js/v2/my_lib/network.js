import { network } from './_generated/my_lib_component.js';

export async function fetchAndFormat(url) {
  // jco automatically returns the string on success, or throws ComponentError on error
  return network.fetchAndFormat(url);
}
