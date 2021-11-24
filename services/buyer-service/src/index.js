const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const faker = require('faker/locale/pt_BR')

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
  profiles: {
    dowhile2021: {
      username: 'dowhile2021',
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      birthDate: faker.date.past().toISOString(),
    },
  },
  addresses: {
    dowhile2021: {
      addressLine1: faker.address.streetAddress(),
      addressLine2: faker.address.secondaryAddress(),
      city: faker.address.city(),
      state: faker.address.stateAbbr(),
      zipCode: faker.address.zipCode(),
    },
  },
}

const getById = (collection, id) =>
  Promise.resolve(collection[id] ?? Promise.reject(AppError(ErrorCodes.NotFound)))

const getProfile = ctx =>
  getById(database.profiles, ctx.params.id)
    .then(profile => (ctx.body = { profile }))

const getAddress = ctx =>
  getById(database.addresses, ctx.params.id)
    .then(address => (ctx.body = { address }))

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
router.get('/api/buyers/:id/profile', getProfile)
router.get('/api/buyers/:id/address', getAddress)

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
