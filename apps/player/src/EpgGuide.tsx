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
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const source = sources[sourceIndex] as GuideSource | undefined;
  const schedule = splitProgrammeSchedule(programmes, lastChecked ?? Date.now());

  useEffect(() => {
    setSourceIndex(0);
    setProgrammes([]);
    setError('');
    setLastChecked(null);
  }, [channel.id]);

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
      setProgrammes(items);
      setLastChecked(Date.now());
      if (!items.length) setError('No matching programmes are available in this XMLTV source.');
    }).catch(e => {
      if (!controller.signal.aborted) setError(
        (e instanceof TypeError ? 'The guide server may block browser requests (CORS), or be unreachable.' :
          e instanceof Error ? e.message : 'Guide could not be loaded.')
      );
    }).finally(() => {
      clearTimeout(timeout);
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [channel, source]);

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
