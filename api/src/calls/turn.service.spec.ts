import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parseStunUrls,
  TURN_TTL_SECONDS,
  TurnService,
} from './turn.service.js';

const STUN_ONLY = [{ urls: ['stun:stun.cloudflare.com:3478'] }];

const turnFor = (env: Record<string, string>) =>
  new TurnService(new ConfigService(env));

const configured = {
  CLOUDFLARE_TURN_KEY_ID: 'key-123',
  CLOUDFLARE_TURN_API_TOKEN: 'token-abc',
};

describe('TurnService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses STUN only when no TURN key is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await turnFor({}).iceServers()).toEqual(STUN_ONLY);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses the STUN servers from STUN_URLS', async () => {
    expect(
      await turnFor({
        STUN_URLS: ' stun:stun.example.org:3478 , stuns:stun.example.org:5349 ',
      }).iceServers(),
    ).toEqual([
      {
        urls: ['stun:stun.example.org:3478', 'stuns:stun.example.org:5349'],
      },
    ]);
    expect(parseStunUrls('')).toEqual(parseStunUrls(undefined));
  });

  it('requests short-lived credentials from Cloudflare and drops port 53', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        {
          iceServers: [
            {
              urls: [
                'stun:stun.cloudflare.com:3478',
                'stun:stun.cloudflare.com:53',
              ],
            },
            {
              urls: [
                'turn:turn.cloudflare.com:3478?transport=udp',
                'turn:turn.cloudflare.com:53?transport=udp',
                'turns:turn.cloudflare.com:443?transport=tcp',
              ],
              username: 'user',
              credential: 'secret',
            },
          ],
        },
        { status: 201 },
      ),
    );

    expect(await turnFor(configured).iceServers()).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      {
        urls: [
          'turn:turn.cloudflare.com:3478?transport=udp',
          'turns:turn.cloudflare.com:443?transport=tcp',
        ],
        username: 'user',
        credential: 'secret',
      },
    ]);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      'https://rtc.live.cloudflare.com/v1/turn/keys/key-123/credentials/generate-ice-servers',
    );
    expect(init).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token-abc' },
      body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
    });
  });

  it('falls back to STUN only when Cloudflare fails', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 401 }))
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    const turn = turnFor(configured);

    expect(await turn.iceServers()).toEqual(STUN_ONLY);
    expect(await turn.iceServers()).toEqual(STUN_ONLY);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
