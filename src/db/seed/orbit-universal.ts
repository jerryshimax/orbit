import { db } from "@/db";
import {
  orbitUsers,
  pipelineDefinitions,
  organizations,
  people,
  personOrgAffiliations,
  opportunities,
  interactions,
  fieldTrips,
  fieldTripLegs,
  fieldTripMeetings,
} from "@/db/schema";

async function seed() {
  console.log("🌱 Seeding Orbit universal CRM...");

  // ─── CLEAN ───
  await db.delete(fieldTripMeetings);
  await db.delete(fieldTripLegs);
  await db.delete(fieldTrips);
  await db.delete(interactions);
  await db.delete(opportunities);
  await db.delete(personOrgAffiliations);
  await db.delete(people);
  await db.delete(organizations);
  await db.delete(pipelineDefinitions);
  await db.delete(orbitUsers);

  // ─── USERS ───
  const [jerry, ray, matt, angel, david] = await db
    .insert(orbitUsers)
    .values([
      { handle: "jerry", fullName: "Jerry Shi", email: "jerryshi@synergiscap.com", role: "owner", entityAccess: ["CE", "SYN", "UUL", "FO", "PERSONAL"], telegramUserId: "7337144058", isActive: true },
      { handle: "ray", fullName: "Ray Mao", email: "ray@currentequities.com", role: "partner", entityAccess: ["CE"], isActive: true },
      { handle: "matt", fullName: "Matt", email: "matt@synergiscap.com", role: "partner", entityAccess: ["CE", "SYN"], isActive: true },
      { handle: "angel", fullName: "Angel Zhou", email: "angel@neuronvc.io", role: "principal", entityAccess: ["SYN"], isActive: true },
      { handle: "david", fullName: "David Wu", email: "david@synergiscap.com", role: "engineer", entityAccess: ["CE"], isActive: true },
    ])
    .returning();
  console.log(`  ✓ ${5} users`);

  // ─── PIPELINE DEFINITIONS ───
  const [ceLpPipeline, synDealPipeline] = await db
    .insert(pipelineDefinitions)
    .values([
      {
        name: "CE LP Fundraising", entityCode: "CE", pipelineType: "lp_commitment", isDefault: true,
        stages: [
          { key: "prospect", label: "Prospect", color: "#6b7280", sort_order: 0 },
          { key: "intro", label: "Intro", color: "#3b82f6", sort_order: 1 },
          { key: "meeting", label: "Meeting", color: "#f59e0b", sort_order: 2 },
          { key: "dd", label: "DD", color: "#8b5cf6", sort_order: 3 },
          { key: "soft_circle", label: "Soft Circle", color: "#06b6d4", sort_order: 4 },
          { key: "committed", label: "Committed", color: "#22c55e", sort_order: 5 },
          { key: "closed", label: "Closed", color: "#10b981", sort_order: 6 },
          { key: "passed", label: "Passed", color: "#ef4444", sort_order: 7 },
        ],
      },
      {
        name: "SYN Deal Pipeline", entityCode: "SYN", pipelineType: "vc_investment", isDefault: true,
        stages: [
          { key: "sourced", label: "Sourced", color: "#6b7280", sort_order: 0 },
          { key: "screening", label: "Screening", color: "#3b82f6", sort_order: 1 },
          { key: "dd", label: "DD", color: "#8b5cf6", sort_order: 2 },
          { key: "term_sheet", label: "Term Sheet", color: "#06b6d4", sort_order: 3 },
          { key: "invested", label: "Invested", color: "#22c55e", sort_order: 4 },
          { key: "passed", label: "Passed", color: "#ef4444", sort_order: 5 },
        ],
      },
    ])
    .returning();
  console.log(`  ✓ ${2} pipelines`);

  // ─── ORGANIZATIONS ───
  const orgData = [
    // CE LP targets
    { name: "Foxconn", nameZh: "富士康", orgType: "corporate" as const, orgSubtype: "electronics_mfg", headquarters: "Shenzhen", country: "China", entityTags: ["CE"], tags: ["strategic-lp", "manufacturer"], relationshipOwner: "ray", lpType: "corporate" as const, targetCommitment: "10000000", notes: "CDO 史喆 is key contact. Fortune 100 level network. Houston power division has 2 developers." },
    { name: "Dongshan Precision", nameZh: "东山精密", orgType: "corporate" as const, orgSubtype: "pcb_fpc", headquarters: "Suzhou", country: "China", entityTags: ["CE"], tags: ["strategic-lp", "manufacturer"], relationshipOwner: "ray", lpType: "corporate" as const, targetCommitment: "5000000", notes: "PCB/FPC leader. GMD acquisition = NA market. 赵总 overseas head in France till 4/28. Founder via Kelvin." },
    { name: "Mindray", nameZh: "迈瑞医疗", orgType: "corporate" as const, orgSubtype: "medical_devices", headquarters: "Shenzhen", country: "China", entityTags: ["CE"], tags: ["financial-lp"], relationshipOwner: "jerry", lpType: "corporate" as const, targetCommitment: "5000000", notes: "Relationship needs repair — World Labs/Figure incident. Daniel is LP contact. Approach carefully." },
    { name: "BYD Electronics", nameZh: "比亚迪电子", orgType: "corporate" as const, orgSubtype: "electronics_mfg", headquarters: "Shenzhen", country: "China", entityTags: ["CE"], tags: ["manufacturer", "supply-chain"], relationshipOwner: "ray", notes: "Potential AIDC equipment supplier. Evaluate energy storage + power equipment capabilities." },
    { name: "Century Huatong", nameZh: "世纪华通", orgType: "corporate" as const, orgSubtype: "aidc_operator", headquarters: "Shanghai", country: "China", entityTags: ["CE"], tags: ["developer", "strategic-lp"], relationshipOwner: "jerry", lpType: "corporate" as const, targetCommitment: "5000000", notes: "AIDC operator, APAC experience. Megaspeed (related asset) exit — Alibaba/Tencent hyperscaler ops." },
    { name: "Empower/EP", nameZh: "EP", orgType: "corporate" as const, orgSubtype: "epc", headquarters: "China", country: "China", entityTags: ["CE"], tags: ["epc", "strategic-lp"], relationshipOwner: "ray", lpType: "corporate" as const, targetCommitment: "3000000", notes: "EPC contractor + strategic investor. 孟总 has both eyes and wallet. Dual: EPC partnership + LP." },
    { name: "Meixing/Alic", nameZh: "美行", orgType: "corporate" as const, orgSubtype: "industrial", headquarters: "Ningbo", country: "China", entityTags: ["CE"], tags: ["financial-lp"], relationshipOwner: "jerry", lpType: "hnwi" as const, targetCommitment: "3000000", notes: "Alic — ~1B+ RMB cash, willing to invest several million USD as entry. Ningbo network = 3 days of LP intros." },
    { name: "Cucoro", orgType: "developer" as const, orgSubtype: "aidc_energy", headquarters: "New York", country: "USA", entityTags: ["CE"], tags: ["developer"], relationshipOwner: "ray", notes: "NYC founder, 10+ years solar, early Crusoe investor. 3 US sites (~9 GW), 1 GW France (final 2 bidders). Asking CE to co-invest." },
    { name: "Adidas Family Office", orgType: "lp" as const, headquarters: "Germany", country: "Germany", entityTags: ["CE"], tags: ["financial-lp"], relationshipOwner: "jerry", lpType: "family_office" as const, targetCommitment: "5000000", notes: "Alex Benete — 3rd gen Adidas family. Sports tech investor. HK roundtable attendee." },
    { name: "Swiss SFO (Jonas)", orgType: "lp" as const, headquarters: "Zurich", country: "Switzerland", entityTags: ["CE"], tags: ["financial-lp"], relationshipOwner: "jerry", lpType: "family_office" as const, targetCommitment: "10000000", notes: "Jonas Anker — invested in Middle East DC site. Deep infra knowledge. HK roundtable." },
    { name: "Du Ge Server Co", nameZh: "杜哥服务器", orgType: "corporate" as const, orgSubtype: "servers", headquarters: "Sichuan", country: "China", entityTags: ["CE"], tags: ["strategic-lp"], relationshipOwner: "ray", lpType: "corporate" as const, notes: "杜哥 in Sichuan — server business. First-hand AIDC supply chain info." },
    // SYN portfolio
    { name: "Nscale", orgType: "portfolio_company" as const, headquarters: "London", country: "UK", entityTags: ["SYN"], tags: ["ai-infra"], relationshipOwner: "jerry", notes: "Acquired AIP at $1.5B (5x in <1 year). Microsoft LOI for 1.35 GW. CE model proof point." },
    // UUL
    { name: "UUL Global", nameZh: "UUL全球", orgType: "portfolio_company" as const, headquarters: "Toronto", country: "Canada", entityTags: ["UUL"], tags: ["logistics"], relationshipOwner: "jerry", notes: "Jerry's operating company. Global end-to-end logistics. Asia factory → US/EU site bridge for CE." },
  ];

  const orgs = await db.insert(organizations).values(orgData).returning();
  console.log(`  ✓ ${orgs.length} organizations`);

  // Build org lookup
  const orgMap: Record<string, string> = {};
  for (const o of orgs) orgMap[o.name] = o.id;

  // ─── PEOPLE ───
  const peopleData = [
    { fullName: "史喆", fullNameZh: "史喆", title: "CDO (首席数字官)", relationshipStrength: "strong" as const, relationshipScore: 85, introducedByName: "水哥", introChain: "Ray → 水哥 → 史喆", entityTags: ["CE"], email: null, wechat: "shizhe_foxconn", notes: "Foxconn CDO. Fortune 100 network. 喆 = two 吉 stacked (rare char, NOT 哲)." },
    { fullName: "Kelvin Wong", title: "BD Contact", relationshipStrength: "medium" as const, relationshipScore: 60, introducedByName: "Ray Mao", introChain: "Ray → Kelvin → 东山精密", entityTags: ["CE"], notes: "Bridge to Dongshan Precision founder." },
    { fullName: "赵总", fullNameZh: "赵总", title: "Head of Overseas Operations", relationshipStrength: "medium" as const, relationshipScore: 55, entityTags: ["CE"], notes: "Dongshan Precision overseas head. In France till 4/28. Can arrange French energy ministry meeting." },
    { fullName: "Daniel", title: "LP Contact", relationshipStrength: "weak" as const, relationshipScore: 30, entityTags: ["CE"], notes: "Mindray LP contact. Relationship needs repair — World Labs/Figure incident." },
    { fullName: "杜哥", fullNameZh: "杜哥", title: "Owner", relationshipStrength: "medium" as const, relationshipScore: 50, entityTags: ["CE"], notes: "Server business in Sichuan. AIDC market first-hand knowledge." },
    { fullName: "Alic", title: "Owner/Investor", relationshipStrength: "strong" as const, relationshipScore: 75, entityTags: ["CE"], wechat: "alic_ningbo", notes: "美行. ~1B+ RMB cash. Key Ningbo network connector. 3-day trip scheduled." },
    { fullName: "孟总", fullNameZh: "孟总", title: "Strategic Investment + EPC", relationshipStrength: "medium" as const, relationshipScore: 50, entityTags: ["CE"], notes: "Empower/EP. Dual role: EPC contractor + potential LP." },
    { fullName: "Alex Benete", title: "Sports Tech Investor", relationshipStrength: "weak" as const, relationshipScore: 25, entityTags: ["CE"], notes: "Adidas family 3rd gen. HK roundtable attendee. Into sports tech — connect with 开开." },
    { fullName: "Jonas Anker", title: "DC Investor", relationshipStrength: "weak" as const, relationshipScore: 30, entityTags: ["CE"], notes: "Swiss SFO. Invested in Middle East DC site. Deep infra knowledge." },
    { fullName: "Cucoro Founder", title: "CEO", relationshipStrength: "medium" as const, relationshipScore: 55, entityTags: ["CE"], notes: "NYC-based, 10+ years solar, early Crusoe investor. 1 GW France site." },
    { fullName: "Alice", title: "AIDC Operations Contact", relationshipStrength: "weak" as const, relationshipScore: 20, entityTags: ["CE"], notes: "Century Huatong contact. Bridge to AIDC operations team." },
    { fullName: "Shawn", title: "Co-host", relationshipStrength: "medium" as const, relationshipScore: 45, entityTags: ["CE"], notes: "Avenir. Co-host of Industry Reborn roundtable. Event organizer." },
  ];

  const ppl = await db.insert(people).values(peopleData).returning();
  console.log(`  ✓ ${ppl.length} people`);

  const personMap: Record<string, string> = {};
  for (const p of ppl) personMap[p.fullName] = p.id;

  // ─── AFFILIATIONS ───
  const affiliData = [
    { personId: personMap["史喆"], organizationId: orgMap["Foxconn"], title: "CDO (首席数字官)", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Kelvin Wong"], organizationId: orgMap["Dongshan Precision"], title: "BD Contact", isPrimaryOrg: true, isPrimaryContact: false },
    { personId: personMap["赵总"], organizationId: orgMap["Dongshan Precision"], title: "Head of Overseas Operations", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Daniel"], organizationId: orgMap["Mindray"], title: "LP Contact", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["杜哥"], organizationId: orgMap["Du Ge Server Co"], title: "Owner", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Alic"], organizationId: orgMap["Meixing/Alic"], title: "Owner/Investor", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["孟总"], organizationId: orgMap["Empower/EP"], title: "Strategic Investment + EPC", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Alex Benete"], organizationId: orgMap["Adidas Family Office"], title: "Principal", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Jonas Anker"], organizationId: orgMap["Swiss SFO (Jonas)"], title: "Principal", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Cucoro Founder"], organizationId: orgMap["Cucoro"], title: "CEO", isPrimaryOrg: true, isPrimaryContact: true },
    { personId: personMap["Alice"], organizationId: orgMap["Century Huatong"], title: "AIDC Operations Contact", isPrimaryOrg: true, isPrimaryContact: true },
  ];

  await db.insert(personOrgAffiliations).values(affiliData);
  console.log(`  ✓ ${affiliData.length} affiliations`);

  // ─── OPPORTUNITIES (CE LP Pipeline) ───
  const oppData = [
    { name: "Foxconn — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "meeting", organizationId: orgMap["Foxconn"], entityCode: "CE", entityTags: ["CE"], dealSize: "10000000", commitment: null, leadOwner: "ray", description: "Strategic LP + OEM intro pipeline" },
    { name: "Dongshan Precision — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "intro", organizationId: orgMap["Dongshan Precision"], entityCode: "CE", entityTags: ["CE"], dealSize: "5000000", commitment: null, leadOwner: "ray", description: "PCB/FPC manufacturer, GMD NA presence" },
    { name: "Mindray — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "prospect", organizationId: orgMap["Mindray"], entityCode: "CE", entityTags: ["CE"], dealSize: "5000000", commitment: null, leadOwner: "jerry", description: "Relationship repair needed. Medical devices corp." },
    { name: "Century Huatong — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "intro", organizationId: orgMap["Century Huatong"], entityCode: "CE", entityTags: ["CE"], dealSize: "5000000", commitment: null, leadOwner: "jerry", description: "AIDC operator, potential operating partner" },
    { name: "Empower/EP — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "meeting", organizationId: orgMap["Empower/EP"], entityCode: "CE", entityTags: ["CE"], dealSize: "3000000", commitment: null, leadOwner: "ray", description: "EPC + strategic LP dual role" },
    { name: "Alic/Meixing — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "meeting", organizationId: orgMap["Meixing/Alic"], entityCode: "CE", entityTags: ["CE"], dealSize: "3000000", commitment: null, leadOwner: "jerry", description: "Ningbo connector. Cash-rich, willing entry ticket." },
    { name: "Adidas FO — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "prospect", organizationId: orgMap["Adidas Family Office"], entityCode: "CE", entityTags: ["CE"], dealSize: "5000000", commitment: null, leadOwner: "jerry", description: "3rd gen FO, sports tech focus. HK roundtable." },
    { name: "Swiss SFO — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "prospect", organizationId: orgMap["Swiss SFO (Jonas)"], entityCode: "CE", entityTags: ["CE"], dealSize: "10000000", commitment: null, leadOwner: "jerry", description: "ME DC investor. Deep infra knowledge." },
    { name: "Du Ge — CE Fund I LP", opportunityType: "lp_commitment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "prospect", organizationId: orgMap["Du Ge Server Co"], entityCode: "CE", entityTags: ["CE"], dealSize: "2000000", commitment: null, leadOwner: "ray", description: "Server biz owner, AIDC market insight." },
    { name: "Cucoro — CE Co-Investment", opportunityType: "pe_investment" as const, status: "active" as const, pipelineId: ceLpPipeline.id, stage: "dd", organizationId: orgMap["Cucoro"], entityCode: "CE", entityTags: ["CE"], dealSize: "50000000", commitment: null, leadOwner: "jerry", description: "1 GW France AIDC energy campus. Co-GP opportunity." },
  ];

  const opps = await db.insert(opportunities).values(oppData).returning();
  console.log(`  ✓ ${opps.length} opportunities`);

  const oppMap: Record<string, string> = {};
  for (const o of opps) oppMap[o.name] = o.id;

  // ─── INTERACTIONS (sample) ───
  const interactionData = [
    { orgId: orgMap["Foxconn"], personId: personMap["史喆"], interactionType: "meeting" as const, source: "manual" as const, teamMember: "ray", summary: "Initial intro via 水哥. 史喆 very interested in CE model. Discussed gas turbine OEM partnerships.", interactionDate: new Date("2026-03-15T10:00:00Z"), entityCode: "CE" },
    { orgId: orgMap["Dongshan Precision"], personId: personMap["Kelvin Wong"], interactionType: "intro" as const, source: "telegram" as const, teamMember: "ray", summary: "Kelvin introduced. Planning founder meeting. 赵总 in France till 4/28.", interactionDate: new Date("2026-03-20T08:00:00Z"), entityCode: "CE" },
    { orgId: orgMap["Cucoro"], personId: personMap["Cucoro Founder"], interactionType: "call" as const, source: "manual" as const, teamMember: "ray", summary: "Deep dive on France 1 GW site. Down to final 2 bidders. Asking CE to co-invest as co-GP.", interactionDate: new Date("2026-04-01T15:00:00Z"), entityCode: "CE" },
    { orgId: orgMap["Meixing/Alic"], personId: personMap["Alic"], interactionType: "call" as const, source: "wechat" as const, teamMember: "jerry", summary: "Confirmed 3-day Ningbo visit. Alic will arrange 5+ LP intros from his network.", interactionDate: new Date("2026-04-05T09:00:00Z"), entityCode: "CE" },
    { orgId: orgMap["Mindray"], personId: personMap["Daniel"], interactionType: "email" as const, source: "email" as const, teamMember: "jerry", summary: "Reconnection email. Casual tone, mentioned CE as new chapter. Daniel replied positively.", interactionDate: new Date("2026-04-02T12:00:00Z"), entityCode: "CE" },
  ];

  await db.insert(interactions).values(interactionData);
  console.log(`  ✓ ${interactionData.length} interactions`);

  // ─── FIELD TRIPS (roadshow migrated) ───
  const [trip] = await db
    .insert(fieldTrips)
    .values({
      name: "CE Fund I — Asia + Europe Roadshow",
      status: "active",
      entityCode: "CE",
      tripType: "roadshow",
      startDate: "2026-04-12",
      endDate: "2026-05-02",
      teamMembers: ["Jerry Shi", "Ray Mao"],
      tripBrief: `Current Equities is a dedicated infrastructure PE vehicle focused on behind-the-meter energy for AI data centers. We invest in the physical layer — power generation, energy campus development, and deployment infrastructure — that makes intelligence possible.\n\nFund I target: $300–500M. Geography: North America primary, Europe secondary.\n\nThe PPA Bridge: We sit at the intersection of power developers (who can build but can't sell) and hyperscalers (who need power but can't build). Our product = making energy campuses PPA-ready.\n\nAIP case study: Jerry invested at AIP Series A. Nscale acquired AIP at $1.5B (5x in <1 year). Microsoft LOI for 1.35 GW. This is the model we replicate.`,
      talkingPoints: {
        family_office: ["Behind-the-meter energy infrastructure = real assets with yield", "Not VC — infrastructure PE with downside protection", "AIP/Nscale: 5x return in <1 year on hard assets"],
        corporate: ["Supply chain opportunity — your manufacturing capabilities deployed in Western markets", "CE unlocks market access: local GP + hyperscaler network", "UUL as logistics bridge: Asia factory → US/EU site"],
        strategic: ["Gas turbine OEM partnership: 潍柴, 东方电气 connections", "Foxconn network for equipment sourcing", "Developer partnerships for site-level execution"],
      },
    })
    .returning();

  const [legHK, legChina, legParis, legMilken] = await db
    .insert(fieldTripLegs)
    .values([
      { tripId: trip.id, name: "Hong Kong", city: "Hong Kong", country: "Hong Kong", startDate: "2026-04-12", endDate: "2026-04-13", timezone: "Asia/Hong_Kong", sortOrder: 0, notes: "Industry Reborn roundtable + casual dinner night before" },
      { tripId: trip.id, name: "China — Shenzhen + Mainland", city: "Shenzhen, Ningbo, Shanghai", country: "China", startDate: "2026-04-14", endDate: "2026-04-22", timezone: "Asia/Shanghai", sortOrder: 1, notes: "Strategic LP meetings + partner visits. Alic network in Ningbo ~3 days." },
      { tripId: trip.id, name: "Paris — France Site Visit", city: "Paris", country: "France", startDate: "2026-04-24", endDate: "2026-04-28", timezone: "Europe/Paris", sortOrder: 2, notes: "Cucoro 1 GW AIDC energy campus site visit. Meet 赵总 (Dongshan Precision)." },
      { tripId: trip.id, name: "Milken Conference", city: "Los Angeles", country: "USA", startDate: "2026-05-02", endDate: "2026-05-02", timezone: "America/Los_Angeles", sortOrder: 3, notes: "Milken Institute Global Conference. LP networking." },
    ])
    .returning();

  // Meetings — same content, now linked to universal orgs + opportunities
  const meetingsData = [
    // HK
    { tripId: trip.id, legId: legHK.id, title: "Arrival Dinner — Roundtable Attendees", meetingDate: "2026-04-12", meetingTime: "19:00", durationMin: 120, location: "TBD — Hong Kong", meetingType: "dinner", status: "planned", language: "en", sortOrder: 0, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "Alex Benete", role: "attendee", org: "Adidas family (3rd gen)", title: "Sports tech investor" }, { name: "Jonas Anker", role: "attendee", org: "Swiss SFO", title: "Middle East DC investor" }, { name: "Steven", role: "attendee", org: "Manufacturing / Auto parts family" }], prepNotes: "Casual dinner to build rapport before the roundtable. Alex is into sports tech — connect with 开开 (also sports/entertainment). Jonas has Middle East DC experience. Keep it social, plant seeds for tomorrow's deeper discussion.", strategicAsk: "Build personal relationships. Understand each attendee's investment thesis and AIDC interest level.", pitchAngle: "Light touch — CE thesis overview, AIP story casually. Save the hard pitch for the roundtable." },
    { tripId: trip.id, legId: legHK.id, title: "Industry Reborn Roundtable", meetingDate: "2026-04-13", meetingTime: "09:00", durationMin: 480, location: "TBD — Hong Kong", meetingType: "roundtable", status: "planned", language: "en", sortOrder: 1, attendees: [{ name: "Jerry Shi", role: "host", org: "Current Equities" }, { name: "Ray Mao", role: "host", org: "Current Equities" }, { name: "Shawn", role: "co-host", org: "Avenir", title: "Co-host, event organizer" }, { name: "Alex Benete", role: "attendee", org: "Adidas family", title: "3rd generation, sports tech focus" }, { name: "Jonas Anker", role: "attendee", org: "Swiss SFO", title: "Invested in ME data center site" }], prepNotes: "One-day roundtable, ~20 people. Theme: AI/robotics/智能制造 (intelligent manufacturing). Co-hosted by Shawn/Avenir.", strategicAsk: "Position CE as the go-to vehicle for AIDC energy infrastructure. Identify 2-3 attendees with genuine LP potential.", pitchAngle: "Full CE thesis presentation. AIP case study (5x in <1 year). Why behind-the-meter energy is the infrastructure play of the decade." },
    // China
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Foxconn"], opportunityId: oppMap["Foxconn — CE Fund I LP"], title: "史喆/Foxconn — AIDC战略伙伴关系", meetingDate: "2026-04-14", meetingTime: "14:00", durationMin: 90, location: "深圳 — 富士康总部", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 2, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "史喆", role: "host", org: "富士康", title: "CDO (首席数字官)" }], prepNotes: "史喆是富士康CDO，人脉极广（Fortune 100级别）。上次交流对CE模式很感兴趣。他可以引荐：燃气轮机合作伙伴（潍柴、东方电气）、设备制造商。", strategicAsk: "1) 确认CE战略顾问角色 2) 燃气轮机OEM引荐 3) 富士康休斯顿电力部门开发商介绍 4) 探讨LP投资可能性", pitchAngle: "CE的PPA桥梁模式 + UUL供应链优势。展示AIP案例。强调中国制造商在西方AIDC建设中的关键角色。", introChain: "Ray → 水哥 → 史喆" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Du Ge Server Co"], opportunityId: oppMap["Du Ge — CE Fund I LP"], title: "杜哥 — 服务器业务 + AIDC机会", meetingDate: "2026-04-15", meetingTime: "10:00", durationMin: 90, location: "深圳", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 3, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "杜哥", role: "host", org: "服务器业务（四川）" }], prepNotes: "杜哥在四川做服务器业务，对AIDC市场有直接了解。", strategicAsk: "了解中国AIDC服务器市场现状。探讨CE合作模式——设备供应或LP投资。", pitchAngle: "CE聚焦能源基础设施，他专长服务器/计算——互补关系。" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["BYD Electronics"], title: "BYD电子 — 供应链/制造探讨", meetingDate: "2026-04-15", meetingTime: "15:00", durationMin: 60, location: "深圳 — 比亚迪", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 4, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }], prepNotes: "BYD电子是潜在的AIDC设备供应商。目标是了解储能和电力设备方面的能力。", strategicAsk: "评估BYD作为CE投资组合公司的设备供应商。", pitchAngle: "CE在北美/欧洲开发能源项目，需要亚洲制造商的设备供应链——UUL可以做物流桥梁。" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Century Huatong"], opportunityId: oppMap["Century Huatong — CE Fund I LP"], title: "世纪华通/Century Huatong — AIDC运营商", meetingDate: "2026-04-17", meetingTime: "10:00", durationMin: 90, location: "上海/杭州", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 5, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "Alice", role: "attendee", org: "世纪华通", title: "AIDC运营" }], prepNotes: "世纪华通是AIDC运营商，在亚太区域有丰富经验。Megaspeed退出——阿里/腾讯超算中心运营方。", strategicAsk: "1) 了解亚太AIDC运营经验 2) 评估作为CE运营合作伙伴的可能性 3) 探讨LP投资兴趣", pitchAngle: "CE提供北美AIDC能源基础设施的投资机会。他们有运营经验，我们有能源侧优势——互补合作。", introChain: "Alice → 世纪华通" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Empower/EP"], opportunityId: oppMap["Empower/EP — CE Fund I LP"], title: "孟总/Empower — 战略投资 + EPC", meetingDate: "2026-04-18", meetingTime: "14:00", durationMin: 90, location: "TBD — 中国", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 6, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "孟总", role: "host", org: "Empower/EP", title: "战略投资 + EPC" }], prepNotes: "Empower/EP团队是EPC联系人。孟总兼具战略眼光和投资能力。双重目标：EPC合作 + LP投资。", strategicAsk: "1) EPC合作框架 2) LP投资兴趣和规模 3) 介绍他们网络中的其他战略LP", pitchAngle: "CE的项目需要EPC能力——他们提供施工，我们提供项目pipeline和PPA。双赢关系。" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Meixing/Alic"], opportunityId: oppMap["Alic/Meixing — CE Fund I LP"], title: "美行/Alic — 宁波网络 (3天)", meetingDate: "2026-04-19", meetingTime: "09:00", durationMin: 180, location: "宁波", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 7, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "Alic", role: "host", org: "美行", title: "现金充裕，愿投数百万美元" }], prepNotes: "Alic（美行）手握约人民币10亿+现金，愿意投几百万美元作为入场费进入CE。宁波3天网络安排。", strategicAsk: "1) 确认Alic的LP投资规模和条件 2) 最大化利用他的宁波人脉——识别3-5个最佳strategic LP候选", pitchAngle: "对Alic：你既是LP投资者，也是我们在中国产业资本网络的关键connector。" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Dongshan Precision"], opportunityId: oppMap["Dongshan Precision — CE Fund I LP"], title: "东山精密/Kelvin — CE合作伙伴 + LP", meetingDate: "2026-04-21", meetingTime: "10:00", durationMin: 90, location: "TBD — 中国", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 8, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "Kelvin", role: "attendee", org: "东山精密", title: "与创始人的联系人" }], prepNotes: "东山精密是PCB/FPC领导企业，通过GMD收购进入北美市场。小袁的父亲是关键人物。赵总在法国到4/28。", strategicAsk: "1) 与创始人建立直接关系 2) 探讨战略LP投资 3) 北美市场协同", pitchAngle: "东山精密在PCB/电子制造领域的能力 + CE在AIDC能源基础设施的项目pipeline = 供应链level的深度合作。", introChain: "Ray → Kelvin → 东山精密创始人" },
    { tripId: trip.id, legId: legChina.id, organizationId: orgMap["Mindray"], opportunityId: oppMap["Mindray — CE Fund I LP"], title: "迈瑞/Mindray — Daniel重建关系", meetingDate: "2026-04-22", meetingTime: "14:00", durationMin: 60, location: "深圳", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 9, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Daniel", role: "host", org: "迈瑞医疗", title: "LP联系人" }], prepNotes: "Daniel的关系需要修复——World Labs和Figure事件损害了信任。Jerry先以CE角度接触。策略：先修复个人关系，再谈投资。", strategicAsk: "1) 重建个人信任 2) 介绍CE（全新的话题）3) 评估迈瑞的投资兴趣", pitchAngle: "不急于pitch。先叙旧，了解Daniel的近况。自然过渡到CE。", introChain: "Jerry直接 → Daniel → 迈瑞" },
    // Paris
    { tripId: trip.id, legId: legParis.id, organizationId: orgMap["Cucoro"], opportunityId: oppMap["Cucoro — CE Co-Investment"], title: "Cucoro — 1 GW France Site Visit", meetingDate: "2026-04-25", meetingTime: "09:00", durationMin: 480, location: "Paris / Site TBD — France", meetingType: "site_visit", status: "planned", language: "en", sortOrder: 10, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "Cucoro Founder", role: "host", org: "Cucoro", title: "Serial entrepreneur, 10+ years solar" }], prepNotes: "Cucoro founder is NYC-based, 10+ years in solar development, early investor in Crusoe. 1 GW France site, final 2 bidders.", strategicAsk: "1) Full technical diligence of France site 2) Evaluate co-GP partnership 3) Timeline for capital deployment", pitchAngle: "CE as co-GP: we bring capital + Asia supply chain (UUL) + hyperscaler network. Cucoro brings development expertise.", introChain: "Ray's LP (American) → friend → Cucoro founder" },
    { tripId: trip.id, legId: legParis.id, organizationId: orgMap["Dongshan Precision"], title: "赵总 — 东山精密海外 + 法国能源部", meetingDate: "2026-04-26", meetingTime: "10:00", durationMin: 120, location: "Paris — TBD", meetingType: "1on1", status: "planned", language: "zh", sortOrder: 11, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }, { name: "Ray Mao", role: "ce_team", org: "Current Equities" }, { name: "赵总", role: "host", org: "东山精密", title: "海外业务负责人" }], prepNotes: "赵总是东山精密海外业务负责人，在法国到4/28。可以安排法国能源部的会面。", strategicAsk: "1) 法国能源政策和AIDC机会 2) 安排法国能源部会面 3) 工厂参观 4) 强化战略合作", pitchAngle: "CE在法国的具体项目（Cucoro 1 GW site）+ 东山精密的欧洲布局 = 具体的协同场景。" },
    // Milken
    { tripId: trip.id, legId: legMilken.id, title: "Milken Institute Global Conference", meetingDate: "2026-05-02", meetingTime: "08:00", durationMin: 600, location: "Beverly Hilton, Los Angeles", meetingType: "conference", status: "planned", language: "en", sortOrder: 12, attendees: [{ name: "Jerry Shi", role: "ce_team", org: "Current Equities" }], prepNotes: "Major LP networking event. Focus on energy/infrastructure panels and 1-on-1 meetings.", strategicAsk: "Book 5-8 LP meetings at Milken. Focus on US family offices, endowments, and pension funds with energy/infra mandates.", pitchAngle: "Fresh off site visits in Asia + France. Can speak to real projects, not just a thesis." },
  ];

  await db.insert(fieldTripMeetings).values(meetingsData);
  console.log(`  ✓ ${meetingsData.length} meetings`);

  console.log("🎉 Orbit universal seed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
