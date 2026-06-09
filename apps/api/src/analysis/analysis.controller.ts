import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { analysisRunCreateSchema } from "@pixelfund/schemas";
import { AnalysisService } from "./analysis.service";

@Controller("analysis-runs")
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Post()
  create(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = analysisRunCreateSchema.parse(body);
    return this.service.createRun(payload.ticker, payload.idempotencyKey, ownerKey);
  }

  @Get()
  list(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.service.listRuns(ownerKey);
  }

  @Get(":id/explain")
  explain(@Param("id") id: string, @Headers("x-demo-user-id") ownerKey?: string) {
    return this.service.explainRun(id, ownerKey);
  }

  @Delete()
  clear(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.service.clearRuns(ownerKey);
  }
}
