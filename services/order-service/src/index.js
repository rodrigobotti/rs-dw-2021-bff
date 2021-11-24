const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const faker = require('faker/locale/pt_BR')
const R = require('ramda')
const { v4: uuid } = require('uuid')

const config = require('./config')

const ErrorCodes = Object.freeze({
  InternalServerError: 'INTERNAL_SERVER_ERROR',
  NotFound: 'RESOURCE_NOT_FOUND',
  InvalidOrderStatusTransition: 'INVALID_ORDER_STATUS_TRANSITION',
})

const ErrorResponses = {
  [ErrorCodes.InvalidOrderStatusTransition]: {
    status: 400,
    body: {
      statusCode: 400,
      code: ErrorCodes.InvalidOrderStatusTransition,
      message: 'Illegal order status transition',
    },
  },
  [ErrorCodes.NotFound]: {
    status: 404,
    body: {
      statusCode: 404,
      code: ErrorCodes.NotFound,
      message: 'Resource not found',
    },
  },
  [ErrorCodes.InternalServerError]: {
    status: 500,
    body: {
      statusCode: 500,
      code: ErrorCodes.InternalServerError,
      message: 'Internal server error',
    },
  },
}

const AppError = (code, message) => {
  const error = Error(message)
  error.code = code
  return error
}

const OrderStatus = {
  Created: 'Created',
  Accepted: 'Accepted',
  Shipped: 'Shipped',
  Received: 'Received',
  RejectedByStore: 'RejectedByStore',
  ShippingFailed: 'ShippingFailed',
  CancelledByBuyer: 'CancelledByBuyer',
}

const OrderStatusStateMachine = {
  [OrderStatus.Created]: [OrderStatus.CancelledByBuyer, OrderStatus.Accepted, OrderStatus.RejectedByStore],
  [OrderStatus.Accepted]: [OrderStatus.Shipped],
  [OrderStatus.Shipped]: [OrderStatus.ShippingFailed, OrderStatus.Received],
  [OrderStatus.Received]: [],
  [OrderStatus.RejectedByStore]: [],
  [OrderStatus.ShippingFailed]: [],
  [OrderStatus.CancelledByBuyer]: [],
}

const database = {
  orders: [
    {
      id: uuid(),
      status: OrderStatus.Received,
      buyerId: 'dowhile2021',
      shippingAddress: {
        addressLine1: faker.address.streetAddress(),
        addressLine2: faker.address.secondaryAddress(),
        city: faker.address.city(),
        state: faker.address.stateAbbr(),
        zipCode: faker.address.zipCode(),
      },
      totalAmount: 125.00,
      orderLines: [
        { productId: uuid(), qty: 10, price: 10.00 },
        { productId: uuid(), qty: 5, price: 5.00 },
      ],
    },
  ],
}

const getOrderById = id =>
  Promise.resolve(
    database.orders.find(R.propEq('id', id)) ?? Promise.reject(AppError(ErrorCodes.NotFound))
  )

const validateStatusTransition = (current, next) =>
  OrderStatusStateMachine[current].includes(next)
    ? Promise.resolve(next)
    : Promise.reject(AppError(ErrorCodes.InvalidOrderStatusTransition))

const paginate = (offset, limit, list) => ({
  nextOffset: list.length > limit ? offset + limit + 1 : null,
  result: list.slice(0, limit),
})

const listAllOrders = ctx => {
  const { offset: offsetString, limit: limitString } = ctx.query
  const [offset, limit] = [parseInt(offsetString) || 0, parseInt(limitString) || 10]
  const buyer = ctx.query.buyer

  console.log(buyer)

  const orders = (
    buyer
      ? database.orders.filter(R.propEq('buyerId', buyer))
      : database.orders
  ).slice(offset, offset + limit + 1)

  const { result, nextOffset } = paginate(offset, limit, orders)

  ctx.body = {
    orders: result,
    nextOffset,
  }
}

const createOrder = ctx => {
  const orderParam = ctx.request.body
  const order = {
    ...orderParam,
    id: uuid(),
    status: OrderStatus.Created,
    totalAmount: orderParam.orderLines.reduce((total, { qty, amount }) => total + qty * amount, 0),
  }
  database.orders.push(order)
  ctx.body = order
  ctx.status = 201
}

const changeOrderStatus = async ctx => {
  const { id, status } = ctx.params
  const order = await getOrderById(id)
  const nextStatus = await validateStatusTransition(order.status, status)
  order.status = nextStatus
  ctx.body = order
}

const errorMiddleware = (ctx, next) =>
  next()
    .catch(error => {
      console.error(error)
      const { status, body } = ErrorResponses[error.code] ?? ErrorResponses[ErrorCodes.InternalServerError]
      ctx.status = status
      ctx.body = body
    })

const router = new Router()
router.use(errorMiddleware)
router.get('/api/orders', listAllOrders)
router.post('/api/orders', createOrder)
router.put('/api/orders/:id/status/:status', changeOrderStatus)

const app = new Koa()
app.use(bodyParser())
app.use(router.routes())

app
  .listen(config.api.port, config.api.host)
  .once('listening', () => console.log(`Service listening at ${config.api.host}:${config.api.port}`))
  .once('error', error => {
    console.log('Failed to start service', error)
    process.exit(1)
  })
