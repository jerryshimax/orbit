import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeUnifiedMeetings } from "./meetings-all";

test("mergeUnifiedMeetings: roadshow rows get source='roadshow' and /meetings/:id href", () => {
  const out = mergeUnifiedMeetings(
    [
      {
        id: "m1",
        tripId: "t1",
        legId: "l1",
        organizationId: "o1",
        title: "Coffee with Acme",
        meetingDate: "2026-04-20",
        meetingTime: "10:00:00",
        location: "NYC",
        status: "confirmed",
        language: "en",
        attendees: [],
        strategicAsk: "check size",
        orgName: "Acme",
        oppStage: "screening",
      },
    ],
    []
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].source, "roadshow");
  assert.equal(out[0].href, "/meetings/m1");
  assert.equal(out[0].orgName, "Acme");
  assert.equal(out[0].tripId, "t1");
});

test("mergeUnifiedMeetings: brain rows get source='brain' and derive title from summary", () => {
  const out = mergeUnifiedMeetings(
    [],
    [
      {
        id: "i1",
        orgId: "o9",
        orgName: "Globex",
        summary: "Met with Globex CTO\nDiscussed power PPAs",
        interactionDate: new Date("2026-04-10T15:30:00Z"),
        location: "Zoom",
        entityCode: "CE",
      },
    ]
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].source, "brain");
  assert.equal(out[0].title, "Met with Globex CTO");
  assert.equal(out[0].meetingDate, "2026-04-10");
  assert.equal(out[0].orgName, "Globex");
  assert.equal(out[0].entityCode, "CE");
});

test("mergeUnifiedMeetings: unions both sources and sorts by date desc", () => {
  const out = mergeUnifiedMeetings(
    [
      {
        id: "m_old",
        tripId: "t",
        legId: null,
        organizationId: null,
        title: "Older roadshow",
        meetingDate: "2026-01-05",
        meetingTime: "09:00:00",
        location: null,
        status: "completed",
        language: "en",
        attendees: [],
        strategicAsk: null,
        orgName: null,
        oppStage: null,
      },
      {
        id: "m_new",
        tripId: "t",
        legId: null,
        organizationId: null,
        title: "Newer roadshow",
        meetingDate: "2026-05-01",
        meetingTime: "09:00:00",
        location: null,
        status: "planned",
        language: "en",
        attendees: [],
        strategicAsk: null,
        orgName: null,
        oppStage: null,
      },
    ],
    [
      {
        id: "b1",
        orgId: null,
        orgName: null,
        summary: "Brain meeting mid",
        interactionDate: "2026-03-15T00:00:00Z",
        location: null,
        entityCode: null,
      },
    ]
  );
  assert.equal(out.length, 3);
  assert.deepEqual(
    out.map((m) => m.id),
    ["m_new", "b1", "m_old"]
  );
});

test("mergeUnifiedMeetings: rows with null dates sort to the end", () => {
  const out = mergeUnifiedMeetings(
    [
      {
        id: "nodate",
        tripId: "t",
        legId: null,
        organizationId: null,
        title: "TBD",
        meetingDate: null,
        meetingTime: null,
        location: null,
        status: "identified",
        language: "en",
        attendees: [],
        strategicAsk: null,
        orgName: null,
        oppStage: null,
      },
      {
        id: "dated",
        tripId: "t",
        legId: null,
        organizationId: null,
        title: "Real",
        meetingDate: "2026-04-01",
        meetingTime: "09:00:00",
        location: null,
        status: "confirmed",
        language: "en",
        attendees: [],
        strategicAsk: null,
        orgName: null,
        oppStage: null,
      },
    ],
    []
  );
  assert.equal(out[0].id, "dated");
  assert.equal(out[1].id, "nodate");
});
