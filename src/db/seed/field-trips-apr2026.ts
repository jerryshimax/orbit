import { db } from "@/db";
import { fieldTrips, fieldTripLegs, fieldTripMeetings } from "@/db/schema";

async function seed() {
  console.log("🌱 Seeding field trip data...");

  // Clear existing field trip data
  await db.delete(fieldTripMeetings);
  await db.delete(fieldTripLegs);
  await db.delete(fieldTrips);

  // --- TRIP ---
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
      tripBrief: `Current Equities is a dedicated infrastructure PE vehicle focused on behind-the-meter energy for AI data centers. We invest in the physical layer — power generation, energy campus development, and deployment infrastructure — that makes intelligence possible.

Fund I target: $300–500M. Geography: North America primary, Europe secondary.

The PPA Bridge: We sit at the intersection of power developers (who can build but can't sell) and hyperscalers (who need power but can't build). Our product = making energy campuses PPA-ready.

AIP case study: Jerry invested at AIP Series A. Nscale acquired AIP at $1.5B (5x in <1 year). Microsoft LOI for 1.35 GW. This is the model we replicate.`,
      talkingPoints: {
        family_office: [
          "Behind-the-meter energy infrastructure = real assets with yield",
          "Not VC — infrastructure PE with downside protection",
          "AIP/Nscale: 5x return in <1 year on hard assets",
          "Chinese LPs below 25% of any utility = no UBO concerns",
        ],
        corporate: [
          "Supply chain opportunity — your manufacturing capabilities deployed in Western markets",
          "CE unlocks market access: local GP + hyperscaler network",
          "UUL as logistics bridge: Asia factory → US/EU site",
        ],
        strategic: [
          "Gas turbine OEM partnership: 潍柴, 东方电气 connections",
          "Foxconn network for equipment sourcing",
          "Developer partnerships for site-level execution",
        ],
      },
    })
    .returning();

  console.log(`  ✅ Trip created: ${trip.id}`);

  // --- LEGS ---
  const [legHK, legChina, legParis, legMilken] = await db
    .insert(fieldTripLegs)
    .values([
      {
        tripId: trip.id,
        name: "Hong Kong",
        city: "Hong Kong",
        country: "Hong Kong",
        startDate: "2026-04-12",
        endDate: "2026-04-13",
        timezone: "Asia/Hong_Kong",
        sortOrder: 0,
        notes: "Industry Reborn roundtable + casual dinner night before",
      },
      {
        tripId: trip.id,
        name: "China — Shenzhen + Mainland",
        city: "Shenzhen, Ningbo, Shanghai",
        country: "China",
        startDate: "2026-04-14",
        endDate: "2026-04-22",
        timezone: "Asia/Shanghai",
        sortOrder: 1,
        notes:
          "Strategic LP meetings + partner visits. Alic network in Ningbo ~3 days.",
      },
      {
        tripId: trip.id,
        name: "Paris — France Site Visit",
        city: "Paris",
        country: "France",
        startDate: "2026-04-24",
        endDate: "2026-04-28",
        timezone: "Europe/Paris",
        sortOrder: 2,
        notes:
          "Cucoro 1 GW AIDC energy campus site visit. Meet 赵总 (Dongshan Precision).",
      },
      {
        tripId: trip.id,
        name: "Milken Conference",
        city: "Los Angeles",
        country: "USA",
        startDate: "2026-05-02",
        endDate: "2026-05-02",
        timezone: "America/Los_Angeles",
        sortOrder: 3,
        notes: "Milken Institute Global Conference. LP networking.",
      },
    ])
    .returning();

  console.log(`  ✅ ${4} legs created`);

  // --- MEETINGS ---
  const meetingsData = [
    // === HK LEG ===
    {
      tripId: trip.id,
      legId: legHK.id,
      title: "Arrival Dinner — Roundtable Attendees",
      meetingDate: "2026-04-12",
      meetingTime: "19:00",
      durationMin: 120,
      location: "TBD — Hong Kong",
      meetingType: "dinner",
      status: "planned",
      language: "en",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "Alex Benete",
          role: "attendee",
          org: "Adidas family (3rd gen)",
          title: "Sports tech investor",
        },
        {
          name: "Jonas Anker",
          role: "attendee",
          org: "Swiss SFO",
          title: "Middle East DC investor",
        },
        {
          name: "Steven",
          role: "attendee",
          org: "Manufacturing / Auto parts family",
        },
      ],
      prepNotes:
        "Casual dinner to build rapport before the roundtable. Alex is into sports tech — connect with 开开 (also sports/entertainment). Jonas has Middle East DC experience. Keep it social, plant seeds for tomorrow's deeper discussion.",
      strategicAsk:
        "Build personal relationships. Understand each attendee's investment thesis and AIDC interest level.",
      pitchAngle:
        "Light touch — CE thesis overview, AIP story casually. Save the hard pitch for the roundtable.",
      sortOrder: 0,
    },
    {
      tripId: trip.id,
      legId: legHK.id,
      title: "Industry Reborn Roundtable",
      meetingDate: "2026-04-13",
      meetingTime: "09:00",
      durationMin: 480,
      location: "TBD — Hong Kong",
      meetingType: "roundtable",
      status: "planned",
      language: "en",
      attendees: [
        { name: "Jerry Shi", role: "host", org: "Current Equities" },
        { name: "Ray Mao", role: "host", org: "Current Equities" },
        {
          name: "Shawn",
          role: "co-host",
          org: "Avenir",
          title: "Co-host, event organizer",
        },
        {
          name: "Alex Benete",
          role: "attendee",
          org: "Adidas family",
          title: "3rd generation, sports tech focus",
        },
        {
          name: "Jonas Anker",
          role: "attendee",
          org: "Swiss SFO",
          title: "Invested in ME data center site",
        },
        {
          name: "Aaron Hudton",
          role: "attendee",
          org: "Family office",
          title: "Manages wife's family money",
        },
        { name: "Kinch (2 people)", role: "attendee", org: "Secondary markets" },
        {
          name: "Steven",
          role: "attendee",
          org: "Auto parts family",
          title: "Returning from Europe/ME",
        },
      ],
      prepNotes:
        "One-day roundtable, ~20 people. Theme: AI/robotics/智能制造 (intelligent manufacturing). Co-hosted by Shawn/Avenir. Industry Reborn format = intros + panel discussion + networking. 史喆 was hard-invited — his events are Fortune 100 level, don't waste his time on weak delegation. Shenzhen delegation cancelled due to Middle East war situation. This is now the main event.",
      strategicAsk:
        "Position CE as the go-to vehicle for AIDC energy infrastructure. Identify 2-3 attendees with genuine LP potential. Get Alex and Jonas interested in a deeper conversation.",
      pitchAngle:
        "Full CE thesis presentation. AIP case study (5x in <1 year). Why behind-the-meter energy is the infrastructure play of the decade. Frame as: this is not VC, this is hard assets with yield + upside.",
      sortOrder: 1,
    },

    // === CHINA LEG ===
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "史喆/Foxconn — AIDC战略伙伴关系",
      meetingDate: "2026-04-14",
      meetingTime: "14:00",
      durationMin: 90,
      location: "深圳 — 富士康总部",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "史喆",
          role: "host",
          org: "富士康",
          title: "CDO (首席数字官)",
        },
      ],
      prepNotes:
        "史喆是富士康CDO，人脉极广（Fortune 100级别）。上次交流对CE模式很感兴趣。他可以引荐：燃气轮机合作伙伴（潍柴、东方电气）、设备制造商。富士康休斯顿电力部门有2个开发商（1美国人、1中国人）——等Ray确认后安排介绍。注意：史喆的名字是「喆」（两个吉），不是「哲」。",
      strategicAsk:
        "1) 确认CE战略顾问角色 2) 燃气轮机OEM引荐（潍柴/东方电气）3) 富士康休斯顿电力部门开发商介绍 4) 探讨LP投资可能性",
      pitchAngle:
        "CE的PPA桥梁模式 + UUL供应链优势。展示AIP案例。强调中国制造商在西方AIDC建设中的关键角色——史喆理解这个机会。",
      introChain: "Ray → 水哥 → 史喆",
      sortOrder: 2,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "杜哥 — 服务器业务 + AIDC机会",
      meetingDate: "2026-04-15",
      meetingTime: "10:00",
      durationMin: 90,
      location: "深圳",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        { name: "杜哥", role: "host", org: "服务器业务（四川）" },
      ],
      prepNotes:
        "杜哥在四川做服务器业务，对AIDC市场有直接了解。可以提供中国AIDC产业链的一手信息。探讨他作为strategic LP或合作伙伴的可能性。",
      strategicAsk:
        "了解中国AIDC服务器市场现状。探讨CE合作模式——设备供应或LP投资。",
      pitchAngle:
        "CE聚焦能源基础设施，他专长服务器/计算——互补关系。展示AIP案例中设备采购的关键作用。",
      sortOrder: 3,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "BYD电子 — 供应链/制造探讨",
      meetingDate: "2026-04-15",
      meetingTime: "15:00",
      durationMin: 60,
      location: "深圳 — 比亚迪",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
      ],
      prepNotes:
        "BYD电子是潜在的AIDC设备供应商。通过Ray安排。目标是了解他们在储能和电力设备方面的能力，以及对北美/欧洲市场的兴趣。",
      strategicAsk:
        "评估BYD作为CE投资组合公司的设备供应商。了解储能解决方案的成本和交付周期。",
      pitchAngle:
        "CE在北美/欧洲开发能源项目，需要亚洲制造商的设备供应链——UUL可以做物流桥梁。",
      sortOrder: 4,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "世纪华通/Century Huatong — AIDC运营商",
      meetingDate: "2026-04-17",
      meetingTime: "10:00",
      durationMin: 90,
      location: "上海/杭州",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "Alice联系人",
          role: "attendee",
          org: "世纪华通",
          title: "AIDC运营",
        },
      ],
      prepNotes:
        "世纪华通是AIDC运营商，在亚太区域有丰富经验。Alice是联系人。Megaspeed（他们关联的资产）想要退出——阿里/腾讯是背后的超算中心运营方。了解他们的运营模式和进入北美市场的兴趣。",
      strategicAsk:
        "1) 了解亚太AIDC运营经验 2) 评估作为CE运营合作伙伴的可能性 3) 探讨LP投资兴趣",
      pitchAngle:
        "CE提供北美AIDC能源基础设施的投资机会。他们有运营经验，我们有能源侧优势——互补合作。",
      introChain: "Alice → 世纪华通",
      sortOrder: 5,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "孟总/Empower — 战略投资 + EPC",
      meetingDate: "2026-04-18",
      meetingTime: "14:00",
      durationMin: 90,
      location: "TBD — 中国",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "孟总",
          role: "host",
          org: "Empower/EP",
          title: "战略投资 + EPC",
        },
      ],
      prepNotes:
        "Empower/EP团队是EPC联系人（上次出差认识的）。孟总兼具战略眼光和投资能力。双重目标：1) EPC合作（为CE项目提供工程施工能力）2) 直接LP投资。",
      strategicAsk:
        "1) EPC合作框架——他们能否为北美AIDC项目提供施工管理 2) LP投资兴趣和规模 3) 介绍他们网络中的其他战略LP",
      pitchAngle:
        "CE的项目需要EPC能力——他们提供施工，我们提供项目pipeline和PPA。双赢关系。同时展示LP投资的财务回报。",
      sortOrder: 6,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "美行/Alic — 宁波网络 (3天)",
      meetingDate: "2026-04-19",
      meetingTime: "09:00",
      durationMin: 180,
      location: "宁波",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "Alic",
          role: "host",
          org: "美行",
          title: "现金充裕，愿投数百万美元",
        },
      ],
      prepNotes:
        "Alic（美行）手握约人民币10亿+现金，愿意投几百万美元作为'入场费'进入CE。在宁波有3天的网络安排——他的人脉可以引荐大量潜在战略LP。目标是通过他的网络高效接触多个潜在LP。",
      strategicAsk:
        "1) 确认Alic的LP投资规模和条件 2) 最大化利用他的宁波人脉——识别3-5个最佳strategic LP候选 3) 了解当地产业资本对AIDC基础设施的兴趣",
      pitchAngle:
        "对Alic：你既是LP投资者，也是我们在中国产业资本网络的关键connector。对他的人脉：CE = 用中国制造能力建设西方AIDC基础设施的桥梁。",
      sortOrder: 7,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "东山精密/Kelvin — CE合作伙伴 + LP",
      meetingDate: "2026-04-21",
      meetingTime: "10:00",
      durationMin: 90,
      location: "TBD — 中国",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "Kelvin",
          role: "attendee",
          org: "东山精密",
          title: "与创始人的联系人",
        },
      ],
      prepNotes:
        "东山精密是PCB/FPC领导企业，通过GMD收购进入北美市场。小袁的父亲是关键人物——几千万人民币级别的投资没问题，非常strategic。Ray牵头。通过Kelvin联系创始人。同时讨论N4XT/Keith Abell合作。赵总（东山精密海外负责人）在法国到4/28——后续法国会面。",
      strategicAsk:
        "1) 与创始人建立直接关系 2) 探讨战略LP投资 3) 北美市场协同（GMD收购后的产能）4) 引荐到法国站赵总的会面",
      pitchAngle:
        "东山精密在PCB/电子制造领域的能力 + CE在AIDC能源基础设施的项目pipeline = 供应链level的深度合作。不只是LP投资，是战略伙伴。",
      introChain: "Ray → Kelvin → 东山精密创始人",
      sortOrder: 8,
    },
    {
      tripId: trip.id,
      legId: legChina.id,
      title: "迈瑞/Mindray — Daniel重建关系",
      meetingDate: "2026-04-22",
      meetingTime: "14:00",
      durationMin: 60,
      location: "深圳",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        {
          name: "Daniel",
          role: "host",
          org: "迈瑞医疗",
          title: "LP联系人",
        },
      ],
      prepNotes:
        "Daniel（迈瑞）的关系需要修复——World Labs和Figure事件损害了信任。Jerry先以CE角度接触，Ray后续自然加入。迈瑞绝对有兴趣但需要谨慎接触。策略：先修复个人关系，再谈投资。",
      strategicAsk:
        "1) 重建个人信任 2) 介绍CE（全新的话题，与之前的问题无关）3) 评估迈瑞的投资兴趣和决策流程",
      pitchAngle:
        "不急于pitch。先叙旧，了解Daniel的近况。自然过渡到CE——作为一个全新的基础设施投资机会，与之前的VC投资完全不同。",
      introChain: "Jerry直接 → Daniel → 迈瑞",
      sortOrder: 9,
    },

    // === PARIS LEG ===
    {
      tripId: trip.id,
      legId: legParis.id,
      title: "Cucoro — 1 GW France Site Visit",
      meetingDate: "2026-04-25",
      meetingTime: "09:00",
      durationMin: 480,
      location: "Paris / Site TBD — France",
      meetingType: "site_visit",
      status: "planned",
      language: "en",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "Cucoro Founder",
          role: "host",
          org: "Cucoro",
          title: "Serial entrepreneur, 10+ years solar, early Crusoe investor",
        },
      ],
      prepNotes:
        "Cucoro founder is NYC-based, 10+ years in solar development, early investor in Crusoe (Nscale competitor). Started AIDC energy campus development 2 years ago. Has 3 US sites (~9 GW total if approved, 1 likely), now sees France/Europe as better opportunity. Bidding on French site, 1 GW, down to final 2 bidders — planning to join forces with the other bidder. Asking CE to co-invest. Key issue: Jerry and Ray can't evaluate independently — need expert to diligence.",
      strategicAsk:
        "1) Full technical diligence of the France site 2) Understand Cucoro's team and execution capability 3) Evaluate co-GP partnership structure 4) Timeline for capital deployment 5) What does the other bidder bring?",
      pitchAngle:
        "CE as co-GP: we bring capital + Asia supply chain (UUL) + hyperscaler network. Cucoro brings development expertise + European pipeline. Frame as strategic partnership, not just financial investment.",
      introChain: "Ray's LP (American) → friend → Cucoro founder",
      sortOrder: 10,
    },
    {
      tripId: trip.id,
      legId: legParis.id,
      title: "赵总 — 东山精密海外 + 法国能源部",
      meetingDate: "2026-04-26",
      meetingTime: "10:00",
      durationMin: 120,
      location: "Paris — TBD",
      meetingType: "1on1",
      status: "planned",
      language: "zh",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
        { name: "Ray Mao", role: "ce_team", org: "Current Equities" },
        {
          name: "赵总",
          role: "host",
          org: "东山精密",
          title: "海外业务负责人，在法国到4/28",
        },
      ],
      prepNotes:
        "赵总是东山精密海外业务负责人，在法国到4/28。他可以安排法国能源部的会面和工厂参观。这是深圳东山精密会面的延续——同一个公司，不同角度（海外运营vs国内投资）。",
      strategicAsk:
        "1) 法国能源政策和AIDC机会的一手信息 2) 安排法国能源部会面 3) 工厂参观了解欧洲制造能力 4) 强化东山精密的战略合作关系",
      pitchAngle:
        "CE在法国的具体项目（Cucoro 1 GW site）+ 东山精密的欧洲布局 = 具体的协同场景。不是空谈，是有落地项目的讨论。",
      sortOrder: 11,
    },

    // === MILKEN ===
    {
      tripId: trip.id,
      legId: legMilken.id,
      title: "Milken Institute Global Conference",
      meetingDate: "2026-05-02",
      meetingTime: "08:00",
      durationMin: 600,
      location: "Beverly Hilton, Los Angeles",
      meetingType: "conference",
      status: "planned",
      language: "en",
      attendees: [
        { name: "Jerry Shi", role: "ce_team", org: "Current Equities" },
      ],
      prepNotes:
        "Major LP networking event. Focus on energy/infrastructure panels and 1-on-1 meetings. Pre-schedule meetings with target LPs who will attend. Bring printed CE one-pagers. Follow up on any warm leads from the Asia/Europe trip.",
      strategicAsk:
        "Book 5-8 LP meetings at Milken. Focus on US family offices, endowments, and pension funds with energy/infra mandates.",
      pitchAngle:
        "Fresh off site visits in Asia + France. Can speak to real projects, not just a thesis. AIP case study + Cucoro France opportunity = proof of pipeline.",
      sortOrder: 12,
    },
  ];

  await db.insert(fieldTripMeetings).values(meetingsData);
  console.log(`  ✅ ${meetingsData.length} meetings created`);
  console.log("🎉 Field trip seed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
