import { http } from './http.js'
const at = (path, id) => path + '/' + encodeURIComponent(id)
export const lookApi = {
  fetchLooks: () => http.get('/looks'),
  fetchCatalog: () => http.get('/catalog'),
  saveLook: (body) => body.id ? http.put(at('/looks', body.id), body) : http.post('/looks', body),
  deleteLook: (id) => http.delete(at('/looks', id)),
  createProduct: (body) => http.post('/catalog', body),
  updateProduct: (body) => http.put(at('/catalog', body.sku), body),
  deleteProduct: (sku) => http.delete(at('/catalog', sku)),
}
export const imageApi = {
  listJobs: () => http.get('/image-jobs'),
  createJob: (body) => http.post('/image-jobs', body),
  deleteJob: (id) => http.delete(at('/image-jobs', id)),
  listAssets: () => http.get('/image-products'),
}
export const memberApi = {
  list: () => http.get('/members'),
  create: (body) => http.post('/members', body),
  update: (name, body) => http.patch(at('/members', name), body),
}
