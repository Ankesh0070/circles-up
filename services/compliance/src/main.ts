import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT ?? 4005;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[compliance] listening on :${port}`);
}
bootstrap();
