// Width thresholds shared by tailwind.config.js (the `sm:`/`md:`/`lg:` class
// prefixes) and useBreakpoint (layout logic), so both agree on what counts as a
// phone, a tablet or a desktop. Units are dp on native and CSS px on web.
//
//   phone   < sm
//   tablet  sm … lg
//   desktop ≥ lg   (fluid sizes keep growing until xxl, then stay capped)
//
// CommonJS because tailwind.config.js is loaded by Node, not by Metro.
const BREAKPOINTS = {
  sm: 600,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1920,
};

module.exports = { BREAKPOINTS };
