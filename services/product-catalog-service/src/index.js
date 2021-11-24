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
})

const ErrorResponses = {
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

const database = {
  products: R.times(() => ({
    id: uuid(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    department: faker.commerce.department(),
    category: faker.commerce.product(),
    price: parseFloat(faker.finance.amount(1)),
    image: faker.image.imageUrl(),
  }), 50),
}

const listAllProducts = ctx => {
  const { offset: offsetString, limit: limitString } = ctx.query
  const [offset, limit] = [parseInt(offsetString) || 0, parseInt(limitString) || 10]
  const products = database.products.slice(offset, offset + limit + 1)
  const nextOffset = products.length > limit ? offset + limit + 1 : null
  ctx.body = {
    products: products.slice(0, limit),
    nextOffset,
  }
}

const findProductById = id =>
  Promise.resolve(
    database.products.find(R.propEq('id', id)) || Promise.reject(AppError(ErrorCodes.NotFound))
  )

const getProductById = ctx =>
  findProductById(ctx.params.id)
    .then(product => (ctx.body = product))

const updateProduct = ctx =>
  findProductById(ctx.params.id)
    .then(product => {
      const updated = R.pick(Object.keys(product), R.dissoc('id', ctx.request.body))
      Object.assign(product, { ...product, ...updated })
      ctx.body = product
    })

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
router.get('/api/products', listAllProducts)
router.get('/api/products/:id', getProductById)
router.put('/api/products/:id', updateProduct)

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
