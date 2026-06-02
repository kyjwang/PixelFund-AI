import { Body, Controller, Get, Post } from "@nestjs/common";
import { analysisRunCreateSchema } from "@pixelfund/schemas";
import { AnalysisService } from "./analysis.service";

@Controller("analysis-runs")
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Post()
  create(@Body() body: unknown) {
    const payload = analysisRunCreateSchema.parse(body);
    return this.service.createRun(payload.ticker, payload.idempotencyKey);
  }

  @Get()
  list() {
    return this.service.listRuns();
  }
}
