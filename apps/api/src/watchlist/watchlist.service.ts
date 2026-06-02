import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.watchlistItem.findMany({ orderBy: { createdAt: "desc" } });
  }

  async add(ticker: string) {
    return this.prisma.watchlistItem.upsert({
      where: { ticker },
      create: { ticker },
      update: {}
    });
  }

  async remove(ticker: string) {
    await this.prisma.watchlistItem.deleteMany({ where: { ticker } });
    return { ticker };
  }
}
