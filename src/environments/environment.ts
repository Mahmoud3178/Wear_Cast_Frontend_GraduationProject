export const environment = {
  production: false,
  /** Empty in dev: requests use `/api/...` and `ng serve` proxies to the real API (avoids CORS). */
  apiUrl: '',
  /**
   * Virtual try-on microservice. Dev: same-origin prefix proxied in proxy.conf.json to ngrok.
   * See proxy `/tryon-service` → try-on Swagger host.
   */
  tryOnApiBase: '/tryon-service'
};
