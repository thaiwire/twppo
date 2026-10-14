import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  // HOST=127.0.0.1 บน server จริง → รับเฉพาะ request จากเครื่องตัวเอง (ผ่าน IIS/Next.js เท่านั้น)
  await app.listen(process.env.PORT ?? 4000, process.env.HOST ?? '0.0.0.0');
}
await bootstrap();
