const api = Object.freeze({
  host: process.env.API_HOST ?? '0.0.0.0',
  port: parseInt(process.env.API_PORT ?? 4000, 10),
})

const services = Object.freeze({
  userIdentity: process.env.USER_IDENTITY_SERVICE_URL,
  buyer: process.env.BUYER_SERVICE_URL,
  productCatalog: process.env.PRODUCT_CATALOG_SERVICE_URL,
  order: process.env.ORDER_SERVICE_URL,
})

module.exports = Object.freeze({
  api,
  services,
})
