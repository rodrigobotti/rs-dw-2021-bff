const { ApolloServer, gql } = require('apollo-server')
const fetch = require('node-fetch')

const config = require('./config')

const typeDefs = gql`

type Error {
  code: String
  message: String
}
type TokenResponse {
  token: String
  error: Error
}
enum OrderStatus {
  Created
  Accepted
  Shipped
  Received
  RejectedByStore
  ShippingFailed
  CancelledByBuyer
}
type Address {
  addressLine1: String
  addressLine2: String
  city: String
  state: String
  zipCode: String
}
type OrderLine {
  productId: String
  qty: Int
  amount: Float
}
type Order {
  id: ID!
  status: OrderStatus
  buyerId: String,
  shippingAddress: Address
  totalAmount: Float
  orderLines: [OrderLine]
}
type OrdersResponse {
  orders: [Order]
  nextOffset: Int
  error: Error
}
type Product {
  id: ID!
  title: String!
  description: String
  department: String
  category: String
  price: Float
  image: String
}
type ProductsResponse {
  products: [Product]
  nextOffset: Int
  error: Error
}
type AddressResponse {
  address: Address
  error: Error
}
type Profile {
  firstName: String
  lastName: String
  birthDate: String
}
type ProfileResponse {
  profile: Profile
  error: Error
}

type HomeResponse {
  profile: ProfileResponse
  address: AddressResponse
  firstProducts: ProductsResponse
}

type Query {
  home: HomeResponse
  myOrders(offset: Int): OrdersResponse
  products(offset: Int): ProductsResponse
  # orderDetail(orderId: ID!): OrderResponse
}

type Mutation {
  login(username: String!, password: String!): TokenResponse!
  # createOrder(data: OrderInput!): OrderResponse
  # cancelOrder(orderId: ID!): OrderResponse
}
`

const reject = error =>
  Promise.reject(error)

const get = (url, query) =>
  fetch(`${url}${!query ? '' : `?${new URLSearchParams(query)}`}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.ok
      ? response.json()
      : response.json().then(reject)
    )

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(response => response.ok
      ? response.json()
      : response.json().then(reject)
    )

// const put = (url, body) =>
//   fetch(url, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   })
//     .then(response => response.ok
//       ? response.json()
//       : response.json().then(reject)
//     )

const toErrorPayload = error => ({
  error: {
    code: error.code,
    message: error.message,
  },
})

const toResponsePayload = data => ({
  ...data,
  error: null,
})

const validateToken = token =>
  post(`${config.services.userIdentity}/validate`, { token })

const authenticated = resolver => (parent, args, context, info) =>
  validateToken(context.token)
    .then(user => resolver(parent, args, { ...context, user }, info))

const isBuyer = resolver => (parent, args, context, info) =>
  !context.user.roles.includes('BUYER')
    ? Promise.reject(new Error('User is not admin'))
    : resolver(parent, args, context, info)

const resolveMyOrders = (_parent, { offset }, { user }, _info) =>
  get(`${config.services.order}/orders`, { offset, limit: 10, buyer: user.username })
    .then(toResponsePayload)
    .catch(toErrorPayload)

const listProducts = offset =>
  get(`${config.services.productCatalog}/products`, { offset, limit: 5 })
    .then(toResponsePayload)
    .catch(toErrorPayload)

const resolveProducts = (_parent, { offset }, _ctx, _info) =>
  listProducts(offset)

const resolveLogin = (_parent, { username, password }, _ctx, _info) =>
  post(`${config.services.userIdentity}/login`, { username, password })
    .then(toResponsePayload)
    .catch(toErrorPayload)

const getAddress = buyerId =>
  get(`${config.services.buyer}/buyers/${buyerId}/address`)
    .then(toResponsePayload)
    .catch(toErrorPayload)

const getProfile = buyerId =>
  get(`${config.services.buyer}/buyers/${buyerId}/profile`)
    .then(toResponsePayload)
    .catch(toErrorPayload)

const resolveHome = (_parent, _args, { user }, _info) =>
  Promise.all([
    getProfile(user.username),
    getAddress(user.username),
    listProducts(0),
  ]).then(([profile, address, firstProducts]) => ({
    profile,
    address,
    firstProducts,
  }))

const resolvers = {
  Query: {
    home: authenticated(isBuyer(resolveHome)),
    myOrders: authenticated(isBuyer(resolveMyOrders)),
    products: authenticated(isBuyer(resolveProducts)),
    // orderDetails:  authenticated(isBuyer(resolveOrderDetails)),
  },
  Mutation: {
    login: resolveLogin,
    // createOrder: authenticated(isBuyer(resolveCreateOrder)),
    // cancelOrder: authenticated(isBuyer(resolveCancelOrder)),
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req, token: req.headers.authorization }),
})

server
  .listen(config.api.port, config.api.host)
  .then(({ url }) => console.log(`Server ready at ${url}`))
