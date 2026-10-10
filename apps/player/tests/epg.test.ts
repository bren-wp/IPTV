import assert from 'node:assert/strict';
import test from 'node:test';
import { parseXmltvDate, splitProgrammeSchedule } from '../src/epg.ts';

test('XMLTV timestamps normalize positive and negative explicit offsets', () => {
  assert.equal(parseXmltvDate('20261010183000 +0200'), Date.UTC(2026, 9, 10, 16, 30, 0));
  assert.equal(parseXmltvDate('20261010120000 -0400'), Date.UTC(2026, 9, 10, 16, 0, 0));
  assert.equal(parseXmltvDate('202610101200 +0200'), Date.UTC(2026, 9, 10, 10, 0, 0));
});
test('invalid or ambiguous XMLTV date strings are rejected', () => {
  for (const date of ['20261010183000', '20261310120000 +0000', '20260230120000 +0000',
    '20261010250000 +0000', '20261010120000 +2460', '20261010120000 +0200 garbage']) {
    assert.equal(parseXmltvDate(date), null, date);
  }
});
test('now and next programmes use half-open ranges', () => {
  const now = 100_000;
  const items = [
    {title:'Earlier',start:0,stop:now,subtitle:null,description:null,category:null},
    {title:'Live',start:now,stop:now+1000,subtitle:null,description:null,category:null},
    {title:'Upcoming',start:now+1000,stop:now+2000,subtitle:null,description:null,category:null}
  ];
  const schedule = splitProgrammeSchedule(items,now);
  assert.equal(schedule.current?.title,'Live');
  assert.deepEqual(schedule.next.map(p=>p.title),['Upcoming']);
});
