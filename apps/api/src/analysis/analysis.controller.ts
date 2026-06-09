import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { analysisRunCreateSchema } from "@pixelfund/schemas";
import { z } from "zod";
import { AnalysisService } from "./analysis.service";

const analysisRunClearSchema = z
  .object({
    analysisRunIds: z.array(z.string()).max(100).optional()
  })
  .optional();

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
  clear(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = analysisRunClearSchema.parse(body ?? {});
    return this.service.clearRuns(ownerKey, payload?.analysisRunIds);
  }
}
