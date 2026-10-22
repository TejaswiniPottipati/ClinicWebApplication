import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  // Only the web app's server calls this API (no browser access), so CORS stays disabled.
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
