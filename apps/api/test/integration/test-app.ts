import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { GlobalExceptionFilter } from "../../src/common/errors/http-exception.filter";
import { ResponseEnvelopeInterceptor } from "../../src/common/http/response-envelope.interceptor";
import { PrismaService } from "../../src/common/prisma.service";

export async function createIntegrationApp(): Promise<{ app: INestApplication; prisma: PrismaService; baseUrl: string }> {
  process.env.FINNHUB_API_KEY = "your_finnhub_key";
  process.env.OPENAI_API_KEY = "your_openai_key";
  process.env.NVIDIA_API_KEY = "your_nvidia_key";
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  await app.listen(0);

  const prisma = app.get(PrismaService);
  const address = app.getHttpServer().address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { app, prisma, baseUrl };
}

export async function resetDb(prisma: PrismaService) {
  await prisma.agentResult.deleteMany();
  await prisma.analysisRun.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.position.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.demoAccount.deleteMany();
  await prisma.demoAccount.create({ data: { cash: 100000 } });
}

export async function waitFor<T>(fn: () => Promise<T>, predicate: (value: T) => boolean, timeoutMs = 20000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Timed out waiting for condition");
}
