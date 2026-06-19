type StoredAudio = {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
};

const audioStore = new Map<string, StoredAudio>();
const defaultTtlMs = 15 * 60 * 1000;

export function storeTelephonyAudio(buffer: Buffer, contentType = 'audio/mpeg', ttlMs = defaultTtlMs) {
  cleanupExpiredAudio();
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  audioStore.set(id, {
    buffer,
    contentType,
    expiresAt: Date.now() + ttlMs,
  });
  return id;
}

export function getTelephonyAudio(id: string) {
  cleanupExpiredAudio();
  return audioStore.get(id) || null;
}

function cleanupExpiredAudio() {
  const now = Date.now();
  for (const [id, audio] of audioStore.entries()) {
    if (audio.expiresAt <= now) {
      audioStore.delete(id);
    }
  }
}
