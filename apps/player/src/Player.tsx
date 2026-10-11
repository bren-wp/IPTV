import { useEffect, useRef, useState } from 'react';
import type { Stream } from './catalog';
import { shouldRecoverHls } from './stream-recovery';

interface Props {
  stream: Stream;
  channelName: string;
  onNextStream: () => void;
  /** Switch to a previously untried alternate source. Return false if all failed. */
  onAutoNext: () => boolean;
  hasNextStream: boolean;
}

export default function Player({ stream, channelName, onNextStream, onAutoNext, hasNextStream }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const readyVideo: HTMLVideoElement = video;
    let stopped = false;
    let failed = false;
    let mediaWasPlaying = false;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    let autoplayBlocked = false;
    let networkRecovered = false;
    let mediaRecovered = false;
    let hls: import('hls.js').default | null = null;
    setError('');
    setNotice('');
    readyVideo.pause();
    readyVideo.removeAttribute('src');
    readyVideo.load();

    function clearStartup(): void {
      if (startupTimer !== null) clearTimeout(startupTimer);
      startupTimer = null;
    }
    function watchStartup(): void {
      clearStartup();
      startupTimer = setTimeout(() => {
        startupTimer = null;
        if (!stopped && !failed && !autoplayBlocked && document.visibilityState !== 'hidden') {
          fail('The channel did not start in time. Trying another available source.');
        }
      }, 30_000);
    }
    function autoplayNotice(): void {
      autoplayBlocked = true;
      clearStartup();
      if (!stopped && !failed) setNotice('Select Play on the video to start watching.');
    }
    function clearStall(): void {
      if (stallTimer !== null) clearTimeout(stallTimer);
      stallTimer = null;
    }
    function fail(message: string): void {
      if (stopped || failed) return;
      failed = true;
      clearStall();
      clearStartup();
      // A single playback session will never cycle back to a previously failed URL.
      if (onAutoNext()) return;
      setError(message);
    }
    function beginStallWatch(): void {
      if (stopped || failed || !mediaWasPlaying || stallTimer !== null) return;
      stallTimer = setTimeout(() => {
        stallTimer = null;
        fail('Playback stalled. Check your connection or select another source.');
      }, 25_000);
    }
    function onPlaying(): void {
      mediaWasPlaying = true;
      autoplayBlocked = false;
      clearStartup();
      clearStall();
      if (!stopped) setNotice('');
    }
    function onWaiting(): void { beginStallWatch(); }
    function onNativeError(): void {
      // HLS.js handles its own recoverable network and media events.
      if (!hls) fail('Playback failed. This stream may be unavailable or unsupported.');
    }
    readyVideo.addEventListener('playing', onPlaying);
    function onPlay(): void { if (autoplayBlocked) { autoplayBlocked = false; watchStartup(); } }
    readyVideo.addEventListener('play', onPlay);
    readyVideo.addEventListener('waiting', onWaiting);
    readyVideo.addEventListener('stalled', onWaiting);
    readyVideo.addEventListener('error', onNativeError);

    const path = new URL(stream.url).pathname.toLowerCase();
    const isHls = path.endsWith('.m3u8');
    const isDash = path.endsWith('.mpd');
    watchStartup();
    async function attach(): Promise<void> {
      if (isDash) {
        fail('DASH playback is not supported. Try another source.');
        return;
      }
      if (isHls && !readyVideo.canPlayType('application/vnd.apple.mpegurl')) {
        const { default: Hls } = await import('hls.js');
        if (stopped) return;
        if (!Hls.isSupported()) {
          fail('This device does not support HLS. Try another source.');
          return;
        }
        const instance = new Hls({ lowLatencyMode: false, maxBufferLength: 30, backBufferLength: 30 });
        hls = instance;
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (stopped || failed || !data.fatal) return;
          const type = String(data.type);
          if (type === Hls.ErrorTypes.NETWORK_ERROR && shouldRecoverHls(type, networkRecovered)) {
            networkRecovered = true;
            try { instance.startLoad(); return; }
            catch { /* A failed recovery triggers alternate-source selection below. */ }
          }
          if (type === Hls.ErrorTypes.MEDIA_ERROR && shouldRecoverHls(type, mediaRecovered)) {
            mediaRecovered = true;
            try { instance.recoverMediaError(); return; }
            catch { /* A failed recovery triggers alternate-source selection below. */ }
          }
          fail('This stream could not be played. It may be offline or blocked in your region.');
        });
        instance.once(Hls.Events.MANIFEST_PARSED, () => {
          if (!stopped && !failed) void readyVideo.play().catch(autoplayNotice);
        });
        instance.loadSource(stream.url);
        instance.attachMedia(readyVideo);
      } else {
        readyVideo.src = stream.url;
        void readyVideo.play().catch(autoplayNotice);
      }
    }
    void attach().catch(() => fail('Playback engine could not initialize. Try another source.'));
    return () => {
      stopped = true;
      clearStall();
      clearStartup();
      readyVideo.removeEventListener('playing', onPlaying);
      readyVideo.removeEventListener('play', onPlay);
      readyVideo.removeEventListener('waiting', onWaiting);
      readyVideo.removeEventListener('stalled', onWaiting);
      readyVideo.removeEventListener('error', onNativeError);
      readyVideo.pause();
      hls?.destroy();
      readyVideo.removeAttribute('src');
      readyVideo.load();
    };
  }, [stream.url]);

  return (
    <section className="player-shell" aria-label="Live player">
      <div className="video-frame">
        <video ref={videoRef} controls playsInline aria-label={channelName + ' live video'}/>
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
