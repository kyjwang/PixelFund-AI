import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class StartupService implements OnModuleInit {
  private readonly logger = new Logger(StartupService.name);

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL is required");
    }

    const redis = new Redis(redisUrl, { lazyConnect: true });
    try {
      await redis.connect();
      await redis.ping();
      this.logger.log("Connected to Redis");
    } finally {
      redis.disconnect();
    }
  }
}
