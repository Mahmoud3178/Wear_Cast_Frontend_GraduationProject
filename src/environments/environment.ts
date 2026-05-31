export const environment = {
  production: false,

  // Use deployed API instead of local backend
  apiUrl: 'https://wear-cast.runasp.net',

  /**
   * Virtual try-on microservice. Dev: same-origin prefix proxied in proxy.conf.json to ngrok.
   * See proxy `/tryon-service` → try-on Swagger host.
   */
  tryOnApiBase: '/tryon-service'
};
