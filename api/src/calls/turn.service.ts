import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IceServer } from '../common/types.js';

/** Cloudflare's free STUN server: enough for peers whose networks allow a direct connection. */
export const STUN_ONLY: IceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
];

/** How long issued TURN credentials stay valid. Longer than any consultation; an expired one drops the relay. */
export const TURN_TTL_SECONDS = 4 * 60 * 60;

const REQUEST_TIMEOUT_MS = 5_000;

/** True for a URL on port 53, which browsers block: trying it only delays ICE. */
const isPort53 = (url: string) => /:53(\?|$)/.test(url);

/**
 * ICE servers for calls. With a Cloudflare TURN key configured, each request gets short-lived
 * TURN credentials so calls connect through strict NATs and firewalls (media is relayed only
 * when a direct connection fails). Without one, or if Cloudflare is unreachable, it's STUN only.
 */
@Injectable()
export class TurnService implements OnModuleInit {
  private readonly logger = new Logger(TurnService.name);
  private readonly keyId: string | undefined;
  private readonly apiToken: string | undefined;

  constructor(config: ConfigService) {
    this.keyId = config.get<string>('CLOUDFLARE_TURN_KEY_ID') || undefined;
    this.apiToken =
      config.get<string>('CLOUDFLARE_TURN_API_TOKEN') || undefined;
  }

  onModuleInit() {
    this.logger.log(
      this.keyId
        ? 'Calls use Cloudflare TURN.'
        : 'Calls use STUN only (set CLOUDFLARE_TURN_KEY_ID to enable TURN).',
    );
  }

  async iceServers(): Promise<IceServer[]> {
    if (!this.keyId || !this.apiToken) return STUN_ONLY;
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(this.keyId)}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (!res.ok) throw new Error(`Cloudflare responded ${res.status}`);
      const body = (await res.json()) as { iceServers?: IceServer[] };
      if (!Array.isArray(body.iceServers))
        throw new Error('Cloudflare response has no iceServers');
      return body.iceServers.map((server) => ({
        ...server,
        urls: [server.urls].flat().filter((url) => !isPort53(url)),
      }));
    } catch (err) {
      // A call can still connect directly, so fall back rather than fail it.
      this.logger.warn(
        `Couldn't get TURN credentials, using STUN only: ${err instanceof Error ? err.message : String(err)}`,
      );
      return STUN_ONLY;
    }
  }
}
