import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { PortfolioService } from "../portfolio/portfolio.service";

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolio: PortfolioService
  ) {}

  async list(ownerKey?: string) {
    return this.prisma.watchlistItem.findMany({
      where: { ownerKey: this.portfolio.accountKey(ownerKey) },
      orderBy: { createdAt: "desc" }
    });
  }

  async add(ticker: string, ownerKey?: string) {
    const key = this.portfolio.accountKey(ownerKey);
    return this.prisma.watchlistItem.upsert({
      where: { ownerKey_ticker: { ownerKey: key, ticker } },
      create: { ownerKey: key, ticker },
      update: {}
    });
  }

  async remove(ticker: string, ownerKey?: string) {
    await this.prisma.watchlistItem.deleteMany({
      where: { ownerKey: this.portfolio.accountKey(ownerKey), ticker }
    });
    return { ticker };
  }
}
