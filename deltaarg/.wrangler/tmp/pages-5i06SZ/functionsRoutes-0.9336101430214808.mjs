import { onRequestPost as __api_submit_js_onRequestPost } from "C:\\Users\\16195\\OneDrive\\Desktop\\GameDev\\ARG\\deltaarg\\functions\\api\\submit.js"

export const routes = [
    {
      routePath: "/api/submit",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_submit_js_onRequestPost],
    },
  ]