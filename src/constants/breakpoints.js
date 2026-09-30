// Width thresholds shared by tailwind.config.js (the `sm:`/`md:`/`lg:` class
// prefixes) and useBreakpoint (layout logic), so both agree on what counts as a
// phone, a tablet or a desktop. Units are dp on native and CSS px on web.
//
// CommonJS because tailwind.config.js is loaded by Node, not by Metro.
const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

module.exports = { BREAKPOINTS };
