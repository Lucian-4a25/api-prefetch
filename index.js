/* eslint-disable max-depth */
import { getLocalStorageParams, setPrefetchRequest, API_CONFIG, ROUTE_API_MAP, API_PREFIX_PATH } from './common'
import { TOKEN, USER_INFO } from '@/constants/storage'


const userInfoStr = localStorage.getItem(USER_INFO) || null
const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null
const tokenStr = localStorage.getItem(TOKEN) || null
const token = tokenStr ? JSON.parse(tokenStr) : null

const QaDomain = 'https://bewildcard-qa.piaodian.net'
const ProdDomain = 'https://api.wildcard.com.cn'

const fetchData = (path, config) => {
  const { method } = config
  const url = new URL(API_PREFIX_PATH + path, process.env.NODE_ENV !== 'production' ? QaDomain : ProdDomain)

  let fetchOptions = {
    method,
    headers: {
      accessToken: token,
      'Content-Type': 'application/json'
    },
  }
  const params = getLocalStorageParams(path, method, config)
  // 如果需要设置的参数，但是参数不存在，说明该请求没有发起过，无法进行预请求
  if (config.cacheLastParameters && !params) {
    console.log('缺乏请求参数，无法发起预请求')
    return
  }
  if (method === 'GET' && params) {
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
  }
  if (method === 'POST' && params) {
    fetchOptions.body = JSON.stringify(params)
  }

  // 将发起的请求挂载到 window 下
  setPrefetchRequest(config.method, path, fetch(url, fetchOptions))
}

const preloadData = () => {
  // 未处于登录态，不发起预请求数据
  if (!userInfo || !token) {
    return
  }

  const currentPath = window.location.pathname
  const apisToPreload = ROUTE_API_MAP[currentPath] || []

  apisToPreload
    .filter(path => API_CONFIG[path] && API_CONFIG[path].prefetch)
    .map(path => fetchData(path, API_CONFIG[path]))

  console.log('all data prefetch request issued')
}

preloadData()
