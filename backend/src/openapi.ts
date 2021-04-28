import { OpenAPIV3 } from "openapi-types"
import apiRouteDefs from "./api/api-routes.openapi"

const openapiDoc: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: {
        title: "Ourboard API",
        version: "0.1.0",
    },
    paths: apiRouteDefs.paths,
}

export default openapiDoc
