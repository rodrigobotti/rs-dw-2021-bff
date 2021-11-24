const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const R = require('ramda')
const jwt = require('jsonwebtoken')

const config = require('./config')

const ErrorCodes = Object.freeze({
  InvalidCredentials: 'INVALID_CREDENTIALS',
  InvalidToken: 'INVALID_TOKEN',
  InternalServerError: 'INTERNAL_SERVER_ERROR',
})

const ErrorResponses = {
  [ErrorCodes.InvalidCredentials]: {
    status: 401,
    body: {
      statusCode: 401,
      code: ErrorCodes.InvalidCredentials,
      message: 'Invalid credentials',
    },
  },
  [ErrorCodes.InvalidToken]: {
    status: 401,
    body: {
      statusCode: 401,
      code: ErrorCodes.InvalidToken,
      message: 'Invalid token',
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

const Roles = Object.freeze({
  ADMIN: 'ADMIN',
  BUYER: 'BUYER',
})

const User = (username, password, roles) => ({
  username,
  password,
  roles,
})

const UserRepository = () => {
  const data = {
    dowhile2021: User('dowhile2021', 'password123', [Roles.BUYER]),
    theadmin: User('theadmin', 'strongpassword', [Roles.ADMIN]),
  }

  const getByUserName = username =>
    Promise.resolve(data[username])

  const listAll = (offset, limit) =>
    Promise.resolve(Object.values(data).slice(offset, offset + limit))

  return {
    getByUserName,
    listAll,
  }
}

const TokenService = () => {
  const signToken = data =>
    new Promise((resolve, reject) =>
      jwt.sign(
        data,
        config.jwt.privateKey,
        {
          expiresIn: config.jwt.expiration,
          algorithm: config.jwt.algorithm,
        },
        (error, token) => error ? reject(error) : resolve(token)
      )
    )

  const validateToken = token =>
    new Promise((resolve, reject) =>
      jwt.verify(
        token,
        config.jwt.publicKey,
        {
          algorithms: [config.jwt.algorithm],
          ignoreExpiration: false,
        },
        (error, data) => error
          ? reject(error)
          : resolve(data)
      )
    )

  return {
    signToken,
    validateToken,
  }
}

const AuthService = (userRepository, tokenService) => {
  const userNotFound = user =>
    user || Promise.reject(AppError(ErrorCodes.InvalidCredentials))

  const checkPasswordMatches = R.curry((password, user) =>
    user.password === password
      ? user
      : Promise.reject(AppError(ErrorCodes.InvalidCredentials))
  )

  const authenticate = ({ username, password }) =>
    userRepository
      .getByUserName(username)
      .then(userNotFound)
      .then(checkPasswordMatches(password))
      .then(R.pick(['username', 'roles']))
      .then(tokenService.signToken)

  const validate = token =>
    tokenService
      .validateToken(token)
      .then(R.pick(['username', 'roles']))
      .catch(error => AppError(ErrorCodes.InvalidToken, error.message))

  return {
    authenticate,
    validate,
  }
}

const userRepository = UserRepository()
const tokenService = TokenService()
const authService = AuthService(userRepository, tokenService)

const login = ctx =>
  authService
    .authenticate(ctx.request.body)
    .then(R.objOf('token'))
    .then(res => (ctx.body = res))

const validate = ctx =>
  authService
    .validate(ctx.request.body.token)
    .then(() => (ctx.body = { valid: true }))

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
router.post('/api/login', login)
router.post('/api/validate', validate)

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
