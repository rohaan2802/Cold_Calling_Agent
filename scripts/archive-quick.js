/**
 * Light VAPI → archive sync (few list pages). Use for local demos.
 * Full sync: npm run archive:recordings
 */
process.env.ARCHIVE_MAX_PAGES = process.env.ARCHIVE_MAX_PAGES || "2";
require("./archive-recordings.js");
