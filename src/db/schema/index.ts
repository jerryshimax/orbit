// Enums
export * from "./enums";

// Legacy tables (kept for backward compat during migration)
export * from "./lp";
export * from "./roadshow";

// Universal CRM tables
export * from "./users";
export * from "./organizations";
export * from "./organization-aliases";
export * from "./people";
export * from "./affiliations";
export * from "./pipelines";
export * from "./notes";
export * from "./field-trips";
export * from "./sync";

// Interactions (shared between legacy and universal)
export * from "./interactions";

// Meeting attendees (team member ↔ meeting link)
export * from "./meeting-attendees";

// Meeting attendee people (external contact ↔ meeting link)
export * from "./meeting-attendee-people";

// Google integration
export * from "./google-auth";

// Meeting notes (Orbit intelligence layer on GCal events)
export * from "./meeting-notes";

// Objectives, Key Results, Action Items
export * from "./objectives";

// Chat
export * from "./chat";
export * from "./chat-jobs";
export * from "./tool-call-log";
export * from "./ai-proposals";

// Recon (strategic workspaces)
export * from "./recon";
