import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Applied proactively this time (Group E's lesson: NestJS has no CORS by
  // default, which breaks any call from the RN Web preview build) rather
  // than discovered again via a failing browser fetch.
  app.enableCors();
  const port = process.env.PORT ?? 4003;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[genie] listening on :${port}`);
}
bootstrap();
