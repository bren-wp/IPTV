import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { Stream } from './catalog';

interface Props {
  stream: Stream;
  channelName: string;
  onNextStream: () => void;
  hasNextStream: boolean;
}

export default function Player({ stream, channelName, onNextStream, hasNextStream }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    setError('');
    setNotice('');
    video.pause();
    video.removeAttribute('src');
    video.load();
    const path = new URL(stream.url).pathname.toLowerCase();
    const isHls = path.endsWith('.m3u8');
    const isDash = path.endsWith('.mpd');
    if (isDash) {
      setError('DASH playback is not supported by this player yet. Try another available stream.');
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.url;
    } else if (isHls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false, maxBufferLength: 30, backBufferLength: 30 });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError('This HLS stream could not be played. It may be offline or blocked in your region.');
      });
      hls.loadSource(stream.url);
      hls.attachMedia(video);
    } else {
      video.src = stream.url;
    }
    if (!isDash) {
      // A user click initiated selection, but browsers may still require a second play gesture.
      void video.play().catch(() => setNotice('Select Play on the video to start watching.'));
    }
    return () => {
      video.pause();
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [stream.url]);

  return (
    <section className="player-shell" aria-label="Live player">
      <div className="video-frame">
        <video
          ref={videoRef}
          controls
          playsInline
          aria-label={channelName + ' live video'}
          onPlaying={() => setNotice('')}
          onError={() => setError('Playback failed. The remote stream may be offline or unsupported.')}
        />
        <span className="live-flag"><span className="live-dot" /> LIVE</span>
      </div>
      {stream.requiresHeaders && (
        <p className="player-warning" role="note">
          This source requires custom request headers. Browser and TV playback may be restricted.
        </p>
      )}
      {stream.url.startsWith('http:') && location.protocol === 'https:' && (
        <p className="player-warning" role="note">
          This source uses HTTP and may be blocked by HTTPS mixed-content security rules.
        </p>
      )}
      {stream.labels.length > 0 && <p className="player-warning">{stream.labels.join(' · ')}</p>}
      {notice && !error && <p className="player-notice" role="status">{notice}</p>}
      {error && (
        <div className="player-error" role="alert">
          <p>{error}</p>
          {hasNextStream && <button className="button button-primary" type="button" onClick={onNextStream}>Try another stream</button>}
        </div>
      )}
    </section>
  );
}
