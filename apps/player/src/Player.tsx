import { useEffect, useRef, useState } from 'react';
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
    // Capture the narrowed element for use inside the async setup callback.
    const readyVideo: HTMLVideoElement = video;
    let stopped = false;
    let hls: import('hls.js').default | null = null;
    setError('');
    setNotice('');
    readyVideo.pause();
    readyVideo.removeAttribute('src');
    readyVideo.load();
    const path = new URL(stream.url).pathname.toLowerCase();
    const isHls = path.endsWith('.m3u8');
    const isDash = path.endsWith('.mpd');

    async function attach(): Promise<void> {
      if (isDash) {
        setError('DASH playback is not supported by this player yet. Try another available stream.');
        return;
      }
      if (isHls && !readyVideo.canPlayType('application/vnd.apple.mpegurl')) {
        // Load the comparatively large playback engine only for a selected HLS stream.
        const { default: Hls } = await import('hls.js');
        if (stopped) return;
        if (!Hls.isSupported()) {
          setError('This device does not support HLS playback. Try another source.');
          return;
        }
        const instance = new Hls({ lowLatencyMode: false, maxBufferLength: 30, backBufferLength: 30 });
        hls = instance;
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!stopped && data.fatal) {
            setError('This HLS stream could not be played. It may be offline or blocked in your region.');
          }
        });
        instance.loadSource(stream.url);
        instance.attachMedia(readyVideo);
        // HLS.js will attach the media asynchronously.
        instance.once(Hls.Events.MANIFEST_PARSED, () => {
          if (!stopped) void readyVideo.play().catch(() => {
            if (!stopped) setNotice('Select Play on the video to start watching.');
          });
        });
      } else {
        readyVideo.src = stream.url;
        void readyVideo.play().catch(() => {
          if (!stopped) setNotice('Select Play on the video to start watching.');
        });
      }
    }
    void attach().catch(() => {
      if (!stopped) setError('Playback engine could not initialize. Try another source.');
    });
    return () => {
      stopped = true;
      readyVideo.pause();
      hls?.destroy();
      readyVideo.removeAttribute('src');
      readyVideo.load();
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
