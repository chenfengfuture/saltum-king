import { handleRequest } from '../../../backend/app.js'

// EdgeOne invokes this handler; no Express server or app.listen() is needed.
export const onRequest = (context) => handleRequest(context)
