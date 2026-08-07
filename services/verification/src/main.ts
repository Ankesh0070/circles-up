import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Same fix as services/sos/src/main.ts — see that comment. Same latent
  // gap here (RN Web's fetch calls to this service were never actually
  // exercised through a full browser round-trip during Group B, since
  // GpsCameraModal's live camera capture doesn't work in this dev
  // environment's headless browser — verification.submit() was only ever
  // curl-tested directly, not through the real UI).
  app.enableCors();
  const port = process.env.PORT ?? 4001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[verification] listening on :${port}`);
}
bootstrap();
