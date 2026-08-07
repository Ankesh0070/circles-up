import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Real bug found testing Phase 44 from the RN Web preview build: NestJS
  // has no CORS handling by default, so a browser `fetch()` from
  // localhost:8081 (Expo web) to this service's localhost:4002 fails the
  // OPTIONS preflight with a plain 404, and the actual POST never fires.
  // Native iOS/Android builds don't hit this (no browser CORS model), but
  // RN Web does — and this is exactly the kind of gap that stays invisible
  // until you test through the real UI instead of curl. Wide open for
  // local dev; tighten to specific origins before any real deployment.
  app.enableCors();
  const port = process.env.PORT ?? 4002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[sos] listening on :${port}`);
}
bootstrap();
