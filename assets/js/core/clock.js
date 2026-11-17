// Song clock. HTMLMediaElement.currentTime advances in coarse steps on several browsers, so
// between reports the clock extrapolates with performance.now(). Input events are converted
// to song time using their own timestamps instead of the time of the next frame.

const MAX_EXTRAPOLATION = 0.25; // seconds without a new media report before trusting the media again
const MAX_SMOOTHING = 0.05;     // backwards corrections smaller than this are absorbed

export function createMediaClock(media, offsetSeconds = () => 0, perf = () => performance.now()) {
  let reported = NaN, reportedAt = 0, last = -Infinity, stopped = true;

  function mediaTime() {
    const ct = media.currentTime;
    const p = perf();
    if (media.paused || media.seeking) { reported = ct; reportedAt = p; last = ct; stopped = true; return ct; }
    // Time spent paused or seeking must not count as playback when the song resumes.
    if (ct !== reported || stopped) { reported = ct; reportedAt = p; stopped = false; }
    const ahead = (p - reportedAt) / 1000 * (media.playbackRate || 1);
    let est = reported + Math.min(ahead, MAX_EXTRAPOLATION);
    // Keep time monotonic across small corrections, but follow real seeks immediately.
    if (est < last && last - est < MAX_SMOOTHING) est = last;
    last = est;
    return est;
  }

  return {
    now: () => mediaTime() + offsetSeconds(),
    // Song time at which an input event happened (event.timeStamp or Gamepad.timestamp).
    at(timestamp) {
      const t = mediaTime() + offsetSeconds();
      if (!Number.isFinite(timestamp) || timestamp <= 0) return t;
      const age = (perf() - timestamp) / 1000;
      if (!(age > 0) || age > 0.1) return t; // future or stale stamps: use the current time
      return t - age * (media.playbackRate || 1);
    },
    reset() { reported = NaN; last = -Infinity; stopped = true; },
  };
}
