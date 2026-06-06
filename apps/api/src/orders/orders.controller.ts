import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { orderCreateSchema, orderStatusSchema } from "@pixelfund/schemas";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("preview")
  preview(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = orderCreateSchema.parse(body);
    return this.orders.previewOrder(payload, ownerKey);
  }

  @Post()
  create(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = orderCreateSchema.parse(body);
    return this.orders.createOrder(payload, ownerKey);
  }

  @Get()
  list(@Query("status") status?: string, @Query("limit") limit?: string, @Headers("x-demo-user-id") ownerKey?: string) {
    const parsedStatus = status ? orderStatusSchema.parse(status) : undefined;
    return this.orders.listOrders(parsedStatus, limit ? Number(limit) : undefined, ownerKey);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @Headers("x-demo-user-id") ownerKey?: string) {
    return this.orders.cancelOrder(id, ownerKey);
  }
}
