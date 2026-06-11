import { Module } from "@nestjs/common";
import { MarketService } from "./market.service";
import { MarketController, MarketProvidersController } from "./market.controller";
import { FinnhubProvider } from "./finnhub.provider";
import { AlphaVantageProvider } from "./alpha-vantage.provider";
import { SecEdgarProvider } from "./sec-edgar.provider";
import { FredProvider } from "./fred.provider";
import { CoinGeckoProvider } from "./coingecko.provider";
import { SocialSentimentProvider } from "./social-sentiment.provider";
import { MarketProviderRegistry } from "./provider-registry";

@Module({
  controllers: [MarketController, MarketProvidersController],
  providers: [
    MarketService,
    FinnhubProvider,
    AlphaVantageProvider,
    SecEdgarProvider,
    FredProvider,
    CoinGeckoProvider,
    SocialSentimentProvider,
    {
      provide: MarketProviderRegistry,
      useFactory: (
        finnhub: FinnhubProvider,
        alphaVantage: AlphaVantageProvider,
        secEdgar: SecEdgarProvider,
        fred: FredProvider,
        coinGecko: CoinGeckoProvider,
        socialSentiment: SocialSentimentProvider
      ) => new MarketProviderRegistry([secEdgar, finnhub, alphaVantage, fred, coinGecko, socialSentiment]),
      inject: [FinnhubProvider, AlphaVantageProvider, SecEdgarProvider, FredProvider, CoinGeckoProvider, SocialSentimentProvider]
    }
  ],
  exports: [MarketService]
})
export class MarketModule {}
