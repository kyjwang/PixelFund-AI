import { Controller, Get, Headers } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  getPortfolio(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.portfolio.getPortfolio(ownerKey);
  }
}
