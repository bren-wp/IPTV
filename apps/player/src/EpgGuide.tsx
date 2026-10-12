import { useEffect, useMemo, useState } from 'react';
import type { Channel, GuideSource } from './catalog';
import { loadProgrammeGuide, splitProgrammeSchedule } from './epg';
import type { Programme } from './epg';

export default function EpgGuide({ channel }: { channel: Channel }) {
  const sources = useMemo(() => (channel.guides ?? []).filter(s => s.format === 'XML'), [channel.guides]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const source = sources[sourceIndex] as GuideSource | undefined;
  const schedule = splitProgrammeSchedule(programmes, clock);

  useEffect(() => {
    setSourceIndex(0);
    setProgrammes([]);
    setError('');
    setClock(Date.now());
  }, [channel.id]);

  // The current programme changes over time without inventing new guide entries.
  useEffect(() => {
    const tick = () => { if (document.visibilityState !== 'hidden') setClock(Date.now()); };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    // Fetch only after explicitly opening a guide for a channel.
    setBusy(true);
    setError('');
    setProgrammes([]);
    const timeout = setTimeout(() => controller.abort(), 20_000);
    void loadProgrammeGuide(channel, source, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      if (!items.length && sourceIndex + 1 < sources.length) {
        setSourceIndex(index => index + 1);
        return;
      }
      setProgrammes(items);
      setClock(Date.now());
      if (!items.length) setError('No matching programmes are available from the published XMLTV guides.');
    }).catch(e => {
      if (!controller.signal.aborted) {
        if (sourceIndex + 1 < sources.length) {
          setSourceIndex(index => index + 1);
        } else {
          setError(e instanceof TypeError
            ? 'Guide providers may be unreachable or block cross-origin requests (CORS).'
            : e instanceof Error ? e.message : 'No available published programme guide.');
        }
      }
    }).finally(() => {
      clearTimeout(timeout);
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [channel, source, sourceIndex, sources.length]);

  if (!sources.length) return (
    <div className="guide-empty">No published XMLTV source is listed for this channel.</div>
  );

  const renderProgramme = (programme: Programme) => (
    <li key={programme.start + ':' + programme.title}>
      <time dateTime={new Date(programme.start).toISOString()}>{new Date(programme.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
      <div><strong>{programme.title}</strong>
        {programme.subtitle && <span>{programme.subtitle}</span>}
        {programme.description && <p>{programme.description}</p>}</div>
    </li>
  );

  return (
    <section className="epg-content" aria-label="Electronic programme guide">
      <div className="epg-controls">
        <label>Guide source
          <select value={sourceIndex} onChange={e => setSourceIndex(Number(e.target.value))}>
            {sources.map((s, index) => <option value={index} key={s.url + index}>
              {s.site} {s.lang ? '· ' + s.lang : ''}
            </option>)}
          </select>
        </label>
        <a href={source?.url} target="_blank" rel="noreferrer noopener">Open source ↗</a>
      </div>
      {busy && <p role="status" className="guide-empty">Loading TV schedule…</p>}
      {error && <p role="alert" className="guide-empty">{error}</p>}
      {!busy && schedule.current && <div className="epg-current">
        <div className="eyebrow">ON NOW</div>
        <strong>{schedule.current.title}</strong>
        <span>{new Date(schedule.current.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(schedule.current.stop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {schedule.current.description && <p>{schedule.current.description}</p>}
      </div>}
      {!busy && schedule.next.length > 0 && <div className="epg-next">
        <div className="eyebrow">UP NEXT</div>
        <ol>{schedule.next.map(renderProgramme)}</ol>
      </div>}
      <p className="epg-note">Guide times use your device's time zone. Providers may restrict cross-origin access. Programme data is third-party information.</p>
    </section>
  );
}
