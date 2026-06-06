import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { MarketService } from "../market/market.service";

@Injectable()
export class QuotesService implements OnModuleDestroy {
  private readonly logger = new Logger(QuotesService.name);
  private subscriptions = new Map<string, Set<string>>();
  private quoteCache = new Map<string, { updatedAt: string; quote: any }>();
  private stopPolling: (() => void) | null = null;
  private emitEvent: ((event: string, payload: unknown) => void) | null = null;
  private quoteObserver: ((quote: any) => void) | null = null;

  constructor(private readonly market: MarketService) {}

  setEmitter(emit: (event: string, payload: unknown) => void) {
    this.emitEvent = emit;
  }

  setQuoteObserver(observer: (quote: any) => void) {
    this.quoteObserver = observer;
  }

  ensureSubscription(clientId: string, ticker: string) {
    const normalized = ticker.toUpperCase();
    if (!this.subscriptions.has(clientId)) this.subscriptions.set(clientId, new Set());
    this.subscriptions.get(clientId)?.add(normalized);
    this.rebuildPolling();
  }

  removeClient(clientId: string) {
    this.subscriptions.delete(clientId);
    this.rebuildPolling();
  }

  getCachedQuote(ticker: string) {
    return this.quoteCache.get(ticker.toUpperCase())?.quote;
  }

  private rebuildPolling() {
    this.stopPolling?.();
    const dedupedTickers = [...new Set([...this.subscriptions.values()].flatMap((s) => [...s]))];
    if (dedupedTickers.length === 0) return;

    this.logger.log(`Starting quote polling for: ${dedupedTickers.join(", ")}`);
    this.stopPolling = this.market.subscribeQuotes(dedupedTickers, (quote) => {
      this.quoteCache.set(quote.ticker, { quote, updatedAt: quote.updatedAt });
      this.emitEvent?.("quote.updated", quote);
      this.quoteObserver?.(quote);
      const staleMs = Number(process.env.QUOTE_STALE_MS ?? "20000");
      setTimeout(() => {
        const cached = this.quoteCache.get(quote.ticker);
        if (!cached) return;
        if (Date.now() - new Date(cached.updatedAt).getTime() > staleMs) {
          this.emitEvent?.("quote.stale", { ticker: quote.ticker, lastUpdatedAt: cached.updatedAt });
        }
      }, staleMs + 200);
    });
  }

  onModuleDestroy() {
    this.stopPolling?.();
  }
}
