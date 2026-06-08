import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "../common/prisma.service";

@Module({
  controllers: [HealthController],
  providers: [PrismaService]
})
export class HealthModule {}
