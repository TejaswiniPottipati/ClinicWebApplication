import { ValidationPipe, type INestApplication } from '@nestjs/common';

/** App-wide configuration, shared by main.ts and the e2e tests so both run the same way. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties without validation decorators
      forbidNonWhitelisted: true, // ...and reject requests that send them
      transform: true, // run class-transformer (e.g. trimming message bodies)
    }),
  );
  app.enableShutdownHooks();
  return app;
}
