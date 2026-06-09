const blockedPaths = ['/admin', '/account', '/cart', '/compare', '/checkout'];

function isBlocked(url) {
  try {
    const path = new URL(url).pathname;

    return blockedPaths.some((blocked) => path.startsWith(blocked));
  } catch (e) {
    return true; // fail safe: block invalid URLs
  }
}

module.exports = { isBlocked };
