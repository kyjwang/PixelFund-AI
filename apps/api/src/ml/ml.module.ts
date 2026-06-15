import { Module } from "@nestjs/common";
import { ML_CLIENT_SETTINGS, ML_FETCH, resolveMlClientSettings } from "./ml.config";
import { MlService } from "./ml.service";

@Module({
  providers: [
    { provide: ML_CLIENT_SETTINGS, useFactory: () => resolveMlClientSettings() },
    { provide: ML_FETCH, useValue: fetch },
    MlService
  ],
  exports: [MlService]
})
export class MlModule {}
