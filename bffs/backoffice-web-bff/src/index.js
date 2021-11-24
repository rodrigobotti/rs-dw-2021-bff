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
input UpdateProductInput {
  title: String
  description: String
  department: String
  category: String
  price: Float
  image: String
}

type Query {
  orders(offset: Int): OrdersResponse
  products(offset: Int): ProductsResponse
}

type Mutation {
  login(username: String!, password: String!): TokenResponse!
  acceptOrder(orderId: ID!): Order!
  rejectOrder(orderId: ID!): Order!
  shipAcceptedOrder(orderId: ID!): Order!
  failOrderShippment(orderId: ID!): Order!
  updateProduct(id: ID!, data: UpdateProductInput!): Product
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

const put = (url, body) =>
  fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(response => response.ok
      ? response.json()
      : response.json().then(reject)
    )

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

const isAdmin = resolver => (parent, args, context, info) =>
  !context.user.roles.includes('ADMIN')
    ? Promise.reject(new Error('User is not admin'))
    : resolver(parent, args, context, info)

const resolveOrders = (_parent, { offset }, _ctx, _info) =>
  get(`${config.services.order}/orders`, { offset, limit: 10 })
    .then(toResponsePayload)
    .catch(toErrorPayload)

const resolveProducts = (_parent, { offset }, _ctx, _info) =>
  get(`${config.services.productCatalog}/products`, { offset, limit: 10 })
    .then(toResponsePayload)
    .catch(toErrorPayload)

const resolveLogin = (_parent, { username, password }, _ctx, _info) =>
  post(`${config.services.userIdentity}/login`, { username, password })
    .then(toResponsePayload)
    .catch(toErrorPayload)

const resolveUpdateProduct = (_parent, { id, data }, _ctx, _info) =>
  put(`${config.services.productCatalog}/products/${id}`, data)
    .then(toResponsePayload)
    .catch(toErrorPayload)

const resolveAcceptOrder = (_parent, args, _ctx, _info) => { }
const resolveRejectOrder = (_parent, args, _ctx, _info) => { }
const resolveShipAcceptedOrder = (_parent, args, _ctx, _info) => { }
const resolveFailOrderShippment = (_parent, args, _ctx, _info) => { }

const resolvers = {
  Query: {
    orders: authenticated(isAdmin(resolveOrders)),
    products: authenticated(isAdmin(resolveProducts)),
  },
  Mutation: {
    login: resolveLogin,
    acceptOrder: authenticated(isAdmin(resolveAcceptOrder)),
    rejectOrder: authenticated(isAdmin(resolveRejectOrder)),
    shipAcceptedOrder: authenticated(isAdmin(resolveShipAcceptedOrder)),
    failOrderShippment: authenticated(isAdmin(resolveFailOrderShippment)),
    updateProduct: authenticated(isAdmin(resolveUpdateProduct)),
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
